import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getXAIClient } from '@/lib/xai/client'
import { createAdminClient } from '@/lib/supabase/admin'

export interface AnimateRequest {
  imageUrl: string
  prompt?: string
  duration?: number // 1-15 seconds
  aspectRatio?: '16:9' | '4:3' | '1:1' | '9:16' | '3:4' | '3:2' | '2:3'
}

export interface AnimateResponse {
  success: boolean
  requestId?: string
  error?: string
}

/**
 * Upload a base64 image to Supabase Storage and return a public URL
 */
async function uploadBase64Image(base64Data: string, userId: string): Promise<string> {
  const supabase = createAdminClient()

  // Extract the base64 content and mime type
  const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/)
  if (!matches) {
    throw new Error('Invalid base64 image format')
  }

  const mimeType = matches[1]
  const base64Content = matches[2]
  const buffer = Buffer.from(base64Content, 'base64')

  // Determine file extension
  const extMap: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
  }
  const ext = extMap[mimeType] || 'png'

  // Generate unique filename
  const filename = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`

  // Upload to storage
  const { error } = await supabase.storage
    .from('temp-images')
    .upload(filename, buffer, {
      contentType: mimeType,
      upsert: false,
    })

  if (error) {
    console.error('Storage upload error:', error)
    throw new Error(`Failed to upload image: ${error.message}`)
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('temp-images')
    .getPublicUrl(filename)

  return urlData.publicUrl
}

// POST: Start video animation from image
export async function POST(request: NextRequest): Promise<NextResponse<AnimateResponse>> {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const apiKey = process.env.XAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'XAI_API_KEY not configured' }, { status: 500 })
    }

    const body = await request.json() as AnimateRequest
    const {
      imageUrl,
      prompt = 'Animate this image with subtle, natural motion',
      duration = 5,
      aspectRatio = '1:1',
    } = body

    if (!imageUrl) {
      return NextResponse.json({ success: false, error: 'Image URL is required' }, { status: 400 })
    }

    // Validate duration
    if (duration < 1 || duration > 15) {
      return NextResponse.json(
        { success: false, error: 'Duration must be between 1 and 15 seconds' },
        { status: 400 }
      )
    }

    // Get user ID for storage path
    const supabase = createAdminClient()
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    // Handle base64 images - upload to storage first
    let finalImageUrl = imageUrl
    if (imageUrl.startsWith('data:')) {
      console.log('Uploading base64 image to storage for animation...')
      try {
        finalImageUrl = await uploadBase64Image(imageUrl, user.id)
        console.log('Image uploaded successfully:', finalImageUrl)
      } catch (uploadError) {
        console.error('Failed to upload image:', uploadError)
        return NextResponse.json(
          { success: false, error: `Failed to process image: ${uploadError instanceof Error ? uploadError.message : 'Upload failed'}` },
          { status: 500 }
        )
      }
    }

    // Call Grok video API with image
    const xai = getXAIClient()
    const response = await xai.generateVideo({
      prompt,
      duration,
      aspect_ratio: aspectRatio,
      image: { url: finalImageUrl },
    })

    return NextResponse.json({
      success: true,
      requestId: response.request_id,
    })
  } catch (error) {
    console.error('Animation error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to start animation' },
      { status: 500 }
    )
  }
}

// GET: Check animation status
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const requestId = request.nextUrl.searchParams.get('requestId')
    if (!requestId) {
      return NextResponse.json({ error: 'Request ID required' }, { status: 400 })
    }

    const xai = getXAIClient()
    const result = await xai.getVideoResult(requestId)

    return NextResponse.json({
      success: true,
      status: result.status || (result.url ? 'completed' : 'processing'),
      videoUrl: result.url,
      error: result.error,
    })
  } catch (error) {
    console.error('Animation status error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check status' },
      { status: 500 }
    )
  }
}
