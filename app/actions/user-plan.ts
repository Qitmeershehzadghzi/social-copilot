'use server';

import { db } from '@/db';
import { subscriptions, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

export async function getUserPlan() {
  try {
    const { userId } = await auth();
    if (!userId) return 'free';

    const [user] = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (!user) return 'free';

    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, user.id)).limit(1);
    return sub?.plan || 'free';
  } catch (error) {
    console.error('Error fetching user plan:', error);
    return 'free';
  }
}
