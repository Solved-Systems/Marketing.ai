import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import OpenAI from 'openai'
import { toFile } from 'openai'

export interface ImageEditRequest {
  imageUrl: string
  editPrompt: string
  size?: '1024x1024' | '512x512' | '256x256'
}

export interface ImageEditResponse {
  success: boolean
  images?: { url: string }[]
  error?: string
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
    const { imageUrl, editPrompt, size = '1024x1024' } = body

    if (!imageUrl) {
      return NextResponse.json({ success: false, error: 'Image URL is required' }, { status: 400 })
    }

    if (!editPrompt) {
      return NextResponse.json({ success: false, error: 'Edit prompt is required' }, { status: 400 })
    }

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

    // Use OpenAI's image edit API (DALL-E 2)
    const result = await openai.images.edit({
      model: 'openai/dall-e-2',
      image: imageFile,
      prompt: editPrompt,
      n: 1,
      size: size,
      response_format: 'b64_json',
    })

    // Extract images from result
    if (!result.data || result.data.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No images generated'
      }, { status: 500 })
    }

    const images = result.data
      .map(img => ({
        url: img.b64_json ? `data:image/png;base64,${img.b64_json}` : (img.url || ''),
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
