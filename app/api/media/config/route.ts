import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || null,
    urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || null,
  })
}
