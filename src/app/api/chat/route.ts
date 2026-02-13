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

function toToolError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : String(error)
  return {
    error: fallback,
    details: message.slice(0, 180),
  }
}

function clampText(value: string, max: number) {
  if (value.length <= max) return value
  return `${value.slice(0, max)}\n...(truncated)`
}

function compactToolOutputForContext(toolName: string, output: Record<string, unknown>) {
  if (toolName === 'analyze_repo' || toolName === 'analyze_github_repo') {
    const packageJson = output.packageJson && typeof output.packageJson === 'object'
      ? (output.packageJson as Record<string, unknown>)
      : undefined

    const dependencies = Array.isArray(packageJson?.dependencies)
      ? (packageJson?.dependencies as string[])
      : []
    const devDependencies = Array.isArray(packageJson?.devDependencies)
      ? (packageJson?.devDependencies as string[])
      : []

    return {
      name: output.name,
      fullName: output.fullName,
      description: typeof output.description === 'string' ? clampText(output.description, 240) : output.description,
      stars: output.stars,
      forks: output.forks,
      watchers: output.watchers,
      language: output.language,
      topics: Array.isArray(output.topics) ? (output.topics as string[]).slice(0, 8) : [],
      url: output.url,
      homepage: output.homepage,
      readme: typeof output.readme === 'string' ? clampText(output.readme, 700) : undefined,
      packageJson: packageJson
        ? {
            name: packageJson.name,
            description: packageJson.description,
            dependencies: dependencies.slice(0, 10),
            dependencyCount: dependencies.length,
            devDependencies: devDependencies.slice(0, 6),
            devDependencyCount: devDependencies.length,
          }
        : undefined,
      error: output.error,
      details: output.details,
    }
  }

  if (toolName === 'get_repo_activity') {
    const mergedPRs = Array.isArray(output.mergedPRs) ? (output.mergedPRs as Array<Record<string, unknown>>) : []
    const recentCommits = Array.isArray(output.recentCommits) ? (output.recentCommits as Array<Record<string, unknown>>) : []

    return {
      mergedPRs: mergedPRs.slice(0, 4).map((pr) => ({
        number: pr.number,
        title: typeof pr.title === 'string' ? clampText(pr.title, 120) : pr.title,
        author: pr.author,
        mergedAt: pr.mergedAt,
        url: pr.url,
      })),
      recentCommits: recentCommits.slice(0, 5).map((commit) => ({
        sha: commit.sha,
        message: typeof commit.message === 'string' ? clampText(commit.message, 120) : commit.message,
        date: commit.date,
        author: commit.author,
      })),
      error: output.error,
      details: output.details,
    }
  }

  if (toolName === 'read_repo_file') {
    const path = typeof output.path === 'string' ? output.path : ''
    const content = typeof output.content === 'string' ? output.content : ''
    const entries = Array.isArray(output.entries) ? (output.entries as Array<Record<string, unknown>>) : null

    if (entries) {
      return {
        path,
        type: output.type || 'directory',
        entries: entries.slice(0, 30).map((entry) => ({
          name: entry.name,
          type: entry.type,
          size: entry.size,
          path: entry.path,
        })),
        entryCount: entries.length,
        error: output.error,
        details: output.details,
      }
    }

    return {
      path,
      size: output.size,
      lineCount: content ? content.split('\n').length : 0,
      content: content ? clampText(content, 1800) : undefined,
      error: output.error,
      details: output.details,
    }
  }

  if (toolName === 'generate_image' || toolName === 'edit_image') {
    const images = Array.isArray(output.images) ? (output.images as Array<Record<string, unknown>>) : []
    return {
      success: output.success,
      provider: output.provider,
      prompt: typeof output.prompt === 'string' ? clampText(output.prompt, 300) : output.prompt,
      count: output.count || images.length,
      images: images.slice(0, 2).map((image) => ({ url: image.url })),
      error: output.error,
      details: output.details,
    }
  }

  const compacted: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(output)) {
    if (typeof value === 'string') {
      compacted[key] = clampText(value, 400)
      continue
    }
    if (Array.isArray(value)) {
      compacted[key] = value.slice(0, 5)
      continue
    }
    if (value && typeof value === 'object') {
      // Recursively clamp nested objects
      const nested = JSON.stringify(value)
      if (nested.length > 600) {
        compacted[key] = clampText(nested, 600)
        continue
      }
    }
    compacted[key] = value
  }

  return compacted
}

function compactMessagesForModel(rawMessages: unknown) {
  if (!Array.isArray(rawMessages)) return []

  return rawMessages.map((raw) => {
    if (!raw || typeof raw !== 'object') return raw
    const message = { ...(raw as Record<string, unknown>) }

    if (typeof message.content === 'string') {
      message.content = clampText(message.content, 1200)
    }

    if (Array.isArray(message.parts)) {
      message.parts = message.parts.map((part) => {
        if (!part || typeof part !== 'object') return part
        const nextPart = { ...(part as Record<string, unknown>) }

        if (typeof nextPart.text === 'string') {
          nextPart.text = clampText(nextPart.text, 1200)
        }

        if (nextPart.input && typeof nextPart.input === 'object') {
          nextPart.input = compactToolOutputForContext('', nextPart.input as Record<string, unknown>)
        }

        const rawType = typeof nextPart.type === 'string' ? nextPart.type : ''
        const toolName = rawType.startsWith('tool-')
          ? rawType.slice(5)
          : (typeof nextPart.toolName === 'string' ? nextPart.toolName : '')

        if (nextPart.output && typeof nextPart.output === 'object' && toolName) {
          nextPart.output = compactToolOutputForContext(toolName, nextPart.output as Record<string, unknown>)
        } else if (nextPart.output && typeof nextPart.output === 'object') {
          nextPart.output = compactToolOutputForContext('', nextPart.output as Record<string, unknown>)
        }

        if (typeof nextPart.errorText === 'string') {
          nextPart.errorText = clampText(nextPart.errorText, 220)
        }

        return nextPart
      })
    }

    return message
  })
}

