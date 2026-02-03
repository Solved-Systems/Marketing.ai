import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { deductCredits, hasEnoughCredits } from '@/lib/billing/credits'
import { getVideoGenerationType } from '@/lib/billing/models'
import type { ModelQuality } from '@/lib/billing/models'
import { getXAIClient } from '@/lib/xai/client'

export interface GrokVideoRequest {
  brandId: string
  prompt: string
  duration?: number // 1-15 seconds
  aspectRatio?: '16:9' | '4:3' | '1:1' | '9:16' | '3:4' | '3:2' | '2:3'
  resolution?: '720p' | '480p'
  imageUrl?: string
  quality?: ModelQuality
}

export interface GrokVideoResponse {
  success: boolean
  videoId?: string
  requestId?: string
  status?: 'queued' | 'processing' | 'completed' | 'failed'
  error?: string
  creditsRemaining?: number
}

// POST: Generate a video with Grok Imagine
export async function POST(request: NextRequest): Promise<NextResponse<GrokVideoResponse>> {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as GrokVideoRequest
    const {
      brandId,
      prompt,
      duration = 5,
      aspectRatio = '16:9',
      resolution = '720p',
      imageUrl,
      quality = 'default',
    } = body

    // Validate required fields
    if (!brandId || !prompt) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: brandId, prompt' },
        { status: 400 }
      )
    }

    // Validate duration
    if (duration < 1 || duration > 15) {
      return NextResponse.json(
        { success: false, error: 'Duration must be between 1 and 15 seconds' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Get brand (verify ownership)
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brandId)
      .eq('user_id', user.id)
      .single()

    if (brandError || !brand) {
      return NextResponse.json(
        { success: false, error: 'Brand not found or access denied' },
        { status: 404 }
      )
    }

    // Check and deduct credits
    const generationType = getVideoGenerationType(quality)
    const canAfford = await hasEnoughCredits(user.id, generationType)

    if (!canAfford) {
      return NextResponse.json(
        { success: false, error: 'Insufficient credits. Please upgrade your plan.' },
        { status: 402 }
      )
    }

    // Create video record in database
    const videoData = {
      user_id: user.id,
      brand_id: brandId,
      title: prompt.slice(0, 100), // Use prompt as title
      description: prompt,
      template: 'grok-imagine', // Special template identifier
      duration: `${duration} seconds`,
      style: 'AI Generated',
      status: 'processing' as const,
      quality,
      engine: 'grok-imagine', // Track which engine was used
      aspect_ratio: aspectRatio,
      resolution,
      brand_name: brand.name,
      created_at: new Date().toISOString(),
    }

    const { data: video, error: insertError } = await supabase
      .from('videos')
      .insert(videoData)
      .select('id')
      .single()

    let videoId: string

    if (insertError) {
      console.error('Error creating video record:', insertError)
      if (insertError.code === '42P01') {
        videoId = `temp-${Date.now()}`
      } else {
        return NextResponse.json(
          { success: false, error: 'Failed to create video record' },
          { status: 500 }
        )
      }
    } else {
      videoId = video.id
    }

    // Deduct credits
    const deductResult = await deductCredits(user.id, generationType, {
      videoId,
      template: 'grok-imagine',
      duration: `${duration} seconds`,
      brandId,
    })

    if (!deductResult.success) {
      if (video?.id) {
        await supabase.from('videos').delete().eq('id', video.id)
      }
      return NextResponse.json(
        { success: false, error: deductResult.error },
        { status: 402 }
      )
    }

    // Send request to xAI Grok Imagine API
    try {
      const xai = getXAIClient()
      const grokResponse = await xai.generateVideo({
        prompt,
        duration,
        aspect_ratio: aspectRatio,
        resolution,
        ...(imageUrl && { image: { url: imageUrl } }),
      })

      // Update video record with xAI request ID
      await supabase
        .from('videos')
        .update({ 
          external_request_id: grokResponse.request_id,
          status: 'processing',
        })
        .eq('id', videoId)

      console.log('Grok Imagine request started:', grokResponse.request_id)

      return NextResponse.json({
        success: true,
        videoId,
        requestId: grokResponse.request_id,
        status: 'processing',
        creditsRemaining: deductResult.remaining,
      })
    } catch (grokError) {
      console.error('Grok Imagine API error:', grokError)
      
      // Update video status to failed
      await supabase
        .from('videos')
        .update({ status: 'failed', error_message: String(grokError) })
        .eq('id', videoId)

      return NextResponse.json(
        { success: false, error: `Grok Imagine API error: ${grokError}` },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Video generation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate video' },
      { status: 500 }
    )
  }
}

// GET: Get Grok video generation status
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const videoId = request.nextUrl.searchParams.get('id')
    if (!videoId) {
      return NextResponse.json({ error: 'Video ID required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get video from database
    const { data: video } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .eq('user_id', user.id)
      .single()

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    // If we have a completed URL, return it
    if (video.output_url) {
      return NextResponse.json({
        id: video.id,
        status: 'completed',
        output_url: video.output_url,
      })
    }

    // If processing and we have an external request ID, check xAI
    if (video.status === 'processing' && video.external_request_id) {
      try {
        const xai = getXAIClient()
        const result = await xai.getVideoResult(video.external_request_id)

        if (result.url) {
          // Update database with completed video
          await supabase
            .from('videos')
            .update({ 
              status: 'completed',
              output_url: result.url,
            })
            .eq('id', videoId)

          return NextResponse.json({
            id: video.id,
            status: 'completed',
            output_url: result.url,
          })
        }

        if (result.status === 'failed') {
          await supabase
            .from('videos')
            .update({ 
              status: 'failed',
              error_message: result.error,
            })
            .eq('id', videoId)

          return NextResponse.json({
            id: video.id,
            status: 'failed',
            error_message: result.error,
          })
        }

        // Still processing
        return NextResponse.json({
          id: video.id,
          status: 'processing',
          progress: 50, // xAI doesn't give progress, estimate
        })
      } catch (xaiError) {
        console.error('xAI status check error:', xaiError)
      }
    }

    return NextResponse.json(video)
  } catch (error) {
    console.error('Video status error:', error)
    return NextResponse.json({ error: 'Failed to get video status' }, { status: 500 })
  }
}
