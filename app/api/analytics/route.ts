import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { posts, postTargets, commentEvents, users, autoReplyRules } from '@/db/schema';
import { eq, and, gte, lte, inArray, sql } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [user] = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const platformsParam = searchParams.get('platforms'); // comma separated

    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    const startDate = startDateParam ? new Date(startDateParam) : new Date();
    if (!startDateParam) {
      startDate.setDate(endDate.getDate() - 30);
    }

    const platforms = platformsParam ? platformsParam.split(',') : [];

    // Base conditions for post targets
    let targetConditions = [
      eq(posts.userId, user.id),
      gte(postTargets.createdAt, startDate),
      lte(postTargets.createdAt, endDate),
    ];

    if (platforms.length > 0) {
      // @ts-ignore
      targetConditions.push(inArray(postTargets.platform, platforms));
    }

    // 1. Posts Per Day & Status Breakdown & Platform Breakdown
    const targetsData = await db.select({
      date: sql<string>`DATE(${postTargets.createdAt})`,
      platform: postTargets.platform,
      status: postTargets.status,
      count: sql<number>`count(*)`
    })
    .from(postTargets)
    .leftJoin(posts, eq(postTargets.postId, posts.id))
    .where(and(...targetConditions))
    .groupBy(sql`DATE(${postTargets.createdAt})`, postTargets.platform, postTargets.status);

    const postsPerDayMap = new Map<string, number>();
    const platformBreakdownMap = new Map<string, number>();
    const statusBreakdown = { published: 0, failed: 0, scheduled: 0, pending: 0 };

    targetsData.forEach(row => {
      const dateStr = new Date(row.date).toISOString().split('T')[0];
      const count = Number(row.count);

      // Posts per day (published only or all? Let's say all attempted)
      postsPerDayMap.set(dateStr, (postsPerDayMap.get(dateStr) || 0) + count);

      // Platform breakdown
      platformBreakdownMap.set(row.platform, (platformBreakdownMap.get(row.platform) || 0) + count);

      // Status breakdown
      if (row.status === 'published') statusBreakdown.published += count;
      if (row.status === 'failed') statusBreakdown.failed += count;
      if (row.status === 'pending') statusBreakdown.pending += count;
    });

    // Add scheduled posts from `posts` table (since they might not have targets yet or targets are pending)
    const scheduledPostsData = await db.select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(and(eq(posts.userId, user.id), eq(posts.status, 'scheduled'), gte(posts.scheduledAt, startDate), lte(posts.scheduledAt, endDate)));
    
    statusBreakdown.scheduled = Number(scheduledPostsData[0]?.count) || 0;

    const postsPerDay = Array.from(postsPerDayMap.entries()).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));
    const platformBreakdown = Array.from(platformBreakdownMap.entries()).map(([platform, count]) => ({ platform, count }));

    // 2. Replies Per Day
    const userRules = await db.select({ id: autoReplyRules.id }).from(autoReplyRules).where(eq(autoReplyRules.userId, user.id));
    const ruleIds = userRules.map(r => r.id);

    let repliesPerDayMap = new Map<string, number>();
    if (ruleIds.length > 0) {
      let replyConditions = [
        inArray(commentEvents.ruleId, ruleIds),
        gte(commentEvents.createdAt, startDate),
        lte(commentEvents.createdAt, endDate),
      ];

      if (platforms.length > 0) {
        // @ts-ignore
        replyConditions.push(inArray(commentEvents.platform, platforms));
      }

      const repliesData = await db.select({
        date: sql<string>`DATE(${commentEvents.createdAt})`,
        count: sql<number>`count(*)`
      })
      .from(commentEvents)
      .where(and(...replyConditions))
      .groupBy(sql`DATE(${commentEvents.createdAt})`);

      repliesData.forEach(row => {
        const dateStr = new Date(row.date).toISOString().split('T')[0];
        repliesPerDayMap.set(dateStr, (repliesPerDayMap.get(dateStr) || 0) + Number(row.count));
      });
    }

    const repliesPerDay = Array.from(repliesPerDayMap.entries()).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      postsPerDay,
      platformBreakdown,
      repliesPerDay,
      statusBreakdown
    });

  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
