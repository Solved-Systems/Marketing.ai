import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import OpenAI from 'openai'
import { toFile } from 'openai'

// Supported edit sizes
export const IMAGE_EDIT_SIZES = [
  { value: '1024x1024', label: 'Large (1024×1024)', description: 'Best quality' },
  { value: '512x512', label: 'Medium (512×512)', description: 'Faster, good quality' },
  { value: '256x256', label: 'Small (256×256)', description: 'Fastest, preview quality' },
] as const

export type ImageEditSize = typeof IMAGE_EDIT_SIZES[number]['value']

// Quick edit presets
export const EDIT_PRESETS = [
  { value: 'remove_background', label: 'Remove Background', prompt: 'Remove the background, keep only the main subject with a transparent or white background' },
  { value: 'enhance', label: 'Enhance Quality', prompt: 'Enhance the image quality, improve lighting and colors while keeping the same composition' },
  { value: 'style_painting', label: 'Oil Painting Style', prompt: 'Transform this into an oil painting style with visible brush strokes' },
  { value: 'style_watercolor', label: 'Watercolor Style', prompt: 'Transform this into a watercolor painting with soft, flowing colors' },
  { value: 'style_sketch', label: 'Pencil Sketch', prompt: 'Transform this into a detailed pencil sketch' },
  { value: 'style_cartoon', label: 'Cartoon Style', prompt: 'Transform this into a cartoon or illustration style' },
  { value: 'lighting_dramatic', label: 'Dramatic Lighting', prompt: 'Add dramatic cinematic lighting with shadows and highlights' },
  { value: 'lighting_soft', label: 'Soft Lighting', prompt: 'Apply soft, diffused lighting for a gentle mood' },
  { value: 'color_vibrant', label: 'Vibrant Colors', prompt: 'Make the colors more vibrant and saturated' },
  { value: 'color_muted', label: 'Muted Colors', prompt: 'Apply muted, desaturated colors for a vintage look' },
] as const

export interface ImageEditRequest {
  imageUrl: string
  editPrompt: string
  size?: ImageEditSize
  maskUrl?: string // Optional mask image for inpainting
  n?: number // Number of variations (1-4)
  preset?: string // Quick edit preset
}

export interface ImageEditResponse {
  success: boolean
  images?: { url: string; index: number }[]
  error?: string
  appliedPreset?: string
  appliedSize?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<ImageEditResponse>> {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Check for Vercel AI Gateway authentication
    const gatewayKey = process.env.AI_GATEWAY_API_KEY

    if (!gatewayKey) {
      return NextResponse.json({
        success: false,
        error: 'AI_GATEWAY_API_KEY not configured'
      }, { status: 500 })
    }

    const body = await request.json() as ImageEditRequest
    const { imageUrl, editPrompt: rawPrompt, size = '1024x1024', maskUrl, n = 1, preset } = body

    if (!imageUrl) {
      return NextResponse.json({ success: false, error: 'Image URL is required' }, { status: 400 })
    }

    // Handle preset prompts
    let editPrompt = rawPrompt
    let appliedPreset: string | undefined

    if (preset) {
      const presetConfig = EDIT_PRESETS.find(p => p.value === preset)
      if (presetConfig) {
        editPrompt = presetConfig.prompt
        appliedPreset = preset
      }
    }

    if (!editPrompt) {
      return NextResponse.json({ success: false, error: 'Edit prompt is required' }, { status: 400 })
    }

    // Validate number of variations
    const numVariations = Math.min(Math.max(1, n), 4)

    const supabase = createAdminClient()

    // Verify user exists
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    // Fetch the image and convert to buffer
    let imageBuffer: Buffer
    let mimeType = 'image/png'

    if (imageUrl.startsWith('data:')) {
      // Parse base64 data URL
      const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/)
      if (!matches) {
        return NextResponse.json({
          success: false,
          error: 'Invalid base64 image format'
        }, { status: 400 })
      }
      mimeType = matches[1]
      imageBuffer = Buffer.from(matches[2], 'base64')
    } else {
      // Fetch from URL
      const imageResponse = await fetch(imageUrl)
      if (!imageResponse.ok) {
        return NextResponse.json({
          success: false,
          error: 'Failed to fetch source image'
        }, { status: 400 })
      }
      imageBuffer = Buffer.from(await imageResponse.arrayBuffer())
      mimeType = imageResponse.headers.get('content-type') || 'image/png'
    }

    // Create OpenAI client with Vercel AI Gateway
    const openai = new OpenAI({
      apiKey: gatewayKey,
      baseURL: 'https://ai-gateway.vercel.sh/v1',
    })

    // Convert buffer to File for OpenAI API
    const imageFile = await toFile(imageBuffer, 'image.png', { type: mimeType })

    // Handle mask image if provided
    let maskFile: Awaited<ReturnType<typeof toFile>> | undefined
    if (maskUrl) {
      let maskBuffer: Buffer
      if (maskUrl.startsWith('data:')) {
        const matches = maskUrl.match(/^data:([^;]+);base64,(.+)$/)
        if (matches) {
          maskBuffer = Buffer.from(matches[2], 'base64')
          maskFile = await toFile(maskBuffer, 'mask.png', { type: 'image/png' })
        }
      } else {
        const maskResponse = await fetch(maskUrl)
        if (maskResponse.ok) {
          maskBuffer = Buffer.from(await maskResponse.arrayBuffer())
          maskFile = await toFile(maskBuffer, 'mask.png', { type: 'image/png' })
        }
      }
    }

    // Use OpenAI's image edit API (DALL-E 2)
    // Note: DALL-E 2 edit API supports mask for inpainting
    const editParams: Parameters<typeof openai.images.edit>[0] = {
      model: 'openai/dall-e-2',
      image: imageFile,
      prompt: editPrompt,
      n: numVariations,
      size: size,
      response_format: 'b64_json',
    }

    // Add mask if provided (for inpainting)
    if (maskFile) {
      editParams.mask = maskFile
    }

    const result = await openai.images.edit(editParams)

    // Type guard: result could be Stream or ImagesResponse
    // We need the non-streaming response which has .data
    const resultData = 'data' in result ? result.data : null

    // Extract images from result
    if (!resultData || resultData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No images generated'
      }, { status: 500 })
    }

    const images = resultData
      .map((img, index) => ({
        url: img.b64_json ? `data:image/png;base64,${img.b64_json}` : (img.url || ''),
        index,
      }))
      .filter(img => img.url)

    if (images.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No images generated'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      images,
      appliedPreset,
      appliedSize: size,
    })
  } catch (error) {
    console.error('Image edit error:', error)

    // Extract detailed error message
    let errorMessage = 'Failed to edit image'
    if (error instanceof Error) {
      errorMessage = error.message
    }
    // Handle OpenAI API errors
    if (error && typeof error === 'object' && 'error' in error) {
      const apiError = error as { error?: { message?: string } }
      if (apiError.error?.message) {
        errorMessage = apiError.error.message
      }
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
