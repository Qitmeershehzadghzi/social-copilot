import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { mediaAssets, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const [user] = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (!user) return new NextResponse('User not found', { status: 404 });

    const body = await req.json();
    const { mediaId, transform } = body as { mediaId?: string; transform?: string };
    const normalizedTransform = transform?.trim();
    if (!mediaId || !normalizedTransform) return new NextResponse('Missing parameters', { status: 400 });
    if (normalizedTransform.length > 500) return new NextResponse('Transformation is too long', { status: 400 });

    const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, mediaId)).limit(1);
    if (!asset) return new NextResponse('Media asset not found', { status: 404 });
    if (asset.userId !== user.id) return new NextResponse('Forbidden', { status: 403 });
    if (asset.type !== 'image') return new NextResponse('AI transformations are available for images only', { status: 400 });

    const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;
    if (!urlEndpoint) return new NextResponse('ImageKit not configured', { status: 500 });

    const normalizedEndpoint = urlEndpoint.replace(/\/$/, '');
    const originalUrl = asset.url;
    try {
      const u = new URL(originalUrl);
      if (!u.href.startsWith(`${normalizedEndpoint}/`)) {
        return new NextResponse('Media url does not belong to configured ImageKit endpoint', { status: 400 });
      }

      u.searchParams.set('tr', normalizedTransform);
      const transformedUrl = u.toString();

      await db.update(mediaAssets).set({ url: transformedUrl }).where(eq(mediaAssets.id, mediaId));

      const [updated] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, mediaId)).limit(1);
      return NextResponse.json(updated);
    } catch (e) {
      console.error('[MEDIA_TRANSFORM] Failed to build transformed url', e);
      return new NextResponse('Invalid media url', { status: 400 });
    }
  } catch (error) {
    console.error('[MEDIA_TRANSFORM]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
