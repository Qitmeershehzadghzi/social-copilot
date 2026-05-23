export async function fetchYouTubeChannel(accessToken: string) {
  const res = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch YouTube channel: ${await res.text()}`);
  }

  const data = await res.json();
  return data.items?.[0] || null;
}

export async function fetchYouTubeComments(accessToken: string, channelId: string, maxResults: number = 20) {
  const res = await fetch(`https://www.googleapis.com/youtube/v3/commentThreads?part=snippet,replies&allThreadsRelatedToChannelId=${channelId}&maxResults=${maxResults}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch YouTube comments: ${await res.text()}`);
  }

  const data = await res.json();
  return data.items || [];
}

export async function replyToYouTubeComment(accessToken: string, commentId: string, replyText: string) {
  const res = await fetch('https://www.googleapis.com/youtube/v3/comments?part=snippet', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      snippet: {
        parentId: commentId,
        textOriginal: replyText,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to reply to YouTube comment: ${await res.text()}`);
  }

  return await res.json();
}
