import { NextRequest } from 'next/server'
import {
  generateText,
  createGateway,
  tool,
  type ModelMessage,
  type ToolResultPart,
  type ToolCallPart,
} from 'ai'
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

// Tool schemas (without execute - we'll handle manually)
const listDirectorySchema = z.object({
  path: z.string().describe('The directory path to list (use "" for root)'),
})

const readFileSchema = z.object({
  path: z.string().describe('The file path to read'),
})

const getAssetUrlSchema = z.object({
  path: z.string().describe('The asset path'),
})

const reportBrandDataSchema = z.object({
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
})

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

// Execute a tool call
async function executeToolFn(
  toolName: string,
  args: Record<string, unknown>,
  repo: string,
  accessToken: string
): Promise<unknown> {
  switch (toolName) {
    case 'list_directory':
      return await listDirectoryFn(repo, args.path as string, accessToken)
    case 'read_file':
      return await readFileFn(repo, args.path as string, accessToken)
    case 'get_asset_url':
      return {
        path: args.path,
        url: getAssetUrlFn(repo, args.path as string),
      }
    case 'report_brand_data':
      return { success: true, data: args }
    default:
      return { error: `Unknown tool: ${toolName}` }
  }
}

// Get friendly description for tool calls
function getToolDescription(toolName: string, args: Record<string, unknown>): string {
  switch (toolName) {
    case 'list_directory':
      return args.path ? `Exploring \`${args.path}/\`` : 'Listing root directory'
    case 'read_file':
      return `Reading \`${args.path}\``
    case 'get_asset_url':
      return `Found asset: \`${args.path}\``
    case 'report_brand_data':
      return 'Compiling brand data...'
    default:
      return `Executing ${toolName}`
  }
}

export async function POST(request: NextRequest) {
  const session = await auth()

  if (!session?.accessToken) {
    return new Response(JSON.stringify({ error: 'Not authenticated with GitHub' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { repo } = (await request.json()) as { repo: string }

  if (!repo) {
    return new Response(JSON.stringify({ error: 'Repo parameter is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const apiKey = process.env.AI_GATEWAY_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'AI Gateway API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Create a streaming response using Server-Sent Events
  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  // Helper to send SSE events
  const sendEvent = async (event: string, data: unknown) => {
    await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
  }

  // Start the async processing
  const processRepo = async () => {
    try {
      const gateway = createGateway({ apiKey })
      const accessToken = session.accessToken!

      // Track brand data when reported
      let brandData: Record<string, unknown> | null = null
      let toolCallCount = 0

      await sendEvent('status', { message: 'Initializing AI agent...' })

      // Define tools using the tool() helper with inputSchema
      const tools = {
        list_directory: tool({
          description: 'List files and folders in a directory of the GitHub repository. Use empty string "" for root directory.',
          inputSchema: listDirectorySchema,
        }),
        read_file: tool({
          description: 'Read the contents of a file from the GitHub repository. Use this for text files like CSS, JS, JSON, MD, etc.',
          inputSchema: readFileSchema,
        }),
        get_asset_url: tool({
          description: 'Get a URL for an image or binary asset from the repository. Use this for logos, images, fonts, etc.',
          inputSchema: getAssetUrlSchema,
        }),
        report_brand_data: tool({
          description: 'Report the final extracted brand data when you have gathered enough information.',
          inputSchema: reportBrandDataSchema,
        }),
      }

      // Build messages array for the conversation using SDK types
      const messages: ModelMessage[] = [
        {
          role: 'user',
          content: `Explore the repository "${repo}" and extract brand information. Find the brand name, description, colors (from CSS/config files), and any logos or brand images.`,
        },
      ]

      const maxIterations = 15

      await sendEvent('status', { message: 'Starting repository exploration...' })

      for (let i = 0; i < maxIterations; i++) {
        await sendEvent('thinking', { iteration: i + 1, message: 'Agent is thinking...' })

        const result = await generateText({
          model: gateway('anthropic/claude-sonnet-4-20250514'),
          system: systemPrompt,
          tools,
          messages,
        })

        // Check if there are tool calls
        if (result.toolCalls && result.toolCalls.length > 0) {
          // Build assistant message content with tool calls
          const assistantContent: Array<{ type: 'text'; text: string } | ToolCallPart> = []
          if (result.text) {
            assistantContent.push({ type: 'text', text: result.text })
            await sendEvent('thought', { text: result.text })
          }
          for (const tc of result.toolCalls) {
            assistantContent.push({
              type: 'tool-call',
              toolCallId: tc.toolCallId,
              toolName: tc.toolName,
              input: tc.input,
            })
          }
          messages.push({
            role: 'assistant',
            content: assistantContent,
          })

          // Process each tool call and collect results
          const toolResults: ToolResultPart[] = []
          for (const toolCall of result.toolCalls) {
            toolCallCount++
            const args = toolCall.input as Record<string, unknown>

            // Send tool call event
            await sendEvent('tool_call', {
              tool: toolCall.toolName,
              args,
              description: getToolDescription(toolCall.toolName, args),
            })

            const toolResult = await executeToolFn(
              toolCall.toolName,
              args,
              repo,
              accessToken
            )

            // Send tool result summary
            if (toolCall.toolName === 'list_directory') {
              const items = toolResult as { name: string; type: string }[]
              const dirs = items.filter(i => i.type === 'dir').map(i => i.name)
              const files = items.filter(i => i.type === 'file').map(i => i.name)
              await sendEvent('tool_result', {
                tool: toolCall.toolName,
                summary: `Found ${dirs.length} folders, ${files.length} files`,
                dirs: dirs.slice(0, 10),
                files: files.slice(0, 10),
              })
            } else if (toolCall.toolName === 'read_file') {
              const content = toolResult as string | null
              await sendEvent('tool_result', {
                tool: toolCall.toolName,
                summary: content ? `Read ${content.length} characters` : 'File not found',
              })
            } else if (toolCall.toolName === 'get_asset_url') {
              await sendEvent('tool_result', {
                tool: toolCall.toolName,
                summary: `Asset URL generated`,
                asset: toolResult,
              })
            }

            // Check if this is the final brand data report
            if (toolCall.toolName === 'report_brand_data' && (toolResult as { success?: boolean }).success) {
              brandData = (toolResult as { data: Record<string, unknown> }).data
              await sendEvent('brand_found', { brandData })
            }

            // Add tool result to array using SDK's ToolResultPart format
            toolResults.push({
              type: 'tool-result',
              toolCallId: toolCall.toolCallId,
              toolName: toolCall.toolName,
              output: {
                type: 'text',
                value: JSON.stringify(toolResult),
              },
            })
          }

          // Add all tool results as a single tool message
          messages.push({
            role: 'tool',
            content: toolResults,
          })
        } else {
          // No tool calls, we're done
          break
        }

        // If we got brand data, we're done
        if (brandData) {
          break
        }
      }

      if (brandData) {
        await sendEvent('complete', {
          success: true,
          brandData,
          toolCalls: toolCallCount,
        })
      } else {
        await sendEvent('complete', {
          success: false,
          error: 'Could not extract complete brand data',
          toolCalls: toolCallCount,
        })
      }
    } catch (error) {
      console.error('Repo crawler error:', error)
      await sendEvent('error', {
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      })
    } finally {
      await writer.close()
    }
  }

  // Start processing in the background
  processRepo()

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
