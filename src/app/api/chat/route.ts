import { streamText, convertToModelMessages, stepCountIs } from 'ai'
import { createGateway } from '@ai-sdk/gateway'
import { z } from 'zod'
import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getXAIClient } from '@/lib/xai/client'

const XAI_API_BASE = 'https://api.x.ai/v1'

function getGateway() {
  const apiKey = process.env.AI_GATEWAY_API_KEY
  if (!apiKey) throw new Error('AI_GATEWAY_API_KEY not configured')
  return createGateway({ apiKey })
}

// Direct Grok image generation (no internal fetch needed)
async function generateGrokImages(prompt: string, n: number = 2) {
  const apiKey = process.env.XAI_API_KEY
  if (!apiKey) throw new Error('XAI_API_KEY not configured')

  const response = await fetch(`${XAI_API_BASE}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'grok-2-image',
      prompt,
      n: Math.min(n, 4),
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `Grok API error: ${response.status}`)
  }

  const data = await response.json()
  return (
    data.data?.map((img: { url?: string; b64_json?: string }) => ({
      url: img.url || (img.b64_json ? `data:image/png;base64,${img.b64_json}` : null),
    })).filter((img: { url: string | null }) => img.url) || []
  )
}

// Direct GitHub API calls using the user's access token
async function fetchGitHubRepoInfo(accessToken: string, owner: string, repo: string) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/vnd.github.v3+json',
  }

  const fullRepo = `${owner}/${repo}`

  const [repoRes, readmeRes, pkgRes] = await Promise.all([
    fetch(`https://api.github.com/repos/${fullRepo}`, { headers }),
    fetch(`https://api.github.com/repos/${fullRepo}/readme`, { headers }).catch(() => null),
    fetch(`https://api.github.com/repos/${fullRepo}/contents/package.json`, { headers }).catch(() => null),
  ])

  if (!repoRes.ok) throw new Error(`Repo not found: ${fullRepo}`)
  const repoData = await repoRes.json()

  let readme = null
  if (readmeRes?.ok) {
    const readmeData = await readmeRes.json()
    if (readmeData.content) {
      readme = Buffer.from(readmeData.content, 'base64').toString('utf-8')
      if (readme.length > 4000) readme = readme.substring(0, 4000) + '\n...(truncated)'
    }
  }

  let packageJson = null
  if (pkgRes?.ok) {
    const pkgData = await pkgRes.json()
    if (pkgData.content) {
      try {
        packageJson = JSON.parse(Buffer.from(pkgData.content, 'base64').toString('utf-8'))
      } catch { /* ignore */ }
    }
  }

  return {
    name: repoData.name,
    fullName: repoData.full_name,
    description: repoData.description,
    stars: repoData.stargazers_count,
    forks: repoData.forks_count,
    watchers: repoData.watchers_count,
    language: repoData.language,
    topics: repoData.topics || [],
    url: repoData.html_url,
    homepage: repoData.homepage,
    readme,
    packageJson: packageJson
      ? {
          name: packageJson.name,
          description: packageJson.description,
          dependencies: Object.keys(packageJson.dependencies || {}),
          devDependencies: Object.keys(packageJson.devDependencies || {}),
        }
      : null,
  }
}

async function fetchGitHubActivity(accessToken: string, owner: string, repo: string) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/vnd.github.v3+json',
  }

  const fullRepo = `${owner}/${repo}`

  const [prsRes, commitsRes] = await Promise.all([
    fetch(`https://api.github.com/repos/${fullRepo}/pulls?state=closed&sort=updated&direction=desc&per_page=10`, { headers }),
    fetch(`https://api.github.com/repos/${fullRepo}/commits?per_page=15`, { headers }),
  ])

  const prs = prsRes.ok ? await prsRes.json() : []
  const commits = commitsRes.ok ? await commitsRes.json() : []

  return {
    mergedPRs: (Array.isArray(prs) ? prs : [])
      .filter((pr: any) => pr.merged_at)
      .slice(0, 5)
      .map((pr: any) => ({
        number: pr.number,
        title: pr.title,
        mergedAt: pr.merged_at,
        url: pr.html_url,
        author: pr.user?.login,
      })),
    recentCommits: (Array.isArray(commits) ? commits : []).slice(0, 10).map((c: any) => ({
      sha: c.sha?.substring(0, 7),
      message: c.commit?.message?.split('\n')[0],
      date: c.commit?.author?.date,
      author: c.author?.login || c.commit?.author?.name,
    })),
  }
}

