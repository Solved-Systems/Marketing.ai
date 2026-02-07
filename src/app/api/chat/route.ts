import { streamText, convertToModelMessages, stepCountIs } from 'ai'
import { createGateway } from '@ai-sdk/gateway'
import { z } from 'zod'
import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { startLambdaRender, checkLambdaProgress } from '@/lib/remotion/lambda'
import {
  generateGrokImages,
  generateOpenAIImages,
  generateImagenImages,
  editImageWithDallE,
  EDIT_PRESETS,
} from '@/lib/images/generate'
import { fetchGitHubRepoInfo, fetchGitHubActivity, fetchGitHubFile } from '@/lib/github/api'
import { startGrokVideo, checkGrokVideoStatus } from '@/lib/video/grok'
import { getCompositionId, pollLambdaCompletion } from '@/lib/video/remotion-helpers'

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

    const accessToken = session.accessToken as string

    const supabase = createAdminClient()
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single()

    const { messages: rawMessages, brandId } = await request.json()
    const messages = await convertToModelMessages(rawMessages)

    // Fetch brand context
    let brandContext = ''
    let brandName = ''
    if (brandId && user) {
      const { data: brand } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .eq('user_id', user.id)
        .single()

      if (brand) {
        brandName = brand.name
        brandContext = `
ACTIVE BRAND: "${brand.name}"
- Description: ${brand.description || 'Not set'}
- Tagline: ${brand.tagline || 'Not set'}
- Colors: primary=${brand.primary_color || 'none'}, secondary=${brand.secondary_color || 'none'}, accent=${brand.accent_color || 'none'}
- Logo: ${brand.logo_url || 'Not uploaded'}
- GitHub Repo: ${brand.github_repo || 'Not connected'}
- Website: ${brand.website_url || 'Not set'}

Always incorporate the brand's identity into generated content.`
      }
    }

    const gateway = getGateway()
    const result = streamText({
      model: gateway('anthropic/claude-sonnet-4-20250514'),
      system: `You are MRKT, an AI marketing agent that creates visual content for brands. You operate like an MCP (Model Context Protocol) server — you have tools to generate images, edit images, create videos (both AI-animated and template-based), analyze GitHub repos, and read code files.

${brandContext}

## Image Providers:
- **Grok** (default): Fast, creative, great for marketing visuals and stylized content. Best all-rounder.
- **OpenAI** (GPT-5.2): Photorealistic quality via AI Gateway. Falls back to Imagen if needed. Best for realistic product shots.
- **Imagen** (Google Imagen 4.0): High quality via AI Gateway. Great for clean, professional imagery.
- **DALL-E 2 Edit**: Edit/transform existing images — change style, remove backgrounds, enhance quality.

## Video Engines:
- **Grok Imagine** (generate_video): AI-powered video from text or image animation. Short-form (1-15s). Great for social clips and animations.
- **Remotion Lambda** (generate_remotion_video): Template-based branded videos. 15/30/60 second durations. Templates: feature announcement, product demo, social teaser, release notes. Great for polished marketing videos.

## How you work:
1. When the user asks for images, use generate_image immediately. Write rich, detailed prompts. Always generate at least 2 images. Choose the best provider for the use case, or use grok by default.
2. When a GitHub repo is mentioned, use analyze_repo to understand it deeply — read the README, topics, description. Then use get_repo_activity to find recent PRs/commits for marketing angles.
3. Use read_repo_file to read specific code files when you need more context (e.g., landing page copy, component structure, API endpoints).
4. For short AI-animated videos, use generate_video. You can animate previously generated images by passing their URL.
5. For polished branded videos, use generate_remotion_video. Use check_remotion_status to poll progress. Pass a heroImageUrl from a previous image generation for richer results.
6. Use edit_image to refine generated images — apply style transfers, remove backgrounds, or enhance quality.
7. After generating content, suggest marketing copy, social post ideas, or next steps.

## Cross-provider workflows:
- Generate with OpenAI → animate with Grok video (pass imageUrl)
- Generate with Grok → edit/restyle with DALL-E 2 (pass imageUrl to edit_image)
- Generate with any provider → use as heroImageUrl in Remotion composition
- Analyze repo → generate images → create Remotion video with hero image

## Agent behavior:
- Think step-by-step: analyze the request, gather context, then create
- Chain tools when needed (e.g., analyze repo → read key files → generate images → create video)
- Be direct and action-oriented — start creating immediately, don't ask "would you like me to..."
- Reference specific repo features, code, and commits when creating marketing content
- Describe generated images/videos briefly after they appear

## Content quality:
- Image prompts should be detailed, specifying style, composition, colors, mood
- Use the brand's color scheme and identity in all generated content
- Marketing content should be authentic and highlight real features`,
      messages,
      stopWhen: stepCountIs(8),
      tools: {
        generate_image: {
          description:
            'Generate marketing images with AI. Supports multiple providers: grok (fast, creative), openai (GPT-5.2, photorealistic, falls back to Imagen), imagen (Google Imagen 4.0, high quality). Use detailed, creative prompts that specify style, composition, colors, and mood.',
          inputSchema: z.object({
            prompt: z.string().describe('Detailed image description including style, composition, colors, mood, and subject'),
            n: z.number().min(1).max(4).default(2).describe('Number of images (1-4)'),
            provider: z.enum(['grok', 'openai', 'imagen']).default('grok').describe('Image provider: grok (default, fast), openai (GPT-5.2 photorealistic), imagen (Google Imagen 4.0)'),
          }),
          execute: async ({ prompt, n, provider }: { prompt: string; n: number; provider: 'grok' | 'openai' | 'imagen' }) => {
            try {
              const gatewayKey = process.env.AI_GATEWAY_API_KEY
              let images: { url: string }[]

              if (provider === 'openai') {
                if (!gatewayKey) throw new Error('AI_GATEWAY_API_KEY not configured')
                images = await generateOpenAIImages(gatewayKey, prompt, n)
              } else if (provider === 'imagen') {
                if (!gatewayKey) throw new Error('AI_GATEWAY_API_KEY not configured')
                images = await generateImagenImages(gatewayKey, prompt, n)
              } else {
                images = await generateGrokImages(prompt, n)
              }

              return {
                success: true,
                images,
                prompt,
                provider,
                count: images.length,
              }
            } catch (error) {
              return { success: false, error: String(error), images: [] }
            }
          },
        },

        edit_image: {
          description:
            'Edit an existing image using DALL-E 2. Can apply style transformations, enhance quality, remove backgrounds, or make custom edits. Use on previously generated images to refine them.',
          inputSchema: z.object({
            prompt: z.string().describe('Editing instruction describing the desired change'),
            imageUrl: z.string().describe('URL of the image to edit (from a previous generation)'),
            preset: z.enum(['remove_background', 'enhance', 'style_oil', 'style_watercolor', 'style_sketch']).optional().describe('Quick edit preset (overrides prompt)'),
            n: z.number().min(1).max(4).default(1).describe('Number of edit variations (1-4)'),
          }),
          execute: async ({ prompt, imageUrl, preset, n }: { prompt: string; imageUrl: string; preset?: string; n: number }) => {
            try {
              const gatewayKey = process.env.AI_GATEWAY_API_KEY
              if (!gatewayKey) throw new Error('AI_GATEWAY_API_KEY not configured')

              const editPrompt = (preset && EDIT_PRESETS[preset]) || prompt
              const images = await editImageWithDallE(gatewayKey, imageUrl, editPrompt, n)

              return {
                success: true,
                images,
                prompt: editPrompt,
                provider: 'dall-e-2',
                preset: preset || null,
                count: images.length,
              }
            } catch (error) {
              return { success: false, error: String(error), images: [] }
            }
          },
        },

        generate_video: {
          description:
            'Generate or animate video content using Grok Imagine. Can create videos from text prompts or animate existing images.',
          inputSchema: z.object({
            prompt: z.string().describe('Description of the video motion/animation'),
            imageUrl: z.string().optional().describe('URL of an image to animate into video'),
            duration: z.number().min(1).max(15).default(5).describe('Duration in seconds'),
            aspectRatio: z.enum(['16:9', '9:16', '1:1']).default('16:9').describe('Aspect ratio'),
          }),
          execute: async ({
            prompt,
            imageUrl,
            duration,
            aspectRatio,
          }: {
            prompt: string
            imageUrl?: string
            duration: number
            aspectRatio: '16:9' | '9:16' | '1:1'
          }) => {
            try {
              if (!user) return { success: false, error: 'User not found', status: 'failed' }

              const { requestId } = await startGrokVideo({ prompt, imageUrl, duration, aspectRatio })

              // Store in database if we have a brand
              let videoId = `vid-${Date.now()}`
              if (brandId) {
                const { data: video } = await supabase
                  .from('videos')
                  .insert({
                    user_id: user.id,
                    brand_id: brandId,
                    title: prompt.slice(0, 100),
                    description: prompt,
                    prompt,
                    template: 'social',
                    duration,
                    style: 'Modern',
                    call_to_action: '',
                    features: [],
                    engine: 'grok-imagine',
                    status: 'processing',
                    quality: 'default',
                    aspect_ratio: aspectRatio,
                    resolution: '720p',
                    primary_color: '#f97316',
                    secondary_color: '#ea580c',
                    accent_color: '#22c55e',
                    brand_name: brandName,
                    external_request_id: requestId,
                  })
                  .select('id')
                  .single()

                if (video) videoId = video.id
              }

              return {
                success: true,
                videoId,
                requestId,
                status: 'processing',
                message: 'Video generation started. It typically takes 1-2 minutes.',
              }
            } catch (error) {
              return { success: false, error: String(error), status: 'failed' }
            }
          },
        },

        check_video_status: {
          description: 'Check the status of a video being generated. Call this when a video was previously started.',
          inputSchema: z.object({
            requestId: z.string().describe('The xAI request ID from generate_video'),
          }),
          execute: async ({ requestId }: { requestId: string }) => {
            try {
              return await checkGrokVideoStatus(requestId)
            } catch (error) {
              return { status: 'error', error: String(error) }
            }
          },
        },

        generate_remotion_video: {
          description:
            'Generate a branded marketing video using Remotion templates rendered on AWS Lambda. Great for feature announcements, product demos, social teasers, and release notes. Can use a previously generated image as the hero visual.',
          inputSchema: z.object({
            template: z.enum(['feature', 'product', 'social', 'release']).describe('Video template: feature (announcement), product (demo), social (teaser), release (notes)'),
            title: z.string().describe('Video title/headline'),
            description: z.string().describe('Short description or subtitle'),
            features: z.array(z.string()).describe('Bullet point features or highlights'),
            callToAction: z.string().default('Learn More').describe('CTA button text'),
            duration: z.enum(['15', '30', '60']).default('30').describe('Video duration in seconds'),
            style: z.enum(['Modern', 'Minimal', 'Bold', 'Playful']).default('Modern').describe('Visual style'),
            heroImageUrl: z.string().optional().describe('URL of an image to use as hero visual (from a previous generation)'),
          }),
          execute: async ({
            template,
            title,
            description,
            features,
            callToAction,
            duration,
            style,
            heroImageUrl,
          }: {
            template: string
            title: string
            description: string
            features: string[]
            callToAction: string
            duration: string
            style: string
            heroImageUrl?: string
          }) => {
            try {
              if (!user) return { success: false, error: 'User not found', status: 'failed' }

              // Fetch brand for colors
              let primaryColor = '#6366f1'
              let secondaryColor = '#8b5cf6'
              let accentColor = '#22c55e'

              if (brandId) {
                const { data: brand } = await supabase
                  .from('brands')
                  .select('primary_color, secondary_color, accent_color, name')
                  .eq('id', brandId)
                  .eq('user_id', user.id)
                  .single()

                if (brand) {
                  primaryColor = brand.primary_color || primaryColor
                  secondaryColor = brand.secondary_color || secondaryColor
                  accentColor = brand.accent_color || accentColor
                }
              }

              const compositionId = getCompositionId(template, duration)
              const inputProps: Record<string, unknown> = {
                title,
                description,
                features,
                callToAction: callToAction || 'Learn More',
                primaryColor,
                secondaryColor,
                accentColor,
                brandName: brandName || 'Brand',
                style,
              }
              if (heroImageUrl) {
                inputProps.heroImageUrl = heroImageUrl
              }

              const { renderId, bucketName } = await startLambdaRender(compositionId, inputProps)

              // Store in videos table
              let videoId = `vid-${Date.now()}`
              if (brandId) {
                const { data: video } = await supabase
                  .from('videos')
                  .insert({
                    user_id: user.id,
                    brand_id: brandId,
                    title,
                    description,
                    prompt: `${template}: ${title}`,
                    template,
                    duration: `${duration} seconds`,
                    style,
                    call_to_action: callToAction,
                    features,
                    engine: 'remotion-lambda',
                    status: 'processing',
                    quality: 'default',
                    primary_color: primaryColor,
                    secondary_color: secondaryColor,
                    accent_color: accentColor,
                    brand_name: brandName,
                    render_id: renderId,
                    render_bucket: bucketName,
                  })
                  .select('id')
                  .single()

                if (video) videoId = video.id
              }

              // Start background polling
              pollLambdaCompletion(videoId, renderId, bucketName).catch(err => {
                console.error('Lambda polling error:', err)
              })

              return {
                success: true,
                videoId,
                renderId,
                status: 'rendering',
                template,
                duration: `${duration}s`,
                message: 'Remotion video render started. Typically takes 30-90 seconds.',
              }
            } catch (error) {
              return { success: false, error: String(error), status: 'failed' }
            }
          },
        },

        check_remotion_status: {
          description:
            'Check the status of a Remotion video render. Returns progress percentage and output URL when done.',
          inputSchema: z.object({
            videoId: z.string().describe('The video ID from generate_remotion_video'),
          }),
          execute: async ({ videoId }: { videoId: string }) => {
            try {
              const { data: video } = await supabase
                .from('videos')
                .select('status, output_url, render_id, render_bucket, error_message')
                .eq('id', videoId)
                .single()

              if (!video) return { status: 'not_found', error: 'Video not found' }

              if (video.status === 'completed' && video.output_url) {
                return {
                  status: 'completed',
                  outputUrl: video.output_url,
                  message: 'Video is ready!',
                }
              }

              if (video.status === 'failed') {
                return { status: 'failed', error: video.error_message || 'Render failed' }
              }

              // Check live progress if still processing
              if (video.render_id && video.render_bucket) {
                try {
                  const progress = await checkLambdaProgress(video.render_id, video.render_bucket)
                  return {
                    status: 'rendering',
                    progress: progress.progress,
                    message: `Rendering... ${progress.progress}% complete`,
                  }
                } catch {
                  // Fall through
                }
              }

              return { status: 'processing', message: 'Still rendering...' }
            } catch (error) {
              return { status: 'error', error: String(error) }
            }
          },
        },

        analyze_repo: {
          description:
            'Analyze a GitHub repository — fetches metadata, README, package.json, stars, topics. Use this to understand a project before creating marketing content.',
          inputSchema: z.object({
            owner: z.string().describe('Repository owner/organization'),
            repo: z.string().describe('Repository name'),
          }),
          execute: async ({ owner, repo }: { owner: string; repo: string }) => {
            try {
              return await fetchGitHubRepoInfo(accessToken, owner, repo)
            } catch (error) {
              return { error: String(error) }
            }
          },
        },

        get_repo_activity: {
          description:
            'Get recent GitHub activity — merged PRs and commits. Use this to find marketing angles from recent development work.',
          inputSchema: z.object({
            owner: z.string().describe('Repository owner'),
            repo: z.string().describe('Repository name'),
          }),
          execute: async ({ owner, repo }: { owner: string; repo: string }) => {
            try {
              return await fetchGitHubActivity(accessToken, owner, repo)
            } catch (error) {
              return { error: String(error) }
            }
          },
        },

        read_repo_file: {
          description:
            'Read a specific file or list a directory from a GitHub repository. Use this to read source code, configs, or explore the repo structure for marketing context.',
          inputSchema: z.object({
            owner: z.string().describe('Repository owner'),
            repo: z.string().describe('Repository name'),
            path: z.string().describe('File or directory path (e.g., "src/app/page.tsx", "README.md", "src/components")'),
          }),
          execute: async ({ owner, repo, path }: { owner: string; repo: string; path: string }) => {
            try {
              return await fetchGitHubFile(accessToken, owner, repo, path)
            } catch (error) {
              return { error: String(error) }
            }
          },
        },
      },
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error('Chat API error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
