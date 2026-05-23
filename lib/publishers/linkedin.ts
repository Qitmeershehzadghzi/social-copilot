// LinkedIn UGC Posts API publisher
export async function publishToLinkedIn(
  accessToken: string,
  content: string,
  mediaUrls?: string[],
  accountHandle?: string
): Promise<{ platformPostId: string }> {
  console.log('[LinkedIn Publisher] Publishing post...');
  console.log('[LinkedIn Publisher] Fetching user profile...');

  const profileRes = await fetch('https://api.linkedin.com/v2/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  const profileData = await profileRes.json();
  console.log('[LinkedIn Publisher] Profile response status:', profileRes.status);

  if (!profileRes.ok) {
    const errorMsg = profileData?.message || 'LinkedIn profile fetch failed';
    console.error('[LinkedIn Publisher] Profile error:', errorMsg);
    throw new Error(errorMsg);
  }

  const author = `urn:li:person:${profileData.id}`;
  console.log('[LinkedIn Publisher] Author URN:', author);
  const body = {
    author,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: content },
        shareMediaCategory: 'NONE',
      },
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  };

  console.log('[LinkedIn Publisher] Posting to LinkedIn API...');

  const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  console.log('[LinkedIn Publisher] API Response status:', res.status);
  console.log('[LinkedIn Publisher] API Response data:', data);

  if (!res.ok) {
    const errorMsg = data?.message || data?.serviceErrorCode || 'LinkedIn publish failed';
    console.error('[LinkedIn Publisher] Error:', errorMsg);
    throw new Error(errorMsg);
  }

  const platformPostId = data.id ?? `li_${Date.now()}`;
  console.log('[LinkedIn Publisher] Post published successfully, ID:', platformPostId);
  return { platformPostId };
}
