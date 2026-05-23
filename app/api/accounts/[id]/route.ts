import { NextResponse } from 'next/server';
import { db } from '@/db';
import { connectedAccounts, users } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const [user] = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    const { id } = await params;

    if (!id) {
      return new NextResponse('Account ID missing', { status: 400 });
    }

    await db.delete(connectedAccounts).where(
      and(
        eq(connectedAccounts.id, id),
        eq(connectedAccounts.userId, user.id)
      )
    );

    return new NextResponse('Account disconnected', { status: 200 });
  } catch (error) {
    console.error('[ACCOUNT_DELETE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
