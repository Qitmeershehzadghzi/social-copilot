// Twitter API v2 publisher
type TwitterUser = {
  id: string;
  name: string;
  username: string;
};

type TwitterMention = {
  id: string;
  text: string;
  authorId?: string;
  authorName?: string;
  authorUsername?: string;
  createdAt?: string;
};

function getTwitterError(data: unknown) {
  if (typeof data === "object" && data !== null) {
    const value = data as { detail?: string; title?: string; errors?: Array<{ message?: string; detail?: string }> };
    return value.detail || value.errors?.[0]?.message || value.errors?.[0]?.detail || value.title || "Twitter API error";
  }

  return "Twitter API error";
}

export async function publishToTwitter(
  accessToken: string,
  content: string,
  mediaUrls?: string[],
  accountHandle?: string
): Promise<{ platformPostId: string }> {
  console.log('[Twitter Publisher] Publishing tweet...');
  console.log('[Twitter Publisher] Account handle:', accountHandle || 'unknown');
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

export async function fetchTwitterMe(accessToken: string): Promise<TwitterUser> {
  const res = await fetch("https://api.twitter.com/2/users/me?user.fields=username,name", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await res.json();
  if (!res.ok || !data.data?.id) {
    throw new Error(getTwitterError(data));
  }

  return data.data;
}

export async function fetchTwitterMentions(accessToken: string, userId: string, maxResults = 10): Promise<TwitterMention[]> {
  const params = new URLSearchParams({
    max_results: String(Math.max(5, Math.min(maxResults, 100))),
    "tweet.fields": "author_id,created_at,conversation_id,referenced_tweets",
    expansions: "author_id",
    "user.fields": "username,name",
  });

  const res = await fetch(`https://api.twitter.com/2/users/${userId}/mentions?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(getTwitterError(data));
  }

  const usersById = new Map<string, { name?: string; username?: string }>(
    (data.includes?.users || []).map((user: { id: string; name?: string; username?: string }) => [user.id, user])
  );

  return (data.data || []).map((tweet: { id: string; text: string; author_id?: string; created_at?: string }) => {
    const author = tweet.author_id ? usersById.get(tweet.author_id) : undefined;
    return {
      id: tweet.id,
      text: tweet.text,
      authorId: tweet.author_id,
      authorName: author?.name,
      authorUsername: author?.username,
      createdAt: tweet.created_at,
    };
  });
}

export async function replyToTwitterTweet(accessToken: string, tweetId: string, replyText: string): Promise<{ platformPostId: string }> {
  const res = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: replyText,
      reply: {
        in_reply_to_tweet_id: tweetId,
      },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(getTwitterError(data));
  }

  return { platformPostId: data.data?.id };
}
