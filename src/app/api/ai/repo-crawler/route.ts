import { NextRequest, NextResponse } from 'next/server'
import { generateText, createGateway, tool } from 'ai'
import { auth } from '@/auth'
import { z } from 'zod'

// Tool to list directory contents in a GitHub repo
async function listDirectoryFn(
  repo: string,
  path: string,
  accessToken: string
): Promise<{ name: string; type: 'file' | 'dir'; size?: number; path: string }[]> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/vnd.github.v3+json',
  }

  const url = `https://api.github.com/repos/${repo}/contents/${path}`
  const response = await fetch(url, { headers })

  if (!response.ok) {
    if (response.status === 404) {
      return [] // Directory doesn't exist
    }
    throw new Error(`Failed to list directory: ${response.status}`)
  }

  const contents = await response.json()

  if (!Array.isArray(contents)) {
    // Single file, not a directory
    return [{ name: contents.name, type: 'file', size: contents.size, path: contents.path }]
  }

  return contents.map((item: { name: string; type: string; size?: number; path: string }) => ({
    name: item.name,
    type: item.type === 'dir' ? 'dir' : 'file',
    size: item.size,
    path: item.path,
  }))
}

// Tool to read file contents from a GitHub repo
async function readFileFn(
  repo: string,
  path: string,
  accessToken: string
): Promise<string | null> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/vnd.github.v3+json',
  }

  const url = `https://api.github.com/repos/${repo}/contents/${path}`
  const response = await fetch(url, { headers })

  if (!response.ok) {
    return null
  }

  const data = await response.json()

  if (data.content) {
    const content = Buffer.from(data.content, 'base64').toString('utf-8')
    // Limit content to prevent token overflow
    return content.length > 10000 ? content.substring(0, 10000) + '\n... [truncated]' : content
  }

  return null
}

// Tool to get image/asset URL from a GitHub repo
function getAssetUrlFn(repo: string, path: string): string {
  return `/api/github/file?repo=${encodeURIComponent(repo)}&path=${encodeURIComponent(path)}`
}

const systemPrompt = `You are a brand extraction agent. Your job is to explore a GitHub repository and extract brand information.

EXPLORATION STRATEGY:
1. First, list the root directory to understand the repo structure
2. Look for common locations of brand assets:
   - public/, static/, assets/ folders for logos and images
   - src/, app/, client/ folders may contain nested public folders
   - Look for CSS/SCSS files, tailwind.config, globals.css, theme files
   - Check package.json, README.md for brand name and description
3. When you find style files, read them to extract colors and fonts
4. When you find image files (png, svg, jpg, ico), use get_asset_url to get their URLs

COLOR EXTRACTION:
- Look for CSS variables: --primary, --secondary, --accent, --background
- Look for Tailwind theme colors in tailwind.config.js/ts
- Convert any oklch(), hsl(), rgb() colors to hex
- The actual brand colors from the codebase are MORE IMPORTANT than guessing

LOGO DETECTION:
- Look for files with names like: logo, icon, favicon, brand, mark
- Common extensions: .svg, .png, .ico, .jpg
- Check multiple locations, logos might be in nested folders

WHEN TO REPORT:
- Once you have found: name, description, at least one color, and ideally a logo
- Call report_brand_data with all the information you've gathered
- Include sources for each piece of data so the user knows where it came from`

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Not authenticated with GitHub' }, { status: 401 })
    }

    const { repo } = (await request.json()) as { repo: string }

    if (!repo) {
      return NextResponse.json({ error: 'Repo parameter is required' }, { status: 400 })
    }

    const apiKey = process.env.AI_GATEWAY_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'AI Gateway API key not configured' }, { status: 500 })
    }

    const gateway = createGateway({ apiKey })
    const accessToken = session.accessToken

    // Track brand data when reported
    let brandData: Record<string, unknown> | null = null

    // Define tools using AI SDK v6 syntax
    const tools = {
      list_directory: tool({
        description: 'List files and folders in a directory of the GitHub repository. Use empty string "" for root directory.',
        parameters: z.object({
          path: z.string().describe('The directory path to list (use "" for root)'),
        }),
        execute: async ({ path }) => {
          const contents = await listDirectoryFn(repo, path, accessToken)
          return contents
        },
      }),

      read_file: tool({
        description: 'Read the contents of a file from the GitHub repository. Use this for text files like CSS, JS, JSON, MD, etc.',
        parameters: z.object({
          path: z.string().describe('The file path to read'),
        }),
        execute: async ({ path }) => {
          const content = await readFileFn(repo, path, accessToken)
          return content || 'File not found or could not be read'
        },
      }),

      get_asset_url: tool({
        description: 'Get a URL for an image or binary asset from the repository. Use this for logos, images, fonts, etc.',
        parameters: z.object({
          path: z.string().describe('The asset path'),
        }),
        execute: async ({ path }) => {
          return {
            path,
            url: getAssetUrlFn(repo, path),
          }
        },
      }),

      report_brand_data: tool({
        description: 'Report the final extracted brand data when you have gathered enough information.',
        parameters: z.object({
          name: z.string().describe('Brand name'),
          description: z.string().describe('Brand description (2-3 sentences)'),
          tagline: z.string().describe('Brand tagline (5-10 words)'),
          website_url: z.string().nullable().describe('Website URL if found'),
          primaryColor: z.string().describe('Primary brand color in hex format'),
          secondaryColor: z.string().describe('Secondary/background color in hex format'),
          accentColor: z.string().describe('Accent color in hex format'),
          logos: z.array(z.object({
            path: z.string(),
            url: z.string(),
          })).describe('Array of logo images found'),
          fonts: z.object({
            primary: z.string().nullable(),
            secondary: z.string().nullable(),
            mono: z.string().nullable(),
          }).nullable().describe('Font families found'),
          allColors: z.record(z.string(), z.string()).nullable().describe('All colors found with their sources'),
          sources: z.record(z.string(), z.string()).nullable().describe('Sources for each piece of data'),
        }),
        execute: async (data) => {
          brandData = data
          return { success: true }
        },
      }),
    }

    // Run the agentic loop with maxSteps
    const result = await generateText({
      model: gateway('anthropic/claude-sonnet-4-20250514'),
      system: systemPrompt,
      tools,
      maxSteps: 15, // Allow multiple tool calls
      prompt: `Explore the repository "${repo}" and extract brand information. Find the brand name, description, colors (from CSS/config files), and any logos or brand images.`,
    })

    // Count tool calls from steps
    const toolCallCount = result.steps?.reduce((count, step) => {
      return count + (step.toolCalls?.length || 0)
    }, 0) || 0

    if (brandData) {
      return NextResponse.json({
        success: true,
        brandData,
        toolCalls: toolCallCount,
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Could not extract complete brand data',
      toolCalls: toolCallCount,
    })
  } catch (error) {
    console.error('Repo crawler error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred while crawling the repository' },
      { status: 500 }
    )
  }
}
