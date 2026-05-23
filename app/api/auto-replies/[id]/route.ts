import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { autoReplyRules, connectedAccounts, users } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

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

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const [user] = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (!user) return new NextResponse('User not found', { status: 404 });

    const { id } = await params;
    const body = await req.json();
    const updateValues: Partial<typeof autoReplyRules.$inferInsert> = {
      updatedAt: new Date(),
    };

    if ('name' in body) updateValues.name = body.name;
    if ('triggerType' in body) updateValues.triggerType = body.triggerType;
    if ('keywords' in body) updateValues.keywords = body.keywords || [];
    if ('promptTemplate' in body) updateValues.promptTemplate = body.promptTemplate;
    if ('isActive' in body) updateValues.isActive = body.isActive;

    if ('connectedAccountIds' in body) {
      const selectedAccountIds = uniqueStrings(body.connectedAccountIds);
      const selectedAccounts = await getValidatedAccounts(user.id, selectedAccountIds);
      updateValues.connectedAccountIds = selectedAccountIds;
      updateValues.platforms = [...new Set(selectedAccounts.map((account) => account.platform))];
    }

    const [updated] = await db.update(autoReplyRules).set(updateValues).where(and(eq(autoReplyRules.id, id), eq(autoReplyRules.userId, user.id))).returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[AUTO_REPLIES_PUT]', error);
    if (error instanceof ValidationError) {
      return new NextResponse(error.message, { status: 400 });
    }
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
    
    await db.delete(autoReplyRules).where(and(eq(autoReplyRules.id, id), eq(autoReplyRules.userId, user.id)));

    return new NextResponse('Deleted', { status: 200 });
  } catch (error) {
    console.error('[AUTO_REPLIES_DELETE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
