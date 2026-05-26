import { db } from '@/db';
import { connectedAccounts } from '@/db/schema';
import { eq } from 'drizzle-orm';

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

function createBasicAuthHeader(clientId: string, clientSecret: string) {
  const encodedClientId = encodeURIComponent(clientId);
  const encodedClientSecret = encodeURIComponent(clientSecret);
  return `Basic ${Buffer.from(`${encodedClientId}:${encodedClientSecret}`).toString('base64')}`;
}

async function refreshTwitterToken(refreshToken: string) {
  const clientId = process.env.TWITTER_CLIENT_ID || process.env.TWITTER_API_KEY || '';
  const clientSecret = process.env.TWITTER_CLIENT_SECRET || process.env.TWITTER_API_SECRET || '';

  if (!clientId) throw new Error('Missing Twitter client ID');

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  const body: Record<string, string> = {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
  };

  if (clientSecret) {
    headers.Authorization = createBasicAuthHeader(clientId, clientSecret);
  }

  const res = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers,
    body: new URLSearchParams(body).toString(),
  });

  const data = (await res.json()) as TokenResponse;
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Twitter token refresh failed');
  }

  return data;
}

async function refreshYouTubeToken(refreshToken: string) {
  const clientId = process.env.YOUTUBE_CLIENT_ID || '';
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET || '';

  if (!clientId || !clientSecret) throw new Error('Missing YouTube OAuth credentials');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  });

  const data = (await res.json()) as TokenResponse;
  if (!res.ok || !data.access_token) {
    const errorMsg = data.error_description || data.error || 'YouTube token refresh failed';
    console.error('[TOKEN_REFRESH] YouTube refresh failed:', { 
      status: res.status, 
      error: errorMsg,
      clientId: clientId.substring(0, 20) + '***'
    });
    if (res.status === 401 || errorMsg === 'invalid_grant') {
      throw new Error('YouTube refresh token expired or invalid. Please reconnect your YouTube account in Settings.');
    }
    throw new Error(errorMsg);
  }

  return data;
}

/**
 * Refreshes the access token for a given platform.
 * Returns the new token details or throws if the refresh failed.
 */
export async function refreshAccessToken(
  platform: string,
  refreshToken: string,
  connectedAccountId: string
): Promise<{ accessToken: string; refreshToken: string | null; expiresAt: Date | null }> {
  console.log(`Refreshing token for ${platform}...`);
  const data = platform === 'twitter'
    ? await refreshTwitterToken(refreshToken)
    : platform === 'youtube'
      ? await refreshYouTubeToken(refreshToken)
      : null;

  if (!data) {
    throw new Error(`Token refresh is not implemented for ${platform}`);
  }

  const newAccessToken = data.access_token!;
  const newRefreshToken = data.refresh_token || refreshToken;
  const newExpiresAt = data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null;

  await db.update(connectedAccounts)
    .set({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresAt: newExpiresAt,
      updatedAt: new Date()
    })
    .where(eq(connectedAccounts.id, connectedAccountId));

  return { accessToken: newAccessToken, refreshToken: newRefreshToken, expiresAt: newExpiresAt };
}
