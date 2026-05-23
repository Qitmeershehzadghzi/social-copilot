// Twitter API v2 publisher
export async function publishToTwitter(
  accessToken: string,
  content: string,
  mediaUrls?: string[],
  accountHandle?: string
): Promise<{ platformPostId: string }> {
  console.log('[Twitter Publisher] Publishing tweet...');
  console.log('[Twitter Publisher] Content length:', content.length);
  console.log('[Twitter Publisher] Media URLs count:', mediaUrls?.length || 0);

  const tweetText = mediaUrls?.length
    ? `${content}

${mediaUrls.join('\n')}`
    : content;

  console.log('[Twitter Publisher] Final tweet text:', tweetText.substring(0, 100), '...');

  const res = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: tweetText }),
  });

  const data = await res.json();
  console.log('[Twitter Publisher] API Response status:', res.status);
  console.log('[Twitter Publisher] API Response data:', data);

  if (!res.ok) {
    const errorMsg = data?.detail || data?.errors?.[0]?.message || 'Twitter API error';
    console.error('[Twitter Publisher] Error:', errorMsg);
    throw new Error(errorMsg);
  }

  const platformPostId = data.data?.id ?? `tw_${Date.now()}`;
  console.log('[Twitter Publisher] Tweet published successfully, ID:', platformPostId);
  return { platformPostId };
}
