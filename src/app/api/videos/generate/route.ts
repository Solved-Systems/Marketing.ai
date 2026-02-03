import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { deductCredits, hasEnoughCredits } from '@/lib/billing/credits'
import { getVideoGenerationType } from '@/lib/billing/models'
import type { ModelQuality } from '@/lib/billing/models'
import { startLambdaRender, checkLambdaProgress } from '@/lib/remotion/lambda'

// Background polling to update video status when Lambda render completes
async function pollLambdaCompletion(videoId: string, renderId: string, bucketName: string) {
  const supabase = createAdminClient()
  const maxAttempts = 150 // ~5 minutes at 2s intervals
  let attempts = 0

  while (attempts < maxAttempts) {
    attempts++
    await new Promise(resolve => setTimeout(resolve, 2000))

    try {
      const progress = await checkLambdaProgress(renderId, bucketName)

      if (progress.fatalErrorEncountered) {
        await supabase
          .from('videos')
          .update({
            status: 'failed',
            error_message: progress.errors?.join(', ') || 'Render failed',
          })
          .eq('id', videoId)
        return
      }

      if (progress.done && progress.outputFile) {
        await supabase
          .from('videos')
          .update({
            status: 'completed',
            output_url: progress.outputFile,
            rendered_at: new Date().toISOString(),
          })
          .eq('id', videoId)
        console.log(`Video ${videoId} completed: ${progress.outputFile}`)
        return
      }
    } catch (error) {
      console.error(`Poll error for ${videoId}:`, error)
    }
  }

  // Timeout
  await supabase
    .from('videos')
    .update({
      status: 'failed',
      error_message: 'Render timed out',
    })
    .eq('id', videoId)
}

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

    // Start Lambda render
    try {
      const { renderId, bucketName } = await startLambdaRender(compositionId, inputProps)
      console.log('Lambda render started:', renderId)

      // Store render metadata for status checking
      if (video?.id) {
        await supabase
          .from('videos')
          .update({
            render_id: renderId,
            render_bucket: bucketName,
          })
          .eq('id', video.id)
      }

      // Start background polling to update status when complete
      pollLambdaCompletion(videoId, renderId, bucketName).catch(err => {
        console.error('Lambda polling error:', err)
      })
    } catch (renderError) {
      console.error('Failed to start Lambda render:', renderError)
      // Update video status to failed
      if (video?.id) {
        await supabase
          .from('videos')
          .update({
            status: 'failed',
            error_message: renderError instanceof Error ? renderError.message : 'Lambda render failed',
          })
          .eq('id', video.id)
      }
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
      // If video is processing and has Lambda render info, check progress
      if (video.status === 'processing' && video.render_id && video.render_bucket) {
        try {
          const progress = await checkLambdaProgress(video.render_id, video.render_bucket)
          return NextResponse.json({
            ...video,
            render_progress: progress.progress,
          })
        } catch {
          // Lambda check failed, return stored data
        }
      }
      return NextResponse.json(video)
    }

    return NextResponse.json({ error: 'Video not found' }, { status: 404 })
  } catch (error) {
    console.error('Video status error:', error)
    return NextResponse.json({ error: 'Failed to get video status' }, { status: 500 })
  }
}
