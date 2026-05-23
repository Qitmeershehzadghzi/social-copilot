import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [user] = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const preferences = JSON.stringify(body);

    await db.update(users).set({ preferences, updatedAt: new Date() }).where(eq(users.id, user.id));

    return NextResponse.json({ success: true, preferences: body });
  } catch (error: any) {
    console.error('Error updating notifications:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [user] = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const preferences = user.preferences ? JSON.parse(user.preferences) : {};
    return NextResponse.json({ preferences });
  } catch (error: any) {
    console.error('Error getting notifications:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
