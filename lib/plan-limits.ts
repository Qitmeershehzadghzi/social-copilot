import { db } from '@/db';
import { subscriptions, users, posts, connectedAccounts, autoReplyRules } from '@/db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';

const PLAN_LIMITS = {
  free: {
    create_post: 10,
    connect_account: 2,
    auto_reply: 1,
  },
  pro: {
    create_post: 100,
    connect_account: 10,
    auto_reply: 10,
  },
  agency: {
    create_post: 1000,
    connect_account: 50,
    auto_reply: 100,
  }
};

export type ActionType = 'create_post' | 'connect_account' | 'auto_reply';

export async function checkPlanLimits(clerkUserId: string, actionType: ActionType): Promise<{ allowed: boolean; reason?: string }> {
  const [user] = await db.select().from(users).where(eq(users.clerkId, clerkUserId)).limit(1);
  if (!user) return { allowed: false, reason: 'User not found' };

  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, user.id)).limit(1);
  const plan = sub?.plan || 'free';
  const limits = PLAN_LIMITS[plan];

  if (actionType === 'create_post') {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [result] = await db.select({ count: sql<number>`cast(count(*) as integer)` })
      .from(posts)
      .where(and(eq(posts.userId, user.id), gte(posts.createdAt, startOfMonth)));
    
    if (result.count >= limits.create_post) {
      return { allowed: false, reason: `Plan limit reached: ${limits.create_post} posts per month on ${plan} plan.` };
    }
  } else if (actionType === 'connect_account') {
    const [result] = await db.select({ count: sql<number>`cast(count(*) as integer)` })
      .from(connectedAccounts)
      .where(eq(connectedAccounts.userId, user.id));
    
    if (result.count >= limits.connect_account) {
      return { allowed: false, reason: `Plan limit reached: ${limits.connect_account} accounts on ${plan} plan.` };
    }
  } else if (actionType === 'auto_reply') {
    const [result] = await db.select({ count: sql<number>`cast(count(*) as integer)` })
      .from(autoReplyRules)
      .where(eq(autoReplyRules.userId, user.id));
    
    if (result.count >= limits.auto_reply) {
      return { allowed: false, reason: `Plan limit reached: ${limits.auto_reply} auto-reply rules on ${plan} plan.` };
    }
  }

  return { allowed: true };
}
