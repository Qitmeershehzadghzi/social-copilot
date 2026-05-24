import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { connectedAccounts, mediaAssets, posts, postTargets, users } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { requestPostPublish } from '@/lib/inngest/events';
import type { PlatformId } from '@/lib/platforms';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const [user] = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (!user) return new NextResponse('User not found', { status: 404 });

    const { id } = await params;
    const { content, platforms = [], mediaAssetIds = [], scheduledAt, status } = await req.json() as {
      content?: string;
      platforms?: PlatformId[];
      mediaAssetIds?: string[];
      scheduledAt?: string | null;
      status?: 'draft' | 'scheduled' | 'published';
    };

    console.log('[POST_UPDATE] Updating post:', id, { platforms, status, scheduledAt });

    if (!content?.trim()) {
      return new NextResponse('Content is required', { status: 400 });
    }
    
    // Check ownership
    const [existing] = await db.select().from(posts).where(and(eq(posts.id, id), eq(posts.userId, user.id))).limit(1);
    if (!existing) return new NextResponse('Post not found', { status: 404 });

    const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;
    const postStatus = status || existing.status;

    console.log('[POST_UPDATE] New post status:', postStatus);

    const userAccounts = platforms.length > 0
      ? await db.query.connectedAccounts.findMany({
        where: eq(connectedAccounts.userId, user.id)
      })
      : [];

    console.log('[POST_UPDATE] User has', userAccounts.length, 'connected accounts');

    if (platforms.length > 0) {
      const connectedPlatformIds = new Set(userAccounts.map((account) => account.platform));
      const missingPlatforms = platforms.filter((platform) => !connectedPlatformIds.has(platform));
      if (missingPlatforms.length > 0) {
        return new NextResponse(`Connect these accounts first: ${missingPlatforms.join(', ')}`, { status: 400 });
      }

      if (platforms.includes('youtube') && mediaAssetIds.length === 0) {
        console.log('[POST_UPDATE] YouTube requires a video upload');
        return new NextResponse('YouTube requires video media to publish. Please upload a video or deselect YouTube.', { status: 400 });
      }
    }

    await db.update(posts).set({
      content,
      status: postStatus,
      scheduledAt: scheduledDate,
      updatedAt: new Date(),
    }).where(eq(posts.id, id));

    console.log('[POST_UPDATE] Post updated with status:', postStatus);

    await db.update(mediaAssets)
      .set({ postId: null })
      .where(and(eq(mediaAssets.postId, id), eq(mediaAssets.userId, user.id)));

    if (mediaAssetIds.length > 0) {
      await db.update(mediaAssets)
        .set({ postId: id })
        .where(and(
          eq(mediaAssets.userId, user.id),
          inArray(mediaAssets.id, mediaAssetIds)
        ));
    }

    // Clear old targets
    await db.delete(postTargets).where(eq(postTargets.postId, id));
    
    // Add new targets
    if (platforms.length > 0) {
      const targetsToInsert = platforms.map((platform) => ({
        postId: id,
        platform: platform,
        status: 'pending' as const
      }));
      const insertedTargets = await db.insert(postTargets).values(targetsToInsert).returning();

      console.log('[POST_UPDATE] Created', insertedTargets.length, 'post targets');

      // Trigger publish if status is 'published' (either immediately or scheduled)
      if (postStatus === 'published') {
        console.log('[POST_UPDATE] Status is published, dispatching Inngest events...');
        for (const target of insertedTargets) {
          const account = userAccounts.find((item) => item.platform === target.platform);
          if (account) {
            console.log('[POST_UPDATE] Sending event for platform:', target.platform, 'account:', account.id);
            await requestPostPublish({
              postId: id,
              postTargetId: target.id,
              platform: target.platform,
              connectedAccountId: account.id,
              scheduledAt: scheduledDate?.toISOString() ?? null,
            });
            console.log('[POST_UPDATE] Event sent successfully');
          }
        }
        
        // If there's a scheduled date, keep status as 'scheduled' for tracking
        // Otherwise keep as 'published' for immediate posts
        if (scheduledDate) {
          await db.update(posts).set({ status: 'scheduled' }).where(eq(posts.id, id));
          console.log('[POST_UPDATE] Updated post status to scheduled');
        }
      }
    }

    return new NextResponse('Updated', { status: 200 });
  } catch (error) {
    console.error('[POST_UPDATE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const [user] = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (!user) return new NextResponse('User not found', { status: 404 });

    const { id } = await params;
    
    await db.delete(posts).where(and(eq(posts.id, id), eq(posts.userId, user.id)));

    return new NextResponse('Deleted', { status: 200 });
  } catch (error) {
    console.error('[POST_DELETE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
