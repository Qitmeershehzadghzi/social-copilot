import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/db';
import { posts, postTargets, connectedAccounts, autoReplyRules, commentEvents, users } from '@/db/schema';
import { eq, and, gte, desc, asc, sql, inArray } from 'drizzle-orm';
import { formatDistanceToNow } from 'date-fns';
import DashboardClient from './client-page';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  let [user] = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
  if (!user) {
    const clerkUser = await currentUser();
    if (!clerkUser) redirect('/sign-in');
    
    const [newUser] = await db.insert(users).values({
      clerkId: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress || '',
      name: clerkUser.firstName ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim() : null,
    }).onConflictDoUpdate({
      target: users.clerkId,
      set: { email: clerkUser.emailAddresses[0]?.emailAddress || '' }
    }).returning();
    user = newUser;
  }

  // Stats
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [scheduledRes] = await db.select({ count: sql<number>`count(*)` })
    .from(posts).where(and(eq(posts.userId, user.id), eq(posts.status, 'scheduled')));
    
  const userRules = await db.select({ id: autoReplyRules.id }).from(autoReplyRules).where(eq(autoReplyRules.userId, user.id));
  const ruleIds = userRules.map(r => r.id);
  
  let autoRepliesCount = 0;
  if (ruleIds.length > 0) {
    const [repliesRes] = await db.select({ count: sql<number>`count(*)` })
      .from(commentEvents).where(and(inArray(commentEvents.ruleId, ruleIds), eq(commentEvents.status, 'published')));
    autoRepliesCount = Number(repliesRes.count) || 0;
  }

  const [accountsRes] = await db.select({ count: sql<number>`count(*)` })
    .from(connectedAccounts).where(eq(connectedAccounts.userId, user.id));

  const [publishedThisMonthRes] = await db.select({ count: sql<number>`count(*)` })
    .from(posts).where(and(
      eq(posts.userId, user.id), 
      eq(posts.status, 'published'),
      gte(posts.publishedAt, startOfMonth)
    ));

  const stats = {
    scheduledPosts: Number(scheduledRes.count) || 0,
    autoReplies: autoRepliesCount,
    connectedAccounts: Number(accountsRes.count) || 0,
    postsThisMonth: Number(publishedThisMonthRes.count) || 0,
  };

  // Upcoming Posts
  const upcomingPostsData = await db.select({
    id: posts.id,
    userId: posts.userId,
    content: posts.content,
    status: posts.status,
    scheduledAt: posts.scheduledAt,
    targetPlatform: postTargets.platform,
  })
    .from(posts)
    .leftJoin(postTargets, eq(postTargets.postId, posts.id))
    .where(and(eq(posts.userId, user.id), eq(posts.status, 'scheduled'), gte(posts.scheduledAt, new Date())))
    .orderBy(asc(posts.scheduledAt))
    .limit(5);

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      twitter: 'bg-[#1DA1F2]',
      linkedin: 'bg-[#0077B5]',
      instagram: 'bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCAF45]',
      facebook: 'bg-[#1877F2]',
      youtube: 'bg-[#FF0000]',
      tiktok: 'bg-[#000000]',
      pinterest: 'bg-[#E60023]',
    };
    return colors[platform.toLowerCase()] || 'bg-gray-500';
  };

  const upcomingPosts = Array.from(
    upcomingPostsData.reduce((map, row) => {
      const key = row.id;
      if (!map.has(key)) {
        map.set(key, {
          time: row.scheduledAt ? formatDistanceToNow(row.scheduledAt, { addSuffix: true }) : 'Soon',
          platform: row.targetPlatform || 'Multiple',
          content: row.content.length > 50 ? row.content.substring(0, 50) + '...' : row.content,
          color: getPlatformColor(row.targetPlatform || 'Multiple'),
        });
      }
      return map;
    }, new Map()).values()
  );

  // Recent Activity (Union of recent published posts and auto-replies)
  const recentPostsData = await db.select({
    id: posts.id,
    content: posts.content,
    status: posts.status,
    updatedAt: posts.updatedAt,
    targetPlatform: postTargets.platform,
  })
    .from(posts)
    .leftJoin(postTargets, eq(postTargets.postId, posts.id))
    .where(and(eq(posts.userId, user.id), inArray(posts.status, ['published', 'failed'])))
    .orderBy(desc(posts.updatedAt))
    .limit(10);

  const recentPosts = Array.from(
    recentPostsData.reduce((map, row) => {
      if (!map.has(row.id)) {
        map.set(row.id, {
          id: row.id,
          content: row.content,
          status: row.status,
          updatedAt: row.updatedAt,
          platform: row.targetPlatform || 'Unknown',
        });
      }
      return map;
    }, new Map()).values()
  );

  let recentEvents: any[] = [];
  if (ruleIds.length > 0) {
    recentEvents = await db.query.commentEvents.findMany({
      where: inArray(commentEvents.ruleId, ruleIds),
      orderBy: [desc(commentEvents.createdAt)],
      limit: 10
    });
  }

  const combinedActivity = [
    ...recentPosts.map(p => ({
      action: p.status === 'published' ? 'Post published' : 'Post failed',
      platform: p.platform,
      timeObj: p.updatedAt,
      time: formatDistanceToNow(p.updatedAt, { addSuffix: true }),
      status: p.status
    })),
    ...recentEvents.map(e => ({
      action: e.status === 'published' ? 'Auto-reply sent' : 'Auto-reply failed',
      platform: e.platform,
      timeObj: e.createdAt,
      time: formatDistanceToNow(e.createdAt, { addSuffix: true }),
      status: e.status
    }))
  ].sort((a, b) => b.timeObj.getTime() - a.timeObj.getTime()).slice(0, 10);

  // Performance Overview (30-day trend)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const performanceRaw = await db.select({
    date: sql<string>`DATE(${postTargets.createdAt})`,
    status: postTargets.status,
    count: sql<number>`count(*)`
  })
  .from(postTargets)
  .leftJoin(posts, eq(postTargets.postId, posts.id))
  .where(and(
    eq(posts.userId, user.id),
    gte(postTargets.createdAt, thirtyDaysAgo)
  ))
  .groupBy(sql`DATE(${postTargets.createdAt})`, postTargets.status);

  const performanceMap = new Map<string, { date: string, published: number, failed: number }>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    performanceMap.set(dateStr, { date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), published: 0, failed: 0 });
  }

  performanceRaw.forEach(row => {
    const dateStr = new Date(row.date).toISOString().split('T')[0];
    const existing = performanceMap.get(dateStr);
    if (existing) {
      if (row.status === 'published') existing.published += Number(row.count);
      if (row.status === 'failed') existing.failed += Number(row.count);
    }
  });

  const performanceData = Array.from(performanceMap.values());

  return <DashboardClient stats={stats} upcomingPosts={upcomingPosts} recentActivity={combinedActivity} performanceData={performanceData} />;
}