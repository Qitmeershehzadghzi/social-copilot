import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { commentEvents, autoReplyRules, users } from '@/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const [user] = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (!user) return new NextResponse('User not found', { status: 404 });

    // First get all rule IDs for the user
    const rules = await db.select({ id: autoReplyRules.id }).from(autoReplyRules).where(eq(autoReplyRules.userId, user.id));
    const ruleIds = rules.map(r => r.id);

    if (ruleIds.length === 0) {
      return NextResponse.json([]);
    }

    const events = await db.select().from(commentEvents)
      .where(inArray(commentEvents.ruleId, ruleIds))
      .orderBy(desc(commentEvents.createdAt))
      .limit(50);

    return NextResponse.json(events);
  } catch (error) {
    console.error('[AUTO_REPLIES_EVENTS_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
