import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { DEFAULT_PREFERENCES, parsePreferences } from '@/lib/notifications';

function sanitizePreferences(body: Record<string, unknown>) {
  return {
    ...DEFAULT_PREFERENCES,
    postPublished: Boolean(body.postPublished),
    postFailed: Boolean(body.postFailed),
    autoReplySent: Boolean(body.autoReplySent),
    autoReplyFailed: Boolean(body.autoReplyFailed),
    weeklyDigest: Boolean(body.weeklyDigest),
    defaultReplyTone: body.defaultReplyTone === 'professional' || body.defaultReplyTone === 'short' ? body.defaultReplyTone : 'friendly',
    requireKeywordsForAutoReplies: Boolean(body.requireKeywordsForAutoReplies),
    pauseAutoReplies: Boolean(body.pauseAutoReplies),
    maxReplyLength: Math.max(80, Math.min(Number(body.maxReplyLength) || DEFAULT_PREFERENCES.maxReplyLength, 500)),
  };
}

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
    const preferencesBody = sanitizePreferences(body);
    const preferences = JSON.stringify(preferencesBody);

    await db.update(users).set({ preferences, updatedAt: new Date() }).where(eq(users.id, user.id));

    return NextResponse.json({
      success: true,
      preferences: preferencesBody,
      plunkConfigured: Boolean(process.env.PLUNK_SECRET_KEY),
    });
  } catch (error) {
    console.error('Error updating notifications:', error);
    const message = error instanceof Error ? error.message : 'Internal Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [user] = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const preferences = parsePreferences(user.preferences);
    return NextResponse.json({
      preferences,
      plunkConfigured: Boolean(process.env.PLUNK_SECRET_KEY),
    });
  } catch (error) {
    console.error('Error getting notifications:', error);
    const message = error instanceof Error ? error.message : 'Internal Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
