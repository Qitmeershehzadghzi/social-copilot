import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { posts, postTargets, users, connectedAccounts, mediaAssets } from '@/db/schema';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { requestPostPublish } from '@/lib/inngest/events';
import { checkPlanLimits } from '@/lib/plan-limits';
import type { PlatformId } from '@/lib/platforms';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const [user] = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (!user) return new NextResponse('User not found', { status: 404 });

    const limitCheck = await checkPlanLimits(userId, 'create_post');
    if (!limitCheck.allowed) {
      return new NextResponse(limitCheck.reason || 'Plan limit reached', { status: 403 });
    }

    const { content, platforms = [], mediaAssetIds = [], scheduledAt, status } = await req.json() as {
      content?: string;
      platforms?: PlatformId[];
      mediaAssetIds?: string[];
      scheduledAt?: string | null;
      status?: 'draft' | 'scheduled' | 'published';
    };

    console.log('[POST_CREATE] Creating post:', { platforms, hasContent: !!content, scheduledAt, status });

    if (!content?.trim()) {
      return new NextResponse('Content is required', { status: 400 });
    }

    const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;
    const postStatus = status || (scheduledDate ? 'scheduled' : 'draft');

    console.log('[POST_CREATE] Post status will be:', postStatus, 'scheduled date:', scheduledDate);

    const userAccounts = platforms.length > 0
      ? await db.query.connectedAccounts.findMany({
          where: eq(connectedAccounts.userId, user.id)
        })
      : [];

    console.log('[POST_CREATE] User has', userAccounts.length, 'connected accounts');

    if (platforms.length > 0) {
      const connectedPlatformIds = new Set(userAccounts.map((account) => account.platform));
      const missingPlatforms = platforms.filter((platform) => !connectedPlatformIds.has(platform));
      if (missingPlatforms.length > 0) {
        console.log('[POST_CREATE] Missing platforms:', missingPlatforms);
        return new NextResponse(`Connect these accounts first: ${missingPlatforms.join(', ')}`, { status: 400 });
      }

      if (platforms.includes('youtube') && mediaAssetIds.length === 0) {
        console.log('[POST_CREATE] YouTube requires a video upload');
        return new NextResponse('YouTube requires video media to publish. Please upload a video or deselect YouTube.', { status: 400 });
      }
    }

    const [post] = await db.insert(posts).values({
      userId: user.id,
      content,
      status: postStatus,
      scheduledAt: scheduledDate,
    }).returning();

    console.log('[POST_CREATE] Post created:', post.id, 'with status:', post.status);

    if (mediaAssetIds.length > 0) {
      await db.update(mediaAssets)
        .set({ postId: post.id })
        .where(and(
          eq(mediaAssets.userId, user.id),
          inArray(mediaAssets.id, mediaAssetIds)
        ));
      console.log('[POST_CREATE] Attached', mediaAssetIds.length, 'media assets');
    }

    if (platforms.length > 0) {
      const targetsToInsert = platforms.map((platform) => ({
        postId: post.id,
        platform: platform,
        status: 'pending' as const
      }));
      
      const insertedTargets = await db.insert(postTargets).values(targetsToInsert).returning();
      console.log('[POST_CREATE] Created', insertedTargets.length, 'post targets');

      // Publish immediately if status is 'published' (either scheduled later or now)
      if (postStatus === 'published') {
        console.log('[POST_CREATE] Status is published, dispatching Inngest events...');
        for (const target of insertedTargets) {
          const account = userAccounts.find(a => a.platform === target.platform);
          if (account) {
            console.log('[POST_CREATE] Sending event for platform:', target.platform, 'account:', account.id);
            await requestPostPublish({
              postId: post.id,
              postTargetId: target.id,
              platform: target.platform,
              connectedAccountId: account.id,
              scheduledAt: scheduledDate?.toISOString() ?? null,
            });
            console.log('[POST_CREATE] Event sent successfully');
          }
        }
        
        // If there's a scheduled date, update status to 'scheduled' for tracking
        // Otherwise keep as 'published' since it will publish immediately
        if (scheduledDate) {
          await db.update(posts).set({ status: 'scheduled' }).where(eq(posts.id, post.id));
          console.log('[POST_CREATE] Updated post status to scheduled');
        }
      }
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error('[POST_CREATE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const [user] = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (!user) return new NextResponse('User not found', { status: 404 });

    const allPosts = await db.query.posts.findMany({
      where: eq(posts.userId, user.id),
      orderBy: [desc(posts.createdAt)],
      with: {
        targets: true,
        mediaAssets: true
      }
    });

    return NextResponse.json(allPosts);
  } catch (error) {
    console.error('[POSTS_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
