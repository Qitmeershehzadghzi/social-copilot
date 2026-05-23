import { publishToTwitter } from './twitter';
import { publishToLinkedIn } from './linkedin';
import { publishToFacebook } from './facebook';
import { publishToInstagram } from './instagram';
import { publishToYouTube } from './youtube';
import { publishToTikTok } from './tiktok';
import { publishToPinterest } from './pinterest';

export async function publishPost(
  platform: string,
  accessToken: string,
  content: string,
  mediaUrls: string[] = [],
  accountHandle?: string,
  scheduledAt?: string | null
): Promise<{ platformPostId: string }> {
  switch (platform) {
    case 'twitter':
      return publishToTwitter(accessToken, content, mediaUrls, accountHandle);
    case 'linkedin':
      return publishToLinkedIn(accessToken, content, mediaUrls, accountHandle);
    case 'facebook':
      return publishToFacebook(accessToken, content, mediaUrls, accountHandle);
    case 'instagram':
      return publishToInstagram(accessToken, content, mediaUrls, accountHandle);
    case 'youtube':
      return publishToYouTube(accessToken, content, mediaUrls, accountHandle, scheduledAt);
    case 'tiktok':
      return publishToTikTok(accessToken, content, mediaUrls, accountHandle);
    case 'pinterest':
      return publishToPinterest(accessToken, content, mediaUrls, accountHandle);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}
