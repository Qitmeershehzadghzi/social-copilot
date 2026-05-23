// YouTube Data API v3 publisher
export async function publishToYouTube(
  accessToken: string,
  content: string,
  mediaUrls?: string[],
  accountHandle?: string,
  scheduledAt?: string | null
): Promise<{ platformPostId: string }> {
  console.log('[YouTube Publisher] Publishing content...');
  console.log('[YouTube Publisher] Content:', content.substring(0, 100));
  console.log('[YouTube Publisher] Media URLs:', mediaUrls?.length || 0);

  if (mediaUrls?.[0]) {
    // Real video upload implementation
    console.log('[YouTube Publisher] Video URL provided, would upload to YouTube');
    try {
      // 1. Download the media file first
      console.log('[YouTube Publisher] Downloading media from URL...');
      const mediaResponse = await fetch(mediaUrls[0]);
      if (!mediaResponse.ok) throw new Error('Failed to download media');
      const mediaBuffer = await mediaResponse.arrayBuffer();

      // Native YouTube API scheduling
      const statusObj: Record<string, string> = { privacyStatus: 'public' };
      if (scheduledAt) {
        statusObj.privacyStatus = 'private';
        statusObj.publishAt = new Date(scheduledAt).toISOString();
        console.log('[YouTube Publisher] Scheduling native post for:', statusObj.publishAt);
      }

      // 2. Initialize resumable upload
      console.log('[YouTube Publisher] Initializing resumable upload...');
      const initRes = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Length': mediaBuffer.byteLength.toString(),
          'X-Upload-Content-Type': mediaResponse.headers.get('content-type') || 'video/mp4'
        },
        body: JSON.stringify({
          snippet: {
            title: content.substring(0, 100) || 'New Video',
            description: content,
          },
          status: statusObj,
        }),
      });

      if (!initRes.ok) {
        const errorText = await initRes.text();
        throw new Error(`Init upload failed: ${initRes.status} ${errorText}`);
      }

      const uploadUrl = initRes.headers.get('Location');
      if (!uploadUrl) {
        throw new Error('No upload URL returned');
      }

      // 3. Upload the actual video data
      console.log('[YouTube Publisher] Uploading video bytes...');
      const res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': mediaResponse.headers.get('content-type') || 'video/mp4',
        },
        body: mediaBuffer,
      });

      const data = await res.json();
      console.log('[YouTube Publisher] Upload response:', res.status);
      if (!res.ok) {
        console.log('[YouTube Publisher] Upload failed:', data);
        throw new Error(`YouTube upload failed: ${JSON.stringify(data)}`);
      } else {
        return { platformPostId: data.id ?? `yt_${Date.now()}` };
      }
    } catch (error) {
      console.error('[YouTube Publisher] Upload error:', error);
      throw error;
    }
  } else {
    console.log('[YouTube Publisher] No media provided. YouTube requires a video.');
    throw new Error('YouTube requires a video file to publish.');
  }
}
