import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { autoReplyRules, connectedAccounts, users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { checkPlanLimits } from '@/lib/plan-limits';

const AUTO_REPLY_SUPPORTED_PLATFORMS = new Set(['twitter', 'youtube']);

class ValidationError extends Error {}

function uniqueStrings(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0))];
}

async function getValidatedAccounts(userDbId: string, accountIds: string[]) {
  if (accountIds.length === 0) {
    throw new ValidationError('Select at least one connected account');
  }

  const userAccounts = await db
    .select({
      id: connectedAccounts.id,
      platform: connectedAccounts.platform,
    })
    .from(connectedAccounts)
    .where(eq(connectedAccounts.userId, userDbId));

  const byId = new Map(userAccounts.map((account) => [account.id, account]));
  const selectedAccounts = accountIds.map((id) => byId.get(id));

  if (selectedAccounts.some((account) => !account)) {
    throw new ValidationError('One or more selected accounts do not belong to this user');
  }

  if (selectedAccounts.some((account) => account && !AUTO_REPLY_SUPPORTED_PLATFORMS.has(account.platform))) {
    throw new ValidationError('One or more selected accounts are unavailable for auto replies');
  }

  return selectedAccounts.filter((account): account is NonNullable<typeof account> => Boolean(account));
}

export async function GET() {
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

    const { name, triggerType, keywords, promptTemplate, connectedAccountIds, isActive } = await req.json();
    const selectedAccountIds = uniqueStrings(connectedAccountIds);
    const selectedAccounts = await getValidatedAccounts(user.id, selectedAccountIds);
    const platforms = [...new Set(selectedAccounts.map((account) => account.platform))];

    const [rule] = await db.insert(autoReplyRules).values({
      userId: user.id,
      name,
      triggerType,
      keywords: keywords || [],
      promptTemplate,
      connectedAccountIds: selectedAccountIds,
      platforms,
      isActive: isActive !== undefined ? isActive : true,
    }).returning();

    return NextResponse.json(rule);
  } catch (error) {
    console.error('[AUTO_REPLIES_POST]', error);
    if (error instanceof ValidationError) {
      return new NextResponse(error.message, { status: 400 });
    }
    return new NextResponse('Internal Error', { status: 500 });
  }
}
