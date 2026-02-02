import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { deductCredits, hasEnoughCredits } from '@/lib/billing/credits'
import { getVideoGenerationType } from '@/lib/billing/models'
import type { ModelQuality } from '@/lib/billing/models'

const RENDER_SERVER_URL = process.env.RENDER_SERVER_URL || 'https://marketing-ai-xy6r.onrender.com'

export interface VideoGenerationRequest {
  brandId: string
  title: string
  description: string
  template: 'feature' | 'product' | 'social' | 'release'
  duration: '15 seconds' | '30 seconds' | '60 seconds'
  style: 'Modern' | 'Minimal' | 'Bold' | 'Playful'
  callToAction: string
  features: string
  quality?: ModelQuality
}

export interface VideoGenerationResponse {
  success: boolean
  videoId?: string
  jobId?: string
  status?: 'queued' | 'processing' | 'completed' | 'failed'
  error?: string
  creditsRemaining?: number
}

// Map template names to composition IDs
function getCompositionId(template: string, duration: string): string {
  const templateMap: Record<string, string> = {
    'feature': 'FeatureAnnouncement',
    'product': 'ProductDemo',
    'social': 'SocialTeaser',
    'release': 'ReleaseNotes',
  }
  const durationMap: Record<string, string> = {
    '15 seconds': '15',
    '30 seconds': '30',
    '60 seconds': '60',
  }
  return `${templateMap[template] || 'FeatureAnnouncement'}-${durationMap[duration] || '30'}`
}

// POST: Generate a new video
export async function POST(request: NextRequest): Promise<NextResponse<VideoGenerationResponse>> {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as VideoGenerationRequest
    const {
      brandId,
      title,
      description,
      template,
      duration,
      style,
      callToAction,
      features,
      quality = 'default',
    } = body

    // Validate required fields
    if (!brandId || !title || !template) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: brandId, title, template' },
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

    // Get brand (verify ownership and get colors)
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

    // Parse features into array
    const featuresArray = features
      .split('\n')
      .map((f: string) => f.trim())
      .filter((f: string) => f.length > 0)

    // Create video record in database
    const videoData = {
      user_id: user.id,
      brand_id: brandId,
      title,
      description,
      template,
      duration,
      style,
      call_to_action: callToAction,
      features: featuresArray,
      status: 'processing' as const,
      quality,
      primary_color: brand.primary_color || '#6366f1',
      secondary_color: brand.secondary_color || '#8b5cf6',
      accent_color: brand.accent_color || '#22c55e',
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
      // If the table doesn't exist, generate a temporary ID
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
      template,
      duration,
      brandId,
    })

    if (!deductResult.success) {
      // Rollback: delete the video record if it was created
      if (video?.id) {
        await supabase.from('videos').delete().eq('id', video.id)
      }
      return NextResponse.json(
        { success: false, error: deductResult.error },
        { status: 402 }
      )
    }

    // Build composition ID and input props for the render server
    const compositionId = getCompositionId(template, duration)
    const inputProps = {
      title,
      description,
      features: featuresArray,
      callToAction: callToAction || 'Learn More',
      primaryColor: brand.primary_color || '#6366f1',
      secondaryColor: brand.secondary_color || '#8b5cf6',
      accentColor: brand.accent_color || '#22c55e',
      brandName: brand.name,
      style,
    }

    // Send render request to the Render server
    try {
      const renderResponse = await fetch(`${RENDER_SERVER_URL}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          compositionId,
          inputProps,
          videoId,
        }),
      })

      if (!renderResponse.ok) {
        const errorData = await renderResponse.json().catch(() => ({}))
        console.error('Render server error:', errorData)
        // Don't fail the request - the video is created and credits are deducted
        // The render will be retried or marked as failed
      } else {
        const renderData = await renderResponse.json()
        console.log('Render job started:', renderData.jobId)
      }
    } catch (renderError) {
      // Log but don't fail - the render server might be waking up (free tier)
      console.error('Failed to contact render server:', renderError)
    }

    return NextResponse.json({
      success: true,
      videoId,
      jobId: videoId,
      status: 'processing',
      creditsRemaining: deductResult.remaining,
    })
  } catch (error) {
    console.error('Video generation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate video' },
      { status: 500 }
    )
  }
}

// GET: Get video/render status
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

    // Try to get video from database first
    const { data: video } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .eq('user_id', user.id)
      .single()

    if (video) {
      return NextResponse.json(video)
    }

    // If not in database, check render server for status
    try {
      const statusResponse = await fetch(`${RENDER_SERVER_URL}/render/${videoId}`)
      if (statusResponse.ok) {
        const statusData = await statusResponse.json()
        return NextResponse.json({
          id: videoId,
          status: statusData.status,
          progress: statusData.progress,
          output_url: statusData.outputUrl,
          error_message: statusData.error,
        })
      }
    } catch {
      // Render server not available
    }

    return NextResponse.json({ error: 'Video not found' }, { status: 404 })
  } catch (error) {
    console.error('Video status error:', error)
    return NextResponse.json({ error: 'Failed to get video status' }, { status: 500 })
  }
}