/**
 * Hard character budget for the messages payload.
 * Keep this conservative because system prompt + tool schemas add significant overhead.
 * 240K chars of compacted JSON typically leaves enough headroom for model/tool context.
 */
const MAX_MESSAGE_CHARS = 240_000

function messageCharSize(message: Record<string, unknown>): number {
  return JSON.stringify(message).length
}

/**
 * Trims conversation history to fit within a hard character budget.
 * Keeps the most recent messages, drops oldest when over budget.
 */
function trimMessages<T extends Record<string, unknown>>(messages: T[]): T[] {
  if (messages.length === 0) return messages

  // Compute sizes for each message
  const sizes = messages.map((msg) => messageCharSize(msg))
  const totalChars = sizes.reduce((sum, s) => sum + s, 0)

  if (totalChars <= MAX_MESSAGE_CHARS) return messages

  // Keep the most recent messages that fit in budget
  const trimmed: T[] = []
  let budget = MAX_MESSAGE_CHARS

  for (let i = messages.length - 1; i >= 0; i--) {
    if (sizes[i] > budget && trimmed.length > 0) break
    if (sizes[i] > budget && trimmed.length === 0) {
      // Single giant message: keep it, but hard-clamp content fields.
      const giant = { ...(messages[i] as Record<string, unknown>) }
      if (typeof giant.content === 'string') {
        giant.content = clampText(giant.content, Math.max(800, Math.floor(MAX_MESSAGE_CHARS * 0.3)))
      }
      trimmed.unshift(giant as T)
      break
    }
    budget -= sizes[i]
    trimmed.unshift(messages[i])
  }

  // Final safety: if even the kept messages are too large (single giant message),
  // still return them but they'll be caught by the per-message compaction
  return trimmed
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
    const rawCount = Array.isArray(rawMessages) ? rawMessages.length : 0
    const compactedRaw = compactMessagesForModel(rawMessages)
    const trimmedRaw = trimMessages(compactedRaw as Record<string, unknown>[])

    if (trimmedRaw.length < rawCount) {
      console.log(`[chat] Trimmed conversation: ${rawCount} → ${trimmedRaw.length} messages (budget: ${MAX_MESSAGE_CHARS} chars)`)
    }

    const messages = await convertToModelMessages(trimmedRaw)

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
- Use tools silently. Do NOT narrate each step (avoid "let me...", "now I will...", etc.)
- Chain tools when needed (e.g., analyze repo → read key files → generate images → create video)
- For repo exploration, prefer breadth first and keep reads tight: list dirs once, then read at most 3 high-signal files unless user asks for more depth
- Use at most 5 tool calls per request unless the user explicitly asks for deeper analysis
- Be direct and action-oriented — start creating immediately, don't ask "would you like me to..."
- Reference specific repo features, code, and commits when creating marketing content
- When a tool call fails, recover internally (try alternate path) and mention only actionable outcomes in the final response

## Content quality:
- Image prompts should be detailed, specifying style, composition, colors, mood
- Use the brand's color scheme and identity in all generated content
- Marketing content should be authentic and highlight real features

## Response format (required for marketing deliverables):
Lead with final deliverables first, then optional explanation.
When generating a marketing post, use this exact markdown shape so UI can render cards:

## Marketing Post #<n>
**Platform:** <platform>
**Visual:** <short visual direction>
**Copy:**
\`\`\`
<post copy text>
\`\`\`

### Why This Post Works
- <bullet>
- <bullet>

If assets were generated, include:
- **Asset options:** short label + direct URL list.

Keep final response concise and avoid exposing raw tool/debug output.`,
      messages,
      stopWhen: stepCountIs(6),
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
              const raw = await fetchGitHubRepoInfo(accessToken, owner, repo)
              return compactToolOutputForContext('analyze_repo', raw as Record<string, unknown>)
            } catch (error) {
              return toToolError(error, `Unable to analyze ${owner}/${repo}`)
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
              const raw = await fetchGitHubActivity(accessToken, owner, repo)
              return compactToolOutputForContext('get_repo_activity', raw as Record<string, unknown>)
            } catch (error) {
              return toToolError(error, `Unable to fetch recent activity for ${owner}/${repo}`)
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
              const raw = await fetchGitHubFile(accessToken, owner, repo, path)
              return compactToolOutputForContext('read_repo_file', raw as Record<string, unknown>)
            } catch (error) {
              return {
                ...toToolError(error, `Unable to read ${path}`),
                path,
              }
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
