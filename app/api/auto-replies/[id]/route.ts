import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { autoReplyRules, users } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const [user] = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (!user) return new NextResponse('User not found', { status: 404 });

    const { id } = await params;
    const body = await req.json();

    const [updated] = await db.update(autoReplyRules).set({
      ...body,
      updatedAt: new Date(),
    }).where(and(eq(autoReplyRules.id, id), eq(autoReplyRules.userId, user.id))).returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[AUTO_REPLIES_PUT]', error);
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
