import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { connectedAccounts, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { cookies } from 'next/headers';

type ConnectedPlatform = typeof connectedAccounts.$inferInsert.platform;

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
};

type TwitterProfileResponse = {
  data?: {
    name?: string;
    username?: string;
  };
};

type OAuthErrorResponse = {
  error?: string;
  error_description?: string;
  detail?: string;
  message?: string;
};

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

function redirectToAccounts(req: Request, platform: string, params: Record<string, string>) {
  const url = new URL('/dashboard/accounts', req.url);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = NextResponse.redirect(url);
  response.cookies.delete(`oauth_state_${platform}`);
  response.cookies.delete(`oauth_code_verifier_${platform}`);
  return response;
}

function createBasicAuthHeader(clientId: string, clientSecret: string) {
  const encodedClientId = encodeURIComponent(clientId);
  const encodedClientSecret = encodeURIComponent(clientSecret);
  return `Basic ${Buffer.from(`${encodedClientId}:${encodedClientSecret}`).toString('base64')}`;
}

function getOAuthErrorMessage(data: OAuthErrorResponse) {
  return data.error_description || data.detail || data.message || data.error || 'oauth_error';
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }

    const { platform } = await params;
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const returnedState = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    
    if (error) {
      return redirectToAccounts(req, platform, { error });
    }

    if (!code) {
      return redirectToAccounts(req, platform, { error: 'no_code' });
    }

    const cookieStore = await cookies();
    const savedState = cookieStore.get(`oauth_state_${platform}`)?.value;
    const codeVerifier = cookieStore.get(`oauth_code_verifier_${platform}`)?.value;

    if (!savedState || savedState !== returnedState) {
      return redirectToAccounts(req, platform, { error: 'oauth_state_mismatch' });
    }

    if (platform === 'twitter' && !codeVerifier) {
      return redirectToAccounts(req, platform, { error: 'missing_pkce_verifier' });
    }

    const [user] = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (!user) {
      return redirectToAccounts(req, platform, { error: 'user_not_found' });
    }

    const appUrl = getAppUrl(req);
    const redirectUri = `${appUrl}/api/accounts/oauth/${platform}/callback`;

    let accessToken = '';
    let refreshToken = '';
    let accountName = `My ${platform.charAt(0).toUpperCase() + platform.slice(1)} Account`;
    let accountHandle = `${platform}_user`;
    let expiresIn = 3600 * 24 * 30; // default 30 days

    try {
      // Exchange code for tokens
      let tokenUrl = '';
      const body: Record<string, string> = {
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      };
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded'
      };

      if (platform === 'twitter') {
        tokenUrl = 'https://api.twitter.com/2/oauth2/token';
        const clientId = process.env.TWITTER_CLIENT_ID || process.env.TWITTER_API_KEY || '';
        const clientSecret = process.env.TWITTER_CLIENT_SECRET || process.env.TWITTER_API_SECRET || '';
        if (!clientId) {
          return redirectToAccounts(req, platform, { error: 'missing_twitter_client_id' });
        }
        body.client_id = clientId;
        body.code_verifier = codeVerifier || '';
        if (clientSecret) {
          headers['Authorization'] = createBasicAuthHeader(clientId, clientSecret);
        }
      } else if (platform === 'linkedin') {
        tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
        body.client_id = process.env.LINKEDIN_CLIENT_ID || '';
        body.client_secret = process.env.LINKEDIN_CLIENT_SECRET || '';
      } else if (platform === 'facebook' || platform === 'instagram') {
        tokenUrl = 'https://graph.facebook.com/v19.0/oauth/access_token';
        body.client_id = process.env.FACEBOOK_APP_ID || '';
        body.client_secret = process.env.FACEBOOK_APP_SECRET || '';
      } else if (platform === 'youtube') {
        tokenUrl = 'https://oauth2.googleapis.com/token';
        body.client_id = process.env.YOUTUBE_CLIENT_ID || '';
        body.client_secret = process.env.YOUTUBE_CLIENT_SECRET || '';
      } else if (platform === 'tiktok') {
        tokenUrl = 'https://open.tiktokapis.com/v2/oauth/token/';
        body.client_key = process.env.TIKTOK_CLIENT_KEY || '';
        body.client_secret = process.env.TIKTOK_CLIENT_SECRET || '';
      } else if (platform === 'pinterest') {
        tokenUrl = 'https://api.pinterest.com/v5/oauth/token';
        const clientId = process.env.PINTEREST_CLIENT_ID || '';
        const clientSecret = process.env.PINTEREST_CLIENT_SECRET || '';
        if (!clientId || !clientSecret) {
          return redirectToAccounts(req, platform, { error: 'missing_pinterest_credentials' });
        }
        headers['Authorization'] = createBasicAuthHeader(clientId, clientSecret);
      }

      if (!tokenUrl) {
        return redirectToAccounts(req, platform, { error: 'unsupported_platform' });
      }

      const tokenRes = await fetch(tokenUrl, {
        method: 'POST',
        headers,
        body: new URLSearchParams(body).toString()
      });

      const tokenData = (await tokenRes.json()) as TokenResponse & OAuthErrorResponse;
        
      if (!tokenRes.ok) {
        console.error(`Token exchange failed for ${platform}:`, tokenData);
        return redirectToAccounts(req, platform, {
          error: 'token_exchange_failed',
          detail: getOAuthErrorMessage(tokenData),
        });
      }

      const tokenAccessToken = tokenData.access_token;
      if (!tokenAccessToken) {
        return redirectToAccounts(req, platform, { error: 'missing_access_token' });
      }

      accessToken = tokenAccessToken;
      refreshToken = tokenData.refresh_token || '';
      expiresIn = tokenData.expires_in || (3600 * 24 * 30);

      if (platform === 'twitter') {
        const userRes = await fetch('https://api.twitter.com/2/users/me?user.fields=username,name', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (userRes.ok) {
          const userData = (await userRes.json()) as TwitterProfileResponse;
          accountName = userData.data?.name || accountName;
          accountHandle = userData.data?.username || accountHandle;
        } else {
          console.warn('Failed to fetch Twitter account profile:', await userRes.text());
        }
      } else if (platform === 'youtube') {
        const userRes = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (userRes.ok) {
          const userData = await userRes.json();
          if (userData.items && userData.items.length > 0) {
            accountName = userData.items[0].snippet?.title || accountName;
            accountHandle = userData.items[0].snippet?.customUrl || userData.items[0].id || accountHandle;
          }
        } else {
          console.warn('Failed to fetch YouTube account profile:', await userRes.text());
        }
      } else if (platform === 'linkedin') {
        const userRes = await fetch('https://api.linkedin.com/v2/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (userRes.ok) {
          const userData = await userRes.json();
          accountName = userData.name || `${userData.given_name} ${userData.family_name}` || accountName;
          accountHandle = userData.email || accountHandle;
        } else {
          console.warn('Failed to fetch LinkedIn account profile:', await userRes.text());
        }
      } else if (platform === 'facebook' || platform === 'instagram') {
        const userRes = await fetch('https://graph.facebook.com/me?fields=id,name,username', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (userRes.ok) {
          const userData = await userRes.json();
          accountName = userData.name || accountName;
          accountHandle = userData.username || userData.id || accountHandle;
        } else {
          console.warn(`Failed to fetch ${platform} account profile:`, await userRes.text());
        }
      } else if (platform === 'tiktok') {
        const userRes = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,username', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (userRes.ok) {
          const userData = await userRes.json();
          accountName = userData.data?.user?.display_name || accountName;
          accountHandle = userData.data?.user?.username || accountHandle;
        } else {
          console.warn('Failed to fetch TikTok account profile:', await userRes.text());
        }
      } else if (platform === 'pinterest') {
        const userRes = await fetch('https://api.pinterest.com/v5/user_account', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (userRes.ok) {
          const userData = await userRes.json();
          accountName = userData.username || accountName;
          accountHandle = userData.username || accountHandle;
        } else {
          console.warn('Failed to fetch Pinterest account profile:', await userRes.text());
        }
      }
    } catch (exchangeError) {
      console.error('Token exchange error:', exchangeError);
      return redirectToAccounts(req, platform, { error: 'token_exchange_failed' });
    }

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);

    // Upsert the connected account
    const existing = await db.select().from(connectedAccounts)
      .where(and(
        eq(connectedAccounts.userId, user.id),
        eq(connectedAccounts.platform, platform as ConnectedPlatform)
      )).limit(1);

    if (existing.length > 0) {
      await db.update(connectedAccounts).set({
        accessToken,
        refreshToken,
        accountName,
        accountHandle,
        expiresAt,
        updatedAt: new Date()
      }).where(eq(connectedAccounts.id, existing[0].id));
    } else {
      await db.insert(connectedAccounts).values({
        userId: user.id,
        platform: platform as ConnectedPlatform,
        accessToken,
        refreshToken,
        accountName,
        accountHandle,
        expiresAt,
      });
    }

    return redirectToAccounts(req, platform, { connected: 'true', platform });

  } catch (error) {
    console.error('[OAUTH_CALLBACK]', error);
    return NextResponse.redirect(new URL(`/dashboard/accounts?error=internal_error`, req.url));
  }
}
