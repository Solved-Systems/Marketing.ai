import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { readFileSync } from 'fs'
import { join } from 'path'
import { registerAppTool, registerAppResource, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server'
import { createAdminClient } from '@/lib/supabase/admin'
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
import { startLambdaRender, checkLambdaProgress } from '@/lib/remotion/lambda'
import type { McpUserContext } from '@/lib/mcp/auth'

// Load built MCP App HTML at module init (single-file bundles)
let imageGalleryHtml = ''
let videoPlayerHtml = ''
try {
  const appsDir = join(process.cwd(), 'mcp-apps', 'dist', 'src')
  imageGalleryHtml = readFileSync(join(appsDir, 'image-gallery', 'index.html'), 'utf-8')
  videoPlayerHtml = readFileSync(join(appsDir, 'video-player', 'index.html'), 'utf-8')
} catch {
  // MCP Apps not built yet — server works without them
  console.warn('MCP Apps dist not found. Rich UI rendering will be unavailable.')
}

function checkScope(context: McpUserContext, scope: string) {
  if (!context.scopes.includes(scope)) {
    throw new Error(`Access denied: '${scope}' scope not granted for this MCP credential`)
  }
}

export function createMrktMcpServer(context: McpUserContext): McpServer {
  const server = new McpServer({
    name: 'mrktcmd',
    version: '1.0.0',
  })

  const supabase = createAdminClient()

  // --- MCP App UI Resources ---
  const IMAGE_GALLERY_URI = 'ui://mrktcmd/image-gallery'
  const VIDEO_PLAYER_URI = 'ui://mrktcmd/video-player'

  if (imageGalleryHtml) {
    registerAppResource(
      server,
      'Image Gallery',
      IMAGE_GALLERY_URI,
      { description: 'Interactive image gallery with edit and animate actions' },
      async () => ({
        contents: [{ uri: IMAGE_GALLERY_URI, mimeType: RESOURCE_MIME_TYPE, text: imageGalleryHtml }],
      })
    )
  }

  if (videoPlayerHtml) {
    registerAppResource(
      server,
      'Video Player',
      VIDEO_PLAYER_URI,
      { description: 'Video player with progress tracking and download' },
      async () => ({
        contents: [{ uri: VIDEO_PLAYER_URI, mimeType: RESOURCE_MIME_TYPE, text: videoPlayerHtml }],
      })
    )
  }

  // --- list_brands ---
  server.tool(
    'list_brands',
    'List all brands belonging to the authenticated user',
    {},
    async () => {
      const { data: brands } = await supabase
        .from('brands')
        .select('id, name, description, tagline, website_url, logo_url, primary_color, secondary_color, accent_color, github_repo')
        .eq('user_id', context.userId)
        .order('created_at', { ascending: false })

      return {
        content: [{ type: 'text', text: JSON.stringify(brands || [], null, 2) }],
      }
    }
  )

  // --- generate_image ---
  registerAppTool(
    server,
    'generate_image',
    {
      description: 'Generate marketing images with AI. Providers: grok (fast, creative), openai (GPT-5.2, photorealistic), imagen (Google Imagen 4.0).',
      inputSchema: {
        prompt: z.string().describe('Detailed image description'),
        n: z.number().min(1).max(4).default(2).describe('Number of images'),
        provider: z.enum(['grok', 'openai', 'imagen']).default('grok').describe('Image provider'),
      },
      _meta: { ui: { resourceUri: IMAGE_GALLERY_URI } },
    },
    async ({ prompt, n, provider }) => {
      checkScope(context, 'images')

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

      const content: Array<{ type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string }> = []

      // Add image parts for URLs that are base64
      for (const img of images) {
        if (img.url.startsWith('data:image/')) {
          const match = img.url.match(/^data:([^;]+);base64,(.+)$/)
          if (match) {
            content.push({ type: 'image', data: match[2], mimeType: match[1] })
          }
        }
      }

      // Always include JSON summary
      content.push({
        type: 'text',
        text: JSON.stringify({ success: true, images, prompt, provider, count: images.length }, null, 2),
      })

      return { content }
    }
  )

  // --- edit_image ---
  registerAppTool(
    server,
    'edit_image',
    {
      description: 'Edit an existing image using DALL-E 2. Apply style transformations, enhance quality, remove backgrounds.',
      inputSchema: {
        prompt: z.string().describe('Editing instruction'),
        imageUrl: z.string().describe('URL of the image to edit'),
        preset: z.enum(['remove_background', 'enhance', 'style_oil', 'style_watercolor', 'style_sketch']).optional().describe('Quick edit preset'),
        n: z.number().min(1).max(4).default(1).describe('Number of variations'),
      },
      _meta: { ui: { resourceUri: IMAGE_GALLERY_URI } },
    },
    async ({ prompt, imageUrl, preset, n }) => {
      checkScope(context, 'images')

      const gatewayKey = process.env.AI_GATEWAY_API_KEY
      if (!gatewayKey) throw new Error('AI_GATEWAY_API_KEY not configured')

      const editPrompt = (preset && EDIT_PRESETS[preset]) || prompt
      const images = await editImageWithDallE(gatewayKey, imageUrl, editPrompt, n)

      const content: Array<{ type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string }> = []

      for (const img of images) {
        if (img.url.startsWith('data:image/')) {
          const match = img.url.match(/^data:([^;]+);base64,(.+)$/)
          if (match) {
            content.push({ type: 'image', data: match[2], mimeType: match[1] })
          }
        }
      }

      content.push({
        type: 'text',
        text: JSON.stringify({ success: true, images, prompt: editPrompt, provider: 'dall-e-2', preset: preset || null, count: images.length }, null, 2),
      })

      return { content }
    }
  )

  // --- generate_video ---
  registerAppTool(
    server,
    'generate_video',
    {
      description: 'Generate or animate video content using Grok Imagine. Create videos from text or animate existing images.',
      inputSchema: {
        prompt: z.string().describe('Description of the video'),
        imageUrl: z.string().optional().describe('Image URL to animate'),
        duration: z.number().min(1).max(15).default(5).describe('Duration in seconds'),
        aspectRatio: z.enum(['16:9', '9:16', '1:1']).default('16:9').describe('Aspect ratio'),
        brandId: z.string().optional().describe('Brand ID for storing the video'),
      },
      _meta: { ui: { resourceUri: VIDEO_PLAYER_URI } },
    },
    async ({ prompt, imageUrl, duration, aspectRatio, brandId: toolBrandId }) => {
      checkScope(context, 'videos')

      const activeBrandId = toolBrandId || context.defaultBrandId
      const { requestId } = await startGrokVideo({ prompt, imageUrl, duration, aspectRatio })

      let videoId = `vid-${Date.now()}`
      if (activeBrandId) {
        const { data: brand } = await supabase
          .from('brands')
          .select('name')
          .eq('id', activeBrandId)
          .eq('user_id', context.userId)
          .single()

        const { data: video } = await supabase
          .from('videos')
          .insert({
            user_id: context.userId,
            brand_id: activeBrandId,
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
            brand_name: brand?.name || 'Brand',
            external_request_id: requestId,
          })
          .select('id')
          .single()

        if (video) videoId = video.id
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ success: true, videoId, requestId, status: 'processing', message: 'Video generation started. Typically takes 1-2 minutes.' }, null, 2),
        }],
      }
    }
  )

  // --- check_video_status ---
  registerAppTool(
    server,
    'check_video_status',
    {
      description: 'Check the status of a Grok video generation.',
      inputSchema: {
        requestId: z.string().describe('The xAI request ID from generate_video'),
      },
      _meta: { ui: { resourceUri: VIDEO_PLAYER_URI } },
    },
    async ({ requestId }) => {
      checkScope(context, 'videos')
      const result = await checkGrokVideoStatus(requestId)
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      }
    }
  )

  // --- generate_remotion_video ---
  registerAppTool(
    server,
    'generate_remotion_video',
    {
      description: 'Generate a branded marketing video using Remotion templates rendered on AWS Lambda. Templates: feature, product, social, release.',
      inputSchema: {
        template: z.enum(['feature', 'product', 'social', 'release']).describe('Video template'),
        title: z.string().describe('Video title'),
        description: z.string().describe('Short description'),
        features: z.array(z.string()).describe('Bullet point features'),
        callToAction: z.string().default('Learn More').describe('CTA text'),
        duration: z.enum(['15', '30', '60']).default('30').describe('Duration in seconds'),
        style: z.enum(['Modern', 'Minimal', 'Bold', 'Playful']).default('Modern').describe('Visual style'),
        heroImageUrl: z.string().optional().describe('Hero image URL'),
        brandId: z.string().optional().describe('Brand ID'),
      },
      _meta: { ui: { resourceUri: VIDEO_PLAYER_URI } },
    },
    async ({ template, title, description, features, callToAction, duration, style, heroImageUrl, brandId: toolBrandId }) => {
      checkScope(context, 'videos')

      const activeBrandId = toolBrandId || context.defaultBrandId

      let primaryColor = '#6366f1'
      let secondaryColor = '#8b5cf6'
      let accentColor = '#22c55e'
      let brandName = 'Brand'

      if (activeBrandId) {
        const { data: brand } = await supabase
          .from('brands')
          .select('primary_color, secondary_color, accent_color, name')
          .eq('id', activeBrandId)
          .eq('user_id', context.userId)
          .single()

        if (brand) {
          primaryColor = brand.primary_color || primaryColor
          secondaryColor = brand.secondary_color || secondaryColor
          accentColor = brand.accent_color || accentColor
          brandName = brand.name || brandName
        }
      }

      const compositionId = getCompositionId(template, duration)
      const inputProps: Record<string, unknown> = {
        title, description, features,
        callToAction: callToAction || 'Learn More',
        primaryColor, secondaryColor, accentColor, brandName, style,
      }
      if (heroImageUrl) inputProps.heroImageUrl = heroImageUrl

      const { renderId, bucketName } = await startLambdaRender(compositionId, inputProps)

      let videoId = `vid-${Date.now()}`
      if (activeBrandId) {
        const { data: video } = await supabase
          .from('videos')
          .insert({
            user_id: context.userId,
            brand_id: activeBrandId,
            title, description,
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

      pollLambdaCompletion(videoId, renderId, bucketName).catch(err => {
        console.error('Lambda polling error:', err)
      })

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ success: true, videoId, renderId, status: 'rendering', template, duration: `${duration}s`, message: 'Remotion video render started. Typically takes 30-90 seconds.' }, null, 2),
        }],
      }
    }
  )

  // --- check_remotion_status ---
  registerAppTool(
    server,
    'check_remotion_status',
    {
      description: 'Check the status of a Remotion video render.',
      inputSchema: {
        videoId: z.string().describe('The video ID from generate_remotion_video'),
      },
      _meta: { ui: { resourceUri: VIDEO_PLAYER_URI } },
    },
    async ({ videoId }) => {
      checkScope(context, 'videos')

      const { data: video } = await supabase
        .from('videos')
        .select('status, output_url, render_id, render_bucket, error_message')
        .eq('id', videoId)
        .single()

      if (!video) {
        return { content: [{ type: 'text', text: JSON.stringify({ status: 'not_found', error: 'Video not found' }) }] }
      }

      if (video.status === 'completed' && video.output_url) {
        return { content: [{ type: 'text', text: JSON.stringify({ status: 'completed', outputUrl: video.output_url, message: 'Video is ready!' }) }] }
      }

      if (video.status === 'failed') {
        return { content: [{ type: 'text', text: JSON.stringify({ status: 'failed', error: video.error_message || 'Render failed' }) }] }
      }

      if (video.render_id && video.render_bucket) {
        try {
          const progress = await checkLambdaProgress(video.render_id, video.render_bucket)
          return { content: [{ type: 'text', text: JSON.stringify({ status: 'rendering', progress: progress.progress, message: `Rendering... ${progress.progress}% complete` }) }] }
        } catch {
          // Fall through
        }
      }

      return { content: [{ type: 'text', text: JSON.stringify({ status: 'processing', message: 'Still rendering...' }) }] }
    }
  )

  // --- analyze_repo ---
  server.tool(
    'analyze_repo',
    'Analyze a GitHub repository — fetches metadata, README, package.json, stars, topics.',
    {
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
    },
    async ({ owner, repo }) => {
      checkScope(context, 'github')
      if (!context.githubAccessToken) throw new Error('GitHub access token not available. Rotate your MCP GUID while logged in with GitHub.')
      const result = await fetchGitHubRepoInfo(context.githubAccessToken, owner, repo)
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    }
  )

  // --- get_repo_activity ---
  server.tool(
    'get_repo_activity',
    'Get recent GitHub activity — merged PRs and commits.',
    {
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
    },
    async ({ owner, repo }) => {
      checkScope(context, 'github')
      if (!context.githubAccessToken) throw new Error('GitHub access token not available. Rotate your MCP GUID while logged in with GitHub.')
      const result = await fetchGitHubActivity(context.githubAccessToken, owner, repo)
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    }
  )

  // --- read_repo_file ---
  server.tool(
    'read_repo_file',
    'Read a file or list a directory from a GitHub repository.',
    {
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      path: z.string().describe('File or directory path'),
    },
    async ({ owner, repo, path }) => {
      checkScope(context, 'github')
      if (!context.githubAccessToken) throw new Error('GitHub access token not available. Rotate your MCP GUID while logged in with GitHub.')
      const result = await fetchGitHubFile(context.githubAccessToken, owner, repo, path)
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    }
  )

  return server
}
