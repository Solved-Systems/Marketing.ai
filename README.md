# VideoForge

AI-Powered Video Creation Platform for automated video creation from product assets, with GitHub integration for feature announcement videos and multi-platform social media publishing.

## Features

- **AI Video Generation**: Describe your video and let AI generate scripts, scenes, and animations
- **GitHub Integration**: Automatically create feature announcement videos from releases and commits
- **Social Publishing**: Publish to LinkedIn, Twitter, TikTok, and Instagram
- **Remotion Rendering**: Professional video rendering with Remotion Lambda

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TailwindCSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Video Rendering**: Remotion Lambda (AWS)
- **AI**: Anthropic Claude API
- **State Management**: Zustand + TanStack Query

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Supabase account
- AWS account (for Remotion Lambda)
- Anthropic API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/videoforge.git
cd videoforge
```

2. Install dependencies:
```bash
pnpm install
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

6. Deploy Remotion Lambda (optional, for video rendering):
```bash
# Deploy Lambda function
npx remotion lambda functions deploy

# Create site
pnpm run remotion:lambda:deploy
```

7. Start the development server:
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
videoforge/
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
│   │   └── supabase/           # Supabase client configuration
│   ├── remotion/               # Remotion video templates
│   │   └── templates/          # Video template components
│   ├── stores/                 # Zustand stores
│   └── types/                  # TypeScript type definitions
├── supabase/
│   ├── functions/              # Edge Functions
│   └── migrations/             # Database migrations
└── public/                     # Static assets
```

## Video Templates

VideoForge includes several pre-built video templates:

1. **Feature Announcement** - Announce new features with animated text and icons
2. **Product Showcase** - Showcase your product with dynamic visuals
3. **Social Promo** - Short promotional video for social media (1:1 aspect ratio)

### Creating Custom Templates

Templates are Remotion compositions. Create a new template in `src/remotion/templates/`:

```tsx
import { z } from 'zod'
import { AbsoluteFill, useCurrentFrame } from 'remotion'

export const myTemplateSchema = z.object({
  title: z.string(),
  // ... your props
})

export const MyTemplate: React.FC<z.infer<typeof myTemplateSchema>> = (props) => {
  const frame = useCurrentFrame()
  // ... your template
}
```

Register it in `src/remotion/Root.tsx` and add it to the database.

## API Reference

### Edge Functions

- `POST /functions/v1/render-video` - Start video rendering
- `POST /functions/v1/ai-generate` - Generate video content with AI
- `POST /functions/v1/github-webhook` - GitHub webhook handler
- `POST /functions/v1/social-publish` - Publish video to social media

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude |
| `GITHUB_APP_ID` | GitHub App ID |
| `GITHUB_CLIENT_ID` | GitHub OAuth Client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth Client Secret |
| `GITHUB_WEBHOOK_SECRET` | GitHub webhook secret |
| `AWS_ACCESS_KEY_ID` | AWS access key for Remotion Lambda |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `REMOTION_FUNCTION_NAME` | Remotion Lambda function name |
| `REMOTION_SITE_URL` | Remotion site URL on S3 |

## Deployment

### Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables
4. Deploy

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
