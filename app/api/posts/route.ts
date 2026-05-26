import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { and, desc, eq, gte, inArray, isNotNull, isNull, lte, or } from 'drizzle-orm';

import { db } from '@/db';
import { connectedAccounts, mediaAssets, posts, postTargets, users } from '@/db/schema';
import { requestPostPublish } from '@/lib/inngest/events';
import { checkPlanLimits } from '@/lib/plan-limits';
import { PLATFORM_IDS, type PlatformId } from '@/lib/platforms';

type PostStatus = 'draft' | 'scheduled' | 'published' | 'failed';
type PostPayload = {
  content?: string;
  platforms?: PlatformId[];
  mediaAssetIds?: string[];
  scheduledAt?: string | null;
  scheduledEndAt?: string | null;
  status?: PostStatus;
};

const DEFAULT_EVENT_MINUTES = 30;
const VALID_PLATFORMS = new Set<string>([...PLATFORM_IDS, 'threads']);

function parseOptionalDate(value: string | null | undefined, field: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${field} must be a valid ISO date`);
  }
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

function normalizeStatus(status: PostStatus | undefined, scheduledDate: Date | null) {
  if (status === 'draft') return 'draft';
  if (status === 'published' && scheduledDate && scheduledDate > new Date()) return 'scheduled';
  if (status === 'scheduled' && !scheduledDate) return 'draft';
  return status || (scheduledDate ? 'scheduled' : 'draft');
}

async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) return { error: new NextResponse('Unauthorized', { status: 401 }) };

  const [user] = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
  if (!user) return { error: new NextResponse('User not found', { status: 404 }) };

  return { clerkUserId: userId, user };
}

async function validateAccounts(userId: string, platforms: PlatformId[], mediaAssetIds: string[]) {
  const userAccounts = platforms.length > 0
    ? await db.query.connectedAccounts.findMany({ where: eq(connectedAccounts.userId, userId) })
    : [];

  if (platforms.length > 0) {
    const connectedPlatformIds = new Set(userAccounts.map((account) => account.platform));
    const missingPlatforms = platforms.filter((platform) => !connectedPlatformIds.has(platform));
    if (missingPlatforms.length > 0) {
      throw new Error(`Connect these accounts first: ${missingPlatforms.join(', ')}`);
    }

    if (platforms.includes('youtube')) {
      const selectedMedia = mediaAssetIds.length > 0
        ? await db.select().from(mediaAssets).where(and(eq(mediaAssets.userId, userId), inArray(mediaAssets.id, mediaAssetIds)))
        : [];

      const hasVideo = selectedMedia.some((media) => media.type === 'video');
      if (!hasVideo) {
        throw new Error('YouTube requires video media to publish. Please upload a video or deselect YouTube.');
      }
    }
  }

  return userAccounts;
}

async function dispatchPublishEvents(
  postId: string,
  targets: Array<{ id: string; platform: string }>,
  accounts: Array<{ id: string; platform: string }>,
  scheduledDate: Date | null,
) {
  for (const target of targets) {
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

async function getPostForResponse(postId: string, userId: string) {
  return db.query.posts.findFirst({
    where: and(eq(posts.id, postId), eq(posts.userId, userId)),
    with: {
      targets: true,
      mediaAssets: true,
    },
  });
}

export async function POST(req: Request) {
  try {
    const current = await getCurrentUser();
    if (current.error) return current.error;

    const limitCheck = await checkPlanLimits(current.clerkUserId, 'create_post');
    if (!limitCheck.allowed) {
      return new NextResponse(limitCheck.reason || 'Plan limit reached', { status: 403 });
    }

    const body = await req.json() as PostPayload;
    if (!body.content?.trim()) return new NextResponse('Content is required', { status: 400 });

    const platforms = normalizePlatforms(body.platforms || []);
    const mediaAssetIds = Array.isArray(body.mediaAssetIds) ? body.mediaAssetIds : [];
    const scheduledDate = parseOptionalDate(body.scheduledAt, 'scheduledAt');
    const scheduledEndDate = addDefaultEndDate(scheduledDate, parseOptionalDate(body.scheduledEndAt, 'scheduledEndAt'));
    const postStatus = normalizeStatus(body.status, scheduledDate);
    const userAccounts = await validateAccounts(current.user.id, platforms, mediaAssetIds);

    const [post] = await db.insert(posts).values({
      userId: current.user.id,
      content: body.content.trim(),
      status: postStatus,
      scheduledAt: scheduledDate,
      scheduledEndAt: scheduledEndDate,
    }).returning();

    if (mediaAssetIds.length > 0) {
      await db.update(mediaAssets)
        .set({ postId: post.id })
        .where(and(eq(mediaAssets.userId, current.user.id), inArray(mediaAssets.id, mediaAssetIds)));
    }

    const insertedTargets = platforms.length > 0
      ? await db.insert(postTargets).values(platforms.map((platform) => ({
        postId: post.id,
        platform,
        status: 'pending' as const,
      }))).returning()
      : [];

    if ((postStatus === 'scheduled' || postStatus === 'published') && insertedTargets.length > 0) {
      await dispatchPublishEvents(post.id, insertedTargets, userAccounts, scheduledDate);
    }

    const created = await getPostForResponse(post.id, current.user.id);
    return NextResponse.json(created);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Error';
    const status = message.includes('required') || message.includes('valid') || message.includes('Connect') || message.includes('YouTube') || message.includes('Unsupported') ? 400 : 500;
    console.error('[POST_CREATE]', error);
    return new NextResponse(process.env.NODE_ENV === 'production' && status === 500 ? 'Internal Error' : message, { status });
  }
}

export async function GET(request: Request) {
  try {
    const current = await getCurrentUser();
    if (current.error) return current.error;

    const { searchParams } = new URL(request.url);
    const startDate = parseOptionalDate(searchParams.get('start'), 'start');
    const endDate = parseOptionalDate(searchParams.get('end'), 'end');

    const rangeFilter = startDate && endDate
      ? or(
        and(
          isNotNull(posts.scheduledAt),
          lte(posts.scheduledAt, endDate),
          or(isNull(posts.scheduledEndAt), gte(posts.scheduledEndAt, startDate)),
        ),
        and(isNotNull(posts.publishedAt), lte(posts.publishedAt, endDate), gte(posts.publishedAt, startDate)),
      )
      : undefined;

    const allPosts = await db.query.posts.findMany({
      where: rangeFilter
        ? and(eq(posts.userId, current.user.id), rangeFilter)
        : eq(posts.userId, current.user.id),
      orderBy: [desc(posts.scheduledAt), desc(posts.createdAt)],
      with: {
        targets: true,
        mediaAssets: true,
      },
    });

    return NextResponse.json(allPosts);
  } catch (error) {
    console.error('[POSTS_GET]', error);
    const message = error instanceof Error ? error.message : 'Internal Error';
    return new NextResponse(message, { status: message.includes('valid') ? 400 : 500 });
  }
}
