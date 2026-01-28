# MRKTCMD

AI-powered marketing automation platform for small businesses. Command your marketing with AI-generated content, automated video creation, and multi-platform social media publishing.

## Features

- **AI Content Generation** - Generate marketing copy, blog posts, and social captions
- **Video Automation** - Auto-generate promo videos, product demos, and feature announcements
- **GitHub Integration** - Automatically create feature announcement videos from releases
- **Social Publishing** - Publish to LinkedIn, Twitter, TikTok, and Instagram
- **Multi-tenant** - Full organization support with role-based access

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TailwindCSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Video Rendering**: Remotion (self-hosted on Render.com)
- **AI**: Vercel AI Gateway
- **State Management**: Zustand + TanStack Query

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- Supabase account
- Vercel AI Gateway API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/mrktcmd.git
cd mrktcmd
```

2. Install dependencies:
```bash
npm install
```

3. Copy the environment template:
```bash
cp .env.example .env.local
```

4. Fill in your environment variables in `.env.local`

5. Set up Supabase:
```bash
# Link to your Supabase project
npx supabase link --project-ref your-project-ref

# Apply migrations
npx supabase db push
```

6. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
mrktcmd/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (dashboard)/        # Protected dashboard routes
│   │   ├── api/                # API routes
│   │   ├── login/              # Auth pages
│   │   └── signup/
│   ├── components/             # React components
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── dashboard/          # Dashboard-specific components
│   │   └── video/              # Video-related components
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Utility functions and configs
│   │   ├── supabase/           # Supabase client configuration
│   │   └── ai/                 # AI Gateway utilities
│   ├── remotion/               # Remotion video templates
│   │   └── templates/          # Video template components
│   ├── stores/                 # Zustand stores
│   └── types/                  # TypeScript type definitions
├── supabase/
│   ├── functions/              # Edge Functions
│   └── migrations/             # Database migrations
├── render-server/              # Self-hosted render server
└── public/                     # Static assets
```

## Video Templates

MRKTCMD includes several pre-built video templates:

1. **Feature Announcement** - Announce new features with animated text and icons
2. **Product Showcase** - Showcase your product with dynamic visuals
3. **Social Promo** - Short promotional video for social media (1:1 aspect ratio)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway API key |
| `GITHUB_APP_ID` | GitHub App ID |
| `GITHUB_CLIENT_ID` | GitHub OAuth Client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth Client Secret |
| `GITHUB_WEBHOOK_SECRET` | GitHub webhook secret |

## Deployment

### Vercel (Frontend)

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables
4. Deploy

### Render.com (Video Rendering)

See `render-server/README.md` for deployment instructions.

### Supabase Edge Functions

```bash
npx supabase functions deploy render-video
npx supabase functions deploy ai-generate
npx supabase functions deploy github-webhook
npx supabase functions deploy process-github-event
npx supabase functions deploy social-publish
```

## License

MIT
