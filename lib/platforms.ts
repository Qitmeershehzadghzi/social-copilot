import {
  Briefcase,
  Camera,
  Image as ImageIcon,
  MessageCircle,
  Music,
  type LucideIcon,
  Users,
  Video,
} from "lucide-react"

export type PlatformId =
  | "twitter"
  | "linkedin"
  | "facebook"
  | "instagram"
  | "youtube"
  | "tiktok"
  | "pinterest"

export type PlatformConfig = {
  id: PlatformId
  name: string
  shortName: string
  icon: LucideIcon
  colorClass: string
  dotClass: string
  characterLimit: number
  envVars: string[]
  callbackPath: string
  developerUrl: string
  setupNote: string
}

export const PLATFORMS: PlatformConfig[] = [
  {
    id: "twitter",
    name: "Twitter (X)",
    shortName: "Twitter",
    icon: MessageCircle,
    colorClass: "text-blue-400",
    dotClass: "bg-[#1DA1F2]",
    characterLimit: 280,
    envVars: ["TWITTER_CLIENT_ID", "TWITTER_CLIENT_SECRET"],
    callbackPath: "/api/accounts/oauth/twitter/callback",
    developerUrl: "https://developer.x.com/en/portal/dashboard",
    setupNote: "Enable OAuth 2.0 and add tweet.read, tweet.write, users.read, offline.access scopes.",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    shortName: "LinkedIn",
    icon: Briefcase,
    colorClass: "text-blue-600",
    dotClass: "bg-[#0077B5]",
    characterLimit: 3000,
    envVars: ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"],
    callbackPath: "/api/accounts/oauth/linkedin/callback",
    developerUrl: "https://www.linkedin.com/developers/apps",
    setupNote: "Request Sign In and w_member_social access, then add the redirect URL.",
  },
  {
    id: "facebook",
    name: "Facebook",
    shortName: "Facebook",
    icon: Users,
    colorClass: "text-blue-500",
    dotClass: "bg-[#1877F2]",
    characterLimit: 63206,
    envVars: ["FACEBOOK_APP_ID", "FACEBOOK_APP_SECRET"],
    callbackPath: "/api/accounts/oauth/facebook/callback",
    developerUrl: "https://developers.facebook.com/apps/",
    setupNote: "Create a Meta app, configure Facebook Login, and request Pages permissions.",
  },
  {
    id: "instagram",
    name: "Instagram",
    shortName: "Instagram",
    icon: ImageIcon,
    colorClass: "text-pink-500",
    dotClass: "bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCAF45]",
    characterLimit: 2200,
    envVars: ["FACEBOOK_APP_ID", "FACEBOOK_APP_SECRET"],
    callbackPath: "/api/accounts/oauth/instagram/callback",
    developerUrl: "https://developers.facebook.com/apps/",
    setupNote: "Use the same Meta app, connect an Instagram Business account to a Facebook Page.",
  },
  {
    id: "youtube",
    name: "YouTube",
    shortName: "YouTube",
    icon: Video,
    colorClass: "text-red-500",
    dotClass: "bg-[#FF0000]",
    characterLimit: 5000,
    envVars: ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET"],
    callbackPath: "/api/accounts/oauth/youtube/callback",
    developerUrl: "https://console.cloud.google.com/apis/credentials",
    setupNote: "Enable YouTube Data API v3 and create an OAuth Web Client.",
  },
  {
    id: "tiktok",
    name: "TikTok",
    shortName: "TikTok",
    icon: Music,
    colorClass: "text-gray-300",
    dotClass: "bg-black",
    characterLimit: 2200,
    envVars: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"],
    callbackPath: "/api/accounts/oauth/tiktok/callback",
    developerUrl: "https://developers.tiktok.com/",
    setupNote: "Create a Login Kit app and add the redirect URL in app settings.",
  },
  {
    id: "pinterest",
    name: "Pinterest",
    shortName: "Pinterest",
    icon: Camera,
    colorClass: "text-red-600",
    dotClass: "bg-[#E60023]",
    characterLimit: 500,
    envVars: ["PINTEREST_CLIENT_ID", "PINTEREST_CLIENT_SECRET"],
    callbackPath: "/api/accounts/oauth/pinterest/callback",
    developerUrl: "https://developers.pinterest.com/apps/",
    setupNote: "Create a Pinterest app, enable OAuth, and add boards/pins scopes.",
  },
]

export const PLATFORM_IDS = PLATFORMS.map((platform) => platform.id)

export function getPlatformConfig(platformId: string) {
  return PLATFORMS.find((platform) => platform.id === platformId)
}

export function getStrictestPlatformLimit(platformIds: string[]) {
  if (platformIds.length === 0) return 3000

  const strictLimit = platformIds.reduce((limit, platformId) => {
    const platform = getPlatformConfig(platformId)
    return Math.min(limit, platform?.characterLimit ?? limit)
  }, Infinity)

  return Number.isFinite(strictLimit) ? strictLimit : 3000
}
