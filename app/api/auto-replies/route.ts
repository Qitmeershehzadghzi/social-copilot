import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { autoReplyRules, users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { checkPlanLimits } from '@/lib/plan-limits';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const [user] = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (!user) return new NextResponse('User not found', { status: 404 });

    const rules = await db.select().from(autoReplyRules)
      .where(eq(autoReplyRules.userId, user.id))
      .orderBy(desc(autoReplyRules.createdAt));

    return NextResponse.json(rules);
  } catch (error) {
    console.error('[AUTO_REPLIES_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const [user] = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (!user) return new NextResponse('User not found', { status: 404 });

    const limitCheck = await checkPlanLimits(userId, 'auto_reply');
    if (!limitCheck.allowed) {
      return new NextResponse(limitCheck.reason || 'Plan limit reached', { status: 403 });
    }

    const { name, triggerType, keywords, promptTemplate, platforms, isActive } = await req.json();

    const [rule] = await db.insert(autoReplyRules).values({
      userId: user.id,
      name,
      triggerType,
      keywords: keywords || [],
      promptTemplate,
      platforms,
      isActive: isActive !== undefined ? isActive : true,
    }).returning();

    return NextResponse.json(rule);
  } catch (error) {
    console.error('[AUTO_REPLIES_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
