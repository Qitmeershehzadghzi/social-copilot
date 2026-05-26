import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { and, eq, inArray } from 'drizzle-orm';

import { db } from '@/db';
import { connectedAccounts, mediaAssets, posts, postTargets, users } from '@/db/schema';
import { requestPostPublish } from '@/lib/inngest/events';
import { PLATFORM_IDS, type PlatformId } from '@/lib/platforms';

type PostStatus = 'draft' | 'scheduled' | 'published' | 'failed';
type TargetStatus = 'pending' | 'published' | 'failed';
type FullPostPayload = {
  content?: string;
  platforms?: PlatformId[];
  mediaAssetIds?: string[];
  scheduledAt?: string | null;
  scheduledEndAt?: string | null;
  status?: PostStatus;
};
type SchedulePatchPayload = {
  scheduledAt?: string | null;
  scheduledEndAt?: string | null;
  status?: PostStatus;
};

const DEFAULT_EVENT_MINUTES = 30;
const VALID_PLATFORMS = new Set<string>([...PLATFORM_IDS, 'threads']);

function parseOptionalDate(value: string | null | undefined, field: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`${field} must be a valid ISO date`);
  return date;
}

function addDefaultEndDate(start: Date | null, end: Date | null) {
  if (!start) return null;
  if (!end) return new Date(start.getTime() + DEFAULT_EVENT_MINUTES * 60_000);
  if (end <= start) throw new Error('scheduledEndAt must be after scheduledAt');
  return end;
}

function normalizePlatforms(platforms: PlatformId[]) {
  const unique = Array.from(new Set(platforms));
  const invalid = unique.filter((platform) => !VALID_PLATFORMS.has(platform));
  if (invalid.length > 0) throw new Error(`Unsupported platforms: ${invalid.join(', ')}`);
  return unique;
}

function normalizeStatus(status: PostStatus | undefined, scheduledDate: Date | null, fallback: PostStatus) {
  if (status === 'draft') return 'draft';
  if (status === 'published' && scheduledDate && scheduledDate > new Date()) return 'scheduled';
  if (status === 'scheduled' && !scheduledDate) return 'draft';
  return status || (scheduledDate ? 'scheduled' : fallback);
}

async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) return { error: new NextResponse('Unauthorized', { status: 401 }) };

  const [user] = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
  if (!user) return { error: new NextResponse('User not found', { status: 404 }) };

  return { user };
}

async function getOwnedPost(postId: string, userId: string) {
  return db.query.posts.findFirst({
    where: and(eq(posts.id, postId), eq(posts.userId, userId)),
    with: {
      targets: true,
      mediaAssets: true,
    },
  });
}

async function validateAccounts(userId: string, platforms: PlatformId[], mediaAssetIds: string[]) {
  const userAccounts = platforms.length > 0
    ? await db.query.connectedAccounts.findMany({ where: eq(connectedAccounts.userId, userId) })
    : [];

  if (platforms.length > 0) {
    const connectedPlatformIds = new Set(userAccounts.map((account) => account.platform));
    const missingPlatforms = platforms.filter((platform) => !connectedPlatformIds.has(platform));
    if (missingPlatforms.length > 0) throw new Error(`Connect these accounts first: ${missingPlatforms.join(', ')}`);

    if (platforms.includes('youtube')) {
      const selectedMedia = mediaAssetIds.length > 0
        ? await db.select().from(mediaAssets).where(and(eq(mediaAssets.userId, userId), inArray(mediaAssets.id, mediaAssetIds)))
        : [];
      const hasVideo = selectedMedia.some((media) => media.type === 'video');
      if (!hasVideo) throw new Error('YouTube requires video media to publish. Please upload a video or deselect YouTube.');
    }
  }

  return userAccounts;
}

async function dispatchPublishEvents(
  postId: string,
  targets: Array<{ id: string; platform: string; status?: TargetStatus }>,
  accounts: Array<{ id: string; platform: string }>,
  scheduledDate: Date | null,
) {
  for (const target of targets) {
    if (target.status && target.status !== 'pending') continue;
    const account = accounts.find((item) => item.platform === target.platform);
    if (!account) continue;

    await requestPostPublish({
      postId,
      postTargetId: target.id,
      platform: target.platform,
      connectedAccountId: account.id,
      scheduledAt: scheduledDate?.toISOString() ?? null,
    });
  }
}

