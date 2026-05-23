import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { checkPlanLimits } from '@/lib/plan-limits';
import crypto from 'crypto';

function getAppUrl(req: Request) {
  const originFromRequest = new URL(req.url).origin.replace(/\/$/, '');
  const forwardedProto = req.headers.get('x-forwarded-proto') || req.headers.get('x-forwarded-scheme') || '';
  const forwardedHost = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const forwardedOrigin = forwardedHost
    ? `${forwardedProto ? forwardedProto.replace(/\/$/, '') : new URL(req.url).protocol.replace(':', '')}://${forwardedHost.replace(/\/$/, '')}`
    : null;
  const requestOrigin = forwardedOrigin || originFromRequest;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  const isLocalUrl = appUrl?.match(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/);

  return !appUrl || isLocalUrl ? requestOrigin : appUrl;
}

function createCodeChallenge(verifier: string) {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { platform } = await params;

    // Check plan limits
    const limitCheck = await checkPlanLimits(userId, 'connect_account');
    if (!limitCheck.allowed) {
      return NextResponse.redirect(new URL(`/dashboard/accounts?error=plan_limit_reached`, req.url));
    }

    const appUrl = getAppUrl(req);
    const redirectUri = `${appUrl}/api/accounts/oauth/${platform}/callback`;

    // Secure state generation
    const state = crypto.randomBytes(16).toString('hex');
    
    let authUrl = '';
    let codeVerifier = '';

    switch (platform) {
      case 'twitter':
        // Twitter OAuth 2.0 (PKCE)
        const twitterClientId = process.env.TWITTER_CLIENT_ID || process.env.TWITTER_API_KEY;
        if (!twitterClientId) {
          return NextResponse.redirect(new URL(`/dashboard/accounts?error=missing_twitter_client_id`, req.url));
        }
        codeVerifier = crypto.randomBytes(32).toString('base64url');
        const codeChallenge = createCodeChallenge(codeVerifier);
        const twitterParams = new URLSearchParams({
          response_type: 'code',
          client_id: twitterClientId,
          redirect_uri: redirectUri,
          scope: 'tweet.read tweet.write users.read offline.access',
          state,
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
        });
        authUrl = `https://twitter.com/i/oauth2/authorize?${twitterParams.toString()}`;
        break;
        
      case 'linkedin':
        // LinkedIn OAuth 2.0
        authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${process.env.LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=w_member_social%20r_liteprofile`;
        break;

      case 'facebook':
      case 'instagram':
        // Facebook / Instagram OAuth 2.0
        authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish`;
        break;

      case 'youtube':
        // Google / YouTube OAuth 2.0
        authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.YOUTUBE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=https://www.googleapis.com/auth/youtube.upload%20https://www.googleapis.com/auth/youtube.readonly&access_type=offline&prompt=consent&state=${state}`;
        break;

      case 'tiktok':
        // TikTok OAuth 2.0
        authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${process.env.TIKTOK_CLIENT_KEY}&response_type=code&scope=video.upload,user.info.basic&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
        break;
        
      case 'pinterest':
        // Pinterest OAuth 2.0
        authUrl = `https://www.pinterest.com/oauth/?client_id=${process.env.PINTEREST_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=boards:read,pins:read,pins:write&state=${state}`;
        break;

      default:
        return NextResponse.redirect(new URL(`/dashboard/accounts?error=unsupported_platform`, req.url));
    }

    // Redirect to the authorization URL
    const response = NextResponse.redirect(authUrl);
    
    // Set a cookie for state verification (and code_verifier for PKCE if implementing full PKCE flow)
    response.cookies.set(`oauth_state_${platform}`, state, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
      path: '/'
    });

    if (platform === 'twitter') {
      response.cookies.set(`oauth_code_verifier_${platform}`, codeVerifier, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 10,
        path: '/'
      });
    }

    return response;

  } catch (error) {
    console.error('[OAUTH_INIT]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
