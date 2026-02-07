import { streamText } from 'ai'
import { createGateway } from '@ai-sdk/gateway'
import { z } from 'zod'
import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'

// Initialize gateway
function getGateway() {
  const apiKey = process.env.AI_GATEWAY_API_KEY
  if (!apiKey) throw new Error('AI_GATEWAY_API_KEY not configured')
  return createGateway({ apiKey })
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get user's brand context if available
    const supabase = createAdminClient()
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single()

    const { messages, brandId } = await request.json()

    // Fetch brand context if provided
    let brandContext = ''
    if (brandId && user) {
      const { data: brand } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .eq('user_id', user.id)
        .single()

      if (brand) {
        brandContext = `
Current brand context:
- Name: ${brand.name}
- Description: ${brand.description || 'Not set'}
- Tagline: ${brand.tagline || 'Not set'}
- Primary Color: ${brand.primary_color || 'Not set'}
- Secondary Color: ${brand.secondary_color || 'Not set'}
- Logo URL: ${brand.logo_url || 'Not set'}

Use this brand information when generating content.`
      }
    }

    const gateway = getGateway()

    const result = streamText({
      model: gateway('anthropic/claude-sonnet-4-20250514'),
      system: `You are an AI marketing assistant that helps create visual content. You have access to powerful tools for generating images, videos, and analyzing GitHub repos.

${brandContext}

Guidelines:
- When asked to create images, use the generate_image tool with detailed, creative prompts
- When asked to create videos or animate images, use the generate_video tool
- When a GitHub repo is mentioned, use analyze_github_repo to get insights
- Always explain what you're doing before using tools
- After generating content, describe what was created and offer suggestions
- Be conversational and helpful
- Keep responses concise but informative`,
      messages,
      tools: {
        generate_image: {
          description: 'Generate marketing images using AI. Use this when the user wants to create images, graphics, social media visuals, or any visual content.',
          inputSchema: z.object({
            prompt: z.string().describe('Detailed description of the image to generate'),
            n: z.number().min(1).max(4).default(2).describe('Number of images to generate'),
            provider: z.enum(['grok', 'openai']).default('grok').describe('Image generation provider'),
          }),
          execute: async ({ prompt, n, provider }: { prompt: string; n: number; provider: 'grok' | 'openai' }) => {
            const endpoint = provider === 'grok' ? '/api/images/generate-grok' : '/api/images/generate-openai'
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

            try {
              const response = await fetch(`${baseUrl}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, n }),
              })

              const data = await response.json()
              if (!response.ok) {
                return { error: data.error || 'Image generation failed', images: [] }
              }

              return { images: data.images || [], prompt, provider }
            } catch (error) {
              return { error: String(error), images: [] }
            }
          },
        },
        generate_video: {
          description: 'Generate or animate video content. Use this when the user wants to create a video, animate an image, or produce motion content.',
          inputSchema: z.object({
            prompt: z.string().describe('Description of the video motion/animation desired'),
            imageUrl: z.string().optional().describe('URL of an image to animate'),
            duration: z.number().min(1).max(15).default(5).describe('Video duration in seconds'),
            aspectRatio: z.enum(['16:9', '9:16', '1:1']).default('16:9').describe('Video aspect ratio'),
          }),
          execute: async ({ prompt, imageUrl, duration, aspectRatio }: { prompt: string; imageUrl?: string; duration: number; aspectRatio: string }) => {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

            try {
              const response = await fetch(`${baseUrl}/api/videos/generate-grok`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, imageUrl, duration, aspectRatio, template: 'social' }),
              })

              const data = await response.json()
              if (!response.ok) {
                return { error: data.error || 'Video generation failed', status: 'failed' }
              }

              return {
                videoId: data.videoId,
                status: 'processing',
                message: 'Video generation started. It typically takes 1-3 minutes.',
              }
            } catch (error) {
              return { error: String(error), status: 'failed' }
            }
          },
        },
        check_video_status: {
          description: 'Check the status of a video being generated.',
          inputSchema: z.object({
            videoId: z.string().describe('The video ID to check'),
          }),
          execute: async ({ videoId }: { videoId: string }) => {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

            try {
              const response = await fetch(`${baseUrl}/api/videos/generate-grok?id=${videoId}`)
              const data = await response.json()

              return {
                status: data.status,
                progress: data.render_progress,
                outputUrl: data.output_url,
                error: data.error_message,
              }
            } catch (error) {
              return { error: String(error), status: 'unknown' }
            }
          },
        },
        analyze_github_repo: {
          description: 'Analyze a GitHub repository for marketing insights.',
          inputSchema: z.object({
            owner: z.string().describe('Repository owner/organization'),
            repo: z.string().describe('Repository name'),
          }),
          execute: async ({ owner, repo }: { owner: string; repo: string }) => {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

            try {
              const response = await fetch(`${baseUrl}/api/github/repo-info?owner=${owner}&repo=${repo}`)
              const data = await response.json()

              if (!response.ok) {
                return { error: data.error || 'Failed to fetch repo info' }
              }

              return {
                name: data.name,
                fullName: data.full_name,
                description: data.description,
                stars: data.stargazers_count,
                forks: data.forks_count,
                watchers: data.watchers_count,
                language: data.language,
                topics: data.topics,
                url: data.html_url,
              }
            } catch (error) {
              return { error: String(error) }
            }
          },
        },
      },
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('Chat API error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