function errorResponse(error: unknown, label: string) {
  const message = error instanceof Error ? error.message : 'Internal Error';
  const status = message.includes('valid') || message.includes('after') || message.includes('Connect') || message.includes('YouTube') || message.includes('Unsupported') ? 400 : 500;
  console.error(label, error);
  return new NextResponse(process.env.NODE_ENV === 'production' && status === 500 ? 'Internal Error' : message, { status });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const current = await getCurrentUser();
    if (current.error) return current.error;

    const { id } = await params;
    const post = await getOwnedPost(id, current.user.id);
    if (!post) return new NextResponse('Post not found', { status: 404 });

    return NextResponse.json(post);
  } catch (error) {
    return errorResponse(error, '[POST_GET]');
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const current = await getCurrentUser();
    if (current.error) return current.error;

    const { id } = await params;
    const existing = await getOwnedPost(id, current.user.id);
    if (!existing) return new NextResponse('Post not found', { status: 404 });

    const body = await req.json() as FullPostPayload;
    if (!body.content?.trim()) return new NextResponse('Content is required', { status: 400 });

    const platforms = normalizePlatforms(body.platforms || []);
    const mediaAssetIds = Array.isArray(body.mediaAssetIds) ? body.mediaAssetIds : [];
    const scheduledDate = parseOptionalDate(body.scheduledAt, 'scheduledAt');
    const scheduledEndDate = addDefaultEndDate(scheduledDate, parseOptionalDate(body.scheduledEndAt, 'scheduledEndAt'));
    const postStatus = normalizeStatus(body.status, scheduledDate, existing.status);
    const userAccounts = await validateAccounts(current.user.id, platforms, mediaAssetIds);

    await db.update(posts).set({
      content: body.content.trim(),
      status: postStatus,
      scheduledAt: scheduledDate,
      scheduledEndAt: scheduledEndDate,
      updatedAt: new Date(),
    }).where(and(eq(posts.id, id), eq(posts.userId, current.user.id)));

    await db.update(mediaAssets)
      .set({ postId: null })
      .where(and(eq(mediaAssets.postId, id), eq(mediaAssets.userId, current.user.id)));

    if (mediaAssetIds.length > 0) {
      await db.update(mediaAssets)
        .set({ postId: id })
        .where(and(eq(mediaAssets.userId, current.user.id), inArray(mediaAssets.id, mediaAssetIds)));
    }

    await db.delete(postTargets).where(eq(postTargets.postId, id));
    const insertedTargets = platforms.length > 0
      ? await db.insert(postTargets).values(platforms.map((platform) => ({
        postId: id,
        platform,
        status: 'pending' as const,
      }))).returning()
      : [];

    if ((postStatus === 'scheduled' || postStatus === 'published') && insertedTargets.length > 0) {
      await dispatchPublishEvents(id, insertedTargets, userAccounts, scheduledDate);
    }

    const updated = await getOwnedPost(id, current.user.id);
    return NextResponse.json(updated);
  } catch (error) {
    return errorResponse(error, '[POST_UPDATE]');
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const current = await getCurrentUser();
    if (current.error) return current.error;

    const { id } = await params;
    const existing = await getOwnedPost(id, current.user.id);
    if (!existing) return new NextResponse('Post not found', { status: 404 });
    if (existing.status === 'published') return new NextResponse('Published posts cannot be rescheduled', { status: 400 });

    const body = await req.json() as SchedulePatchPayload;
    const scheduledDate = parseOptionalDate(body.scheduledAt, 'scheduledAt');
    const scheduledEndDate = addDefaultEndDate(scheduledDate, parseOptionalDate(body.scheduledEndAt, 'scheduledEndAt'));
    const postStatus = normalizeStatus(body.status, scheduledDate, existing.status === 'draft' ? 'draft' : 'scheduled');

    await db.update(posts).set({
      status: postStatus,
      scheduledAt: scheduledDate,
      scheduledEndAt: scheduledEndDate,
      updatedAt: new Date(),
    }).where(and(eq(posts.id, id), eq(posts.userId, current.user.id)));

    if (postStatus === 'scheduled' && existing.targets.length > 0) {
      const accounts = await db.query.connectedAccounts.findMany({ where: eq(connectedAccounts.userId, current.user.id) });
      await dispatchPublishEvents(id, existing.targets, accounts, scheduledDate);
    }

    const updated = await getOwnedPost(id, current.user.id);
    return NextResponse.json(updated);
  } catch (error) {
    return errorResponse(error, '[POST_RESCHEDULE]');
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const current = await getCurrentUser();
    if (current.error) return current.error;

    const { id } = await params;
    const existing = await getOwnedPost(id, current.user.id);
    if (!existing) return new NextResponse('Post not found', { status: 404 });

    await db.delete(posts).where(and(eq(posts.id, id), eq(posts.userId, current.user.id)));
    return NextResponse.json({ id });
  } catch (error) {
    return errorResponse(error, '[POST_DELETE]');
  }
}
