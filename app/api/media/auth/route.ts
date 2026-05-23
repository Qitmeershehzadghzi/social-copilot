import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import crypto from 'crypto';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY || 'dummy_private_key_for_testing';
    
    const token = crypto.randomUUID();
    const expire = Math.floor(Date.now() / 1000) + 60 * 30; // 30 minutes
    const signature = crypto.createHmac('sha1', privateKey).update(token + expire).digest('hex');

    return NextResponse.json({
      token,
      expire,
      signature
    });
  } catch (error) {
    console.error('[IMAGEKIT_AUTH]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
