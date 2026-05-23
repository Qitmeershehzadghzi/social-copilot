import { NextResponse } from 'next/server';
import { db } from '@/db';
import { connectedAccounts, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const [user] = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    const accounts = await db.select().from(connectedAccounts).where(eq(connectedAccounts.userId, user.id));

    return NextResponse.json(accounts);
  } catch (error) {
    console.error('[ACCOUNTS_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
