// Facebook Graph API publisher
export async function publishToFacebook(
  accessToken: string,
  content: string,
  mediaUrls?: string[],
  accountHandle?: string
): Promise<{ platformPostId: string }> {
  console.log('[Facebook Publisher] Publishing post...');

  const body: Record<string, string> = {
    message: content,
    access_token: accessToken,
  };

  if (mediaUrls?.[0]) {
    body.link = mediaUrls[0];
  }

  const res = await fetch('https://graph.facebook.com/v18.0/me/feed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data?.error?.message || 'Facebook publish failed');
  }

  return { platformPostId: data.id ?? `fb_${Date.now()}` };
}
