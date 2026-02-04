import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getXAIClient } from '@/lib/xai/client'

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

    // Call Grok video API with image
    const xai = getXAIClient()
    const response = await xai.generateVideo({
      prompt,
      duration,
      aspect_ratio: aspectRatio,
      image: { url: imageUrl },
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
