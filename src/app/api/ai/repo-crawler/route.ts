import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import Anthropic from '@anthropic-ai/sdk'

// Tool to list directory contents in a GitHub repo
async function listDirectory(
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
async function readFile(
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
function getAssetUrl(repo: string, path: string): string {
  return `/api/github/file?repo=${encodeURIComponent(repo)}&path=${encodeURIComponent(path)}`
}

// Tool definitions for Claude
const toolDefinitions: Anthropic.Tool[] = [
  {
    name: 'list_directory',
    description: 'List files and folders in a directory of the GitHub repository. Use empty string "" for root directory.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: 'The directory path to list (use "" for root)',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'read_file',
    description: 'Read the contents of a file from the GitHub repository. Use this for text files like CSS, JS, JSON, MD, etc.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: 'The file path to read',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'get_asset_url',
    description: 'Get a URL for an image or binary asset from the repository. Use this for logos, images, fonts, etc.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: 'The asset path',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'report_brand_data',
    description: 'Report the final extracted brand data when you have gathered enough information.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Brand name' },
        description: { type: 'string', description: 'Brand description (2-3 sentences)' },
        tagline: { type: 'string', description: 'Brand tagline (5-10 words)' },
        website_url: { type: 'string', description: 'Website URL if found' },
        primaryColor: { type: 'string', description: 'Primary brand color in hex format' },
        secondaryColor: { type: 'string', description: 'Secondary/background color in hex format' },
        accentColor: { type: 'string', description: 'Accent color in hex format' },
        logos: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              path: { type: 'string' },
              url: { type: 'string' },
            },
            required: ['path', 'url'],
          },
          description: 'Array of logo images found',
        },
        fonts: {
          type: 'object',
          properties: {
            primary: { type: 'string' },
            secondary: { type: 'string' },
            mono: { type: 'string' },
          },
          description: 'Font families found',
        },
        allColors: {
          type: 'object',
          additionalProperties: { type: 'string' },
          description: 'All colors found with their sources',
        },
        sources: {
          type: 'object',
          additionalProperties: { type: 'string' },
          description: 'Sources for each piece of data',
        },
      },
      required: ['name', 'description', 'tagline', 'primaryColor', 'secondaryColor', 'accentColor'],
    },
  },
]

// Execute a tool call
async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  repo: string,
  accessToken: string
): Promise<unknown> {
  switch (toolName) {
    case 'list_directory':
      return await listDirectory(repo, toolInput.path as string, accessToken)
    case 'read_file':
      return await readFile(repo, toolInput.path as string, accessToken)
    case 'get_asset_url':
      return {
        path: toolInput.path,
        url: getAssetUrl(repo, toolInput.path as string),
      }
    case 'report_brand_data':
      return { success: true, data: toolInput }
    default:
      return { error: `Unknown tool: ${toolName}` }
  }
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

    const accessToken = session.accessToken

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey,
    })

    // Agentic loop
    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: `Explore the repository "${repo}" and extract brand information. Find the brand name, description, colors (from CSS/config files), and any logos or brand images.`,
      },
    ]

    let toolCallCount = 0
    const maxIterations = 15
    let brandData: Record<string, unknown> | null = null

    for (let i = 0; i < maxIterations; i++) {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        tools: toolDefinitions,
        messages,
      })

      // Check if we're done
      if (response.stop_reason === 'end_turn') {
        break
      }

      // Process tool uses
      if (response.stop_reason === 'tool_use') {
        const assistantContent = response.content
        messages.push({ role: 'assistant', content: assistantContent })

        const toolResults: Anthropic.ToolResultBlockParam[] = []

        for (const block of assistantContent) {
          if (block.type === 'tool_use') {
            toolCallCount++
            const result = await executeTool(
              block.name,
              block.input as Record<string, unknown>,
              repo,
              accessToken
            )

            // Check if this is the final brand data report
            if (block.name === 'report_brand_data' && (result as { success?: boolean }).success) {
              brandData = (result as { data: Record<string, unknown> }).data
            }

            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(result),
            })
          }
        }

        messages.push({ role: 'user', content: toolResults })
      } else {
        // No more tool calls
        break
      }
    }

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
