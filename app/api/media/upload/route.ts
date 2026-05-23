import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { mediaAssets, posts, users } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const [user] = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (!user) return new NextResponse('User not found', { status: 404 });

    const body = await req.json();
    const { fileId, url, type, size, width, height, postId } = body as {
      fileId?: string;
      url?: string;
      type?: 'image' | 'video';
      size?: number;
      width?: number | null;
      height?: number | null;
      postId?: string | null;
    };

    if (!fileId || !url) {
      return new NextResponse('Missing uploaded file details', { status: 400 });
    }

    if (postId) {
      const [post] = await db
        .select({ id: posts.id })
        .from(posts)
        .where(and(eq(posts.id, postId), eq(posts.userId, user.id)))
        .limit(1);

      if (!post) {
        return new NextResponse('Post not found', { status: 404 });
      }
    }

    const [asset] = await db.insert(mediaAssets).values({
      postId: postId || null,
      userId: user.id,
      imagekitFileId: fileId,
      url,
      type: type === 'video' ? 'video' : 'image',
      size: size || 0,
      width: width || null,
      height: height || null,
    }).returning();

    return NextResponse.json(asset);
  } catch (error) {
    console.error('[MEDIA_UPLOAD]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
