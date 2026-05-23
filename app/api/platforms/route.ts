import { NextResponse } from "next/server"

import { PLATFORMS } from "@/lib/platforms"

export async function GET(req: Request) {
  const originFromRequest = new URL(req.url).origin.replace(/\/$/, "");
  const forwardedProto = req.headers.get('x-forwarded-proto') || req.headers.get('x-forwarded-scheme') || '';
  const forwardedHost = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const forwardedOrigin = forwardedHost
    ? `${forwardedProto ? forwardedProto.replace(/\/$/, '') : new URL(req.url).protocol.replace(':', '')}://${forwardedHost.replace(/\/$/, '')}`
    : null;
  const origin = !process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL.match(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/)
    ? forwardedOrigin || originFromRequest
    : process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

  const platforms = PLATFORMS.map((platform) => {
    const configured = platform.envVars.every((envVar) => Boolean(process.env[envVar]))

    return {
      id: platform.id,
      name: platform.name,
      shortName: platform.shortName,
      colorClass: platform.colorClass,
      dotClass: platform.dotClass,
      characterLimit: platform.characterLimit,
      envVars: platform.envVars,
      callbackPath: platform.callbackPath,
      developerUrl: platform.developerUrl,
      setupNote: platform.setupNote,
      configured,
      callbackUrl: `${origin}${platform.callbackPath}`,
    }
  })

  return NextResponse.json(platforms)
}
