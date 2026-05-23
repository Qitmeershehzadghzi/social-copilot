import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/db';
import { subscriptions, users, posts, connectedAccounts, commentEvents, autoReplyRules } from '@/db/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import SettingsClient from './client-page';

export default async function SettingsPage() {
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

  const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.userId, user.id)).limit(1);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [postsRes] = await db.select({ count: sql<number>`count(*)` }).from(posts).where(eq(posts.userId, user.id));
  const [accountsRes] = await db.select({ count: sql<number>`count(*)` }).from(connectedAccounts).where(eq(connectedAccounts.userId, user.id));
  
  const userRules = await db.select({ id: autoReplyRules.id }).from(autoReplyRules).where(eq(autoReplyRules.userId, user.id));
  const ruleIds = userRules.map(r => r.id);
  let repliesCount = 0;
  if (ruleIds.length > 0) {
    const [repliesRes] = await db.select({ count: sql<number>`count(*)` })
      .from(commentEvents).where(inArray(commentEvents.ruleId, ruleIds));
    repliesCount = Number(repliesRes.count) || 0;
  }

  const usageStats = {
    posts: Number(postsRes.count) || 0,
    accounts: Number(accountsRes.count) || 0,
    autoReplies: repliesCount
  };

  return <SettingsClient initialSubscription={subscription || null} usageStats={usageStats} />;
}
