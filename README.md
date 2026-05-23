# Social Copilot

Multi-Platform Social Media Scheduler & AI Assistant

## Features

- **Multi-Platform Scheduling**: Schedule posts across Twitter, LinkedIn, Facebook, Instagram, Threads, TikTok, and YouTube
- **AI-Powered Auto-Replies**: Automatically respond to comments with personalized AI-generated messages
- **Smart Calendar**: Visual calendar for managing and scheduling content
- **Analytics Dashboard**: Track engagement, growth, and performance metrics
- **Team Collaboration**: Manage multiple accounts and team members
- **Media Management**: Upload and optimize images/videos with ImageKit integration

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
- **Authentication**: Clerk
- **Database**: NeonDB (PostgreSQL) with Drizzle ORM
- **Background Jobs**: BullMQ with Redis
- **AI Integration**: Google Gemini AI
- **Media Storage**: ImageKit
- **Calendar**: React Big Calendar
- **UI Components**: shadcn/ui

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd social-copilot
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy `.env.local.example` to `.env.local` and fill in your credentials:

```bash
cp .env.local.example .env.local
```

### 4. Set up services

- **Clerk**: Create an account at [clerk.com](https://clerk.com) and get your API keys
- **NeonDB**: Create a PostgreSQL database at [neon.tech](https://neon.tech)
- **Redis**: Install Redis locally or use a cloud service like Redis Cloud
- **Google Gemini**: Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **ImageKit**: Create an account at [imagekit.io](https://imagekit.io)

### 5. Run database migrations

```bash
npx drizzle-kit generate
npx drizzle-kit push
```

### 6. Start the development server

```bash
npm run dev
```

### 7. Open your browser

Visit [http://localhost:3000](http://localhost:3000)

## Project Structure

```
social-copilot/
├── app/                    # Next.js app router pages
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Dashboard pages (protected)
│   ├── api/               # API routes
│   │   └── webhooks/      # Webhook handlers
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   └── ui/               # shadcn/ui components
├── db/                   # Database schema and client
│   ├── index.ts          # Database client
│   └── schema.ts         # Drizzle ORM schema
├── lib/                  # Utility libraries
│   ├── bullmq.ts         # BullMQ queue setup
│   └── utils.ts          # Shared utilities
├── hooks/                # Custom React hooks
└── public/               # Static assets
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Database Schema

The database includes tables for:
- Users (linked to Clerk)
- Connected social media accounts
- Scheduled posts
- Post targets (cross-platform publishing)
- Media assets
- Auto-reply rules
- Comment events
- Subscriptions

## Webhooks

The app handles Clerk webhooks for:
- `user.created` - Create user record in database
- `user.updated` - Update user record
- `user.deleted` - Soft delete user record

## Connecting Social Accounts

Open `/dashboard/accounts` after signing in. Each platform card shows whether its required env vars are configured and the exact callback URL to paste into that platform's developer app.

For local development, keep `NEXT_PUBLIC_APP_URL=http://localhost:3000` and add these redirect/callback URLs:

| Platform | Env vars | Callback URL |
| --- | --- | --- |
| Twitter/X | `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET` | `http://localhost:3000/api/accounts/oauth/twitter/callback` |
| LinkedIn | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` | `http://localhost:3000/api/accounts/oauth/linkedin/callback` |
| Facebook | `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` | `http://localhost:3000/api/accounts/oauth/facebook/callback` |
| Instagram | `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` | `http://localhost:3000/api/accounts/oauth/instagram/callback` |
| YouTube | `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET` | `http://localhost:3000/api/accounts/oauth/youtube/callback` |
| TikTok | `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` | `http://localhost:3000/api/accounts/oauth/tiktok/callback` |
| Pinterest | `PINTEREST_CLIENT_ID`, `PINTEREST_CLIENT_SECRET` | `http://localhost:3000/api/accounts/oauth/pinterest/callback` |

Production callback URLs must use your deployed domain instead of localhost, for example `https://your-domain.com/api/accounts/oauth/twitter/callback`.

Notes:
- Facebook and Instagram use the same Meta app credentials. Instagram publishing usually requires an Instagram Business account connected to a Facebook Page.
- LinkedIn, Meta, TikTok, and Pinterest may require app review before real publishing permissions work for non-test users.
- YouTube requires the YouTube Data API v3 to be enabled in Google Cloud.
- AI post generation and rewriting require `GEMINI_API_KEY`.

## Background Jobs

Three main queues handle background processing:
1. **Post Scheduler** - Publishes scheduled posts to social platforms
2. **Comment Processor** - Processes incoming comments
3. **Auto Reply** - Generates AI-powered replies

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Environment Variables for Production

Make sure to set all required environment variables in your hosting platform.

## License

MIT
