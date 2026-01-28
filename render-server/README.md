# VideoForge Render Server

Self-hosted video rendering server using Remotion, designed for deployment on Render.com.

## Deployment to Render.com

### 1. Create Render Account
Go to [render.com](https://render.com) and sign up with GitHub.

### 2. Create New Web Service
1. Click **New** → **Web Service**
2. Connect your GitHub repo
3. Configure:
   - **Name**: `videoforge-render`
   - **Root Directory**: `render-server`
   - **Runtime**: Docker
   - **Instance Type**: Starter ($7/mo) or Standard ($25/mo) for faster renders

### 3. Set Environment Variables
In the Render dashboard, add:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (from Project Settings → API)

### 4. Deploy
Render will automatically build and deploy from your repo.

### 5. Update Supabase
Add the Render server URL to your Supabase Edge Function secrets:
```bash
npx supabase secrets set RENDER_SERVER_URL=https://videoforge-render.onrender.com
```

## Local Development

```bash
# Install dependencies
npm install

# Copy environment variables
cp ../.env.example .env
# Edit .env with your Supabase credentials

# Run development server
npm run dev
```

## API Endpoints

### `GET /health`
Health check endpoint.

### `POST /render`
Start a video render job.

**Request body:**
```json
{
  "jobId": "uuid",
  "compositionId": "FeatureAnnouncement",
  "inputProps": { ... }
}
```

## Available Compositions

- `FeatureAnnouncement` - 1920x1080, 10 seconds
- `ProductShowcase` - 1920x1080, 15 seconds
- `SocialPromo` - 1080x1080, 5 seconds (square)

## Resource Requirements

Video rendering is CPU/memory intensive. Recommended:
- **Minimum**: 512MB RAM, 0.5 CPU (Render Starter)
- **Recommended**: 2GB RAM, 1 CPU (Render Standard)
