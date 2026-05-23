export async function fetchYouTubeComments(accessToken: string, maxResults: number = 20) {
  // We fetch commentThreads from the authenticated user's channel
  const res = await fetch(`https://www.googleapis.com/youtube/v3/commentThreads?part=snippet,replies&allThreadsRelatedToChannelId=mine&maxResults=${maxResults}`, {
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