async function fetchGitHubFile(accessToken: string, owner: string, repo: string, path: string) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/vnd.github.v3+json',
  }

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    { headers }
  )

  if (!response.ok) throw new Error(`File not found: ${path}`)
  const data = await response.json()

  if (data.content) {
    const content = Buffer.from(data.content, 'base64').toString('utf-8')
    return {
      path: data.path,
      size: data.size,
      content: content.length > 10000 ? content.substring(0, 10000) + '\n...(truncated)' : content,
    }
  }

  // Directory listing
  if (Array.isArray(data)) {
    return {
      path,
      type: 'directory',
      entries: data.map((item: any) => ({
        name: item.name,
        type: item.type,
        size: item.size,
        path: item.path,
      })),
    }
  }

  throw new Error('Unexpected response format')
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
      system: `You are MRKT, an AI marketing agent that creates visual content for brands. You operate like an MCP (Model Context Protocol) server — you have tools to generate images, videos, analyze GitHub repos, and read code files.

${brandContext}

## How you work:
1. When the user asks for images, use generate_image immediately. Write rich, detailed prompts for the image generator. Always generate at least 2 images.
2. When a GitHub repo is mentioned, use analyze_repo to understand it deeply — read the README, topics, description. Then use get_repo_activity to find recent PRs/commits for marketing angles.
3. Use read_repo_file to read specific code files when you need more context (e.g., landing page copy, component structure, API endpoints).
4. For videos, use generate_video. You can animate previously generated images by passing their URL.
5. After generating content, suggest marketing copy, social post ideas, or next steps.

## Agent behavior:
- Think step-by-step: analyze the request, gather context, then create
- Chain tools when needed (e.g., analyze repo → read key files → generate images based on findings)
- Be direct and action-oriented — start creating immediately, don't ask "would you like me to..."
- Reference specific repo features, code, and commits when creating marketing content
- Describe generated images/videos briefly after they appear

## Content quality:
- Image prompts should be detailed, specifying style, composition, colors, mood
- Use the brand's color scheme and identity in all generated content
- Marketing content should be authentic and highlight real features`,
      messages,
      stopWhen: stepCountIs(5),
      tools: {
        generate_image: {
          description:
            'Generate marketing images with AI. Creates high-quality visuals using Grok. Use detailed, creative prompts that specify style, composition, colors, and mood.',
          inputSchema: z.object({
            prompt: z.string().describe('Detailed image description including style, composition, colors, mood, and subject'),
            n: z.number().min(1).max(4).default(2).describe('Number of images (1-4)'),
          }),
          execute: async ({ prompt, n }: { prompt: string; n: number }) => {
            try {
              const images = await generateGrokImages(prompt, n)
              return {
                success: true,
                images,
                prompt,
                provider: 'grok',
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
            aspectRatio: string
          }) => {
            try {
              if (!user) return { success: false, error: 'User not found', status: 'failed' }

              const xai = getXAIClient()
              const grokResponse = await xai.generateVideo({
                prompt,
                duration,
                aspect_ratio: aspectRatio as any,
                resolution: '720p',
                ...(imageUrl && { image: { url: imageUrl } }),
              })

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
                    external_request_id: grokResponse.request_id,
                  })
                  .select('id')
                  .single()

                if (video) videoId = video.id
              }

              return {
                success: true,
                videoId,
                requestId: grokResponse.request_id,
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
              const xai = getXAIClient()
              const result = await xai.getVideoResult(requestId)

              if (result.url) {
                return {
                  status: 'completed',
                  outputUrl: result.url,
                  message: 'Video is ready!',
                }
              }

              if (result.status === 'failed') {
                return { status: 'failed', error: result.error || 'Generation failed' }
              }

              return {
                status: 'processing',
                message: 'Still generating...',
              }
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
