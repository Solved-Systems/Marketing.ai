import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getXAIClient } from '@/lib/xai/client'
import { createAdminClient } from '@/lib/supabase/admin'

// Supported aspect ratios for video animation
export const VIDEO_ASPECT_RATIOS = [
  { value: '16:9', label: 'Widescreen (16:9)', width: 1920, height: 1080 },
  { value: '9:16', label: 'Vertical (9:16)', width: 1080, height: 1920 },
  { value: '1:1', label: 'Square (1:1)', width: 1080, height: 1080 },
  { value: '4:3', label: 'Standard (4:3)', width: 1440, height: 1080 },
  { value: '3:4', label: 'Portrait (3:4)', width: 1080, height: 1440 },
  { value: '3:2', label: 'Photo (3:2)', width: 1620, height: 1080 },
  { value: '2:3', label: 'Photo Portrait (2:3)', width: 1080, height: 1620 },
] as const

export const VIDEO_RESOLUTIONS = [
  { value: '1080p', label: 'Full HD (1080p)', description: 'Best quality' },
  { value: '720p', label: 'HD (720p)', description: 'Good quality, faster' },
  { value: '480p', label: 'SD (480p)', description: 'Draft quality, fastest' },
] as const

export const VIDEO_DURATIONS = [
  { value: 3, label: '3 seconds' },
  { value: 5, label: '5 seconds' },
  { value: 8, label: '8 seconds' },
  { value: 10, label: '10 seconds' },
  { value: 15, label: '15 seconds' },
] as const

export type VideoAspectRatio = typeof VIDEO_ASPECT_RATIOS[number]['value']
export type VideoResolution = '1080p' | '720p' | '480p'

export interface AnimateRequest {
  imageUrl: string
  prompt?: string
  duration?: number // 1-15 seconds
  aspectRatio?: VideoAspectRatio
  resolution?: VideoResolution
  quality?: 'standard' | 'high'
  motionIntensity?: 'subtle' | 'moderate' | 'dynamic'
}

export interface AnimateResponse {
  success: boolean
  requestId?: string
  error?: string
  settings?: {
    duration: number
    aspectRatio: string
    resolution: string
    motionIntensity: string
  }
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
      prompt: userPrompt,
      duration = 5,
      aspectRatio = '1:1',
      resolution = '720p',
      motionIntensity = 'moderate',
    } = body

    // Build enhanced prompt based on motion intensity
    const motionPrompts = {
      subtle: 'with very subtle, gentle motion. Keep movements minimal and natural.',
      moderate: 'with smooth, natural motion. Add moderate movement to bring the scene to life.',
      dynamic: 'with dynamic, cinematic motion. Add expressive movement and camera effects.',
    }

    const basePrompt = userPrompt || 'Animate this image'
    const prompt = `${basePrompt} ${motionPrompts[motionIntensity]}`

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

    // Map resolution to API format (xAI currently supports 720p, 480p)
    const apiResolution = resolution === '1080p' ? '720p' : resolution

    // Call Grok video API with image
    const xai = getXAIClient()
    const response = await xai.generateVideo({
      prompt,
      duration,
      aspect_ratio: aspectRatio,
      resolution: apiResolution,
      image: { url: finalImageUrl },
    })

    return NextResponse.json({
      success: true,
      requestId: response.request_id,
      settings: {
        duration,
        aspectRatio,
        resolution: apiResolution,
        motionIntensity,
      },
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
    const startTime = request.nextUrl.searchParams.get('startTime')

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID required' }, { status: 400 })
    }

    const xai = getXAIClient()
    const result = await xai.getVideoResult(requestId)

    // Estimate progress based on elapsed time (typical animation takes 60-90 seconds)
    let estimatedProgress = 0
    if (startTime && result.status !== 'completed' && result.status !== 'failed') {
      const elapsedMs = Date.now() - parseInt(startTime)
      const elapsedSec = elapsedMs / 1000
      // Estimate: 10% at start, ramps to ~90% by 80 seconds, never quite hits 100%
      estimatedProgress = Math.min(95, Math.round(10 + (elapsedSec / 80) * 85))
    }

    const isComplete = result.url || result.status === 'completed'

    return NextResponse.json({
      success: true,
      status: result.status || (isComplete ? 'completed' : 'processing'),
      videoUrl: result.url,
      duration: result.duration,
      error: result.error,
      progress: isComplete ? 100 : estimatedProgress,
    })
  } catch (error) {
    console.error('Animation status error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check status' },
      { status: 500 }
    )
  }
}

// Export supported options for use in UI
export const ANIMATE_OPTIONS = {
  aspectRatios: VIDEO_ASPECT_RATIOS,
  resolutions: VIDEO_RESOLUTIONS,
  durations: VIDEO_DURATIONS,
}
