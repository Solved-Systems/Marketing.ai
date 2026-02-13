import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkGrokVideoStatus } from '@/lib/video/grok'

/**
 * GET /api/video/status?requestId=...&videoId=...
 * Polls Grok video generation status. Used by the chat VideoStartResult
 * component to auto-poll until the video is ready.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const requestId = request.nextUrl.searchParams.get('requestId')
    const videoId = request.nextUrl.searchParams.get('videoId')

    if (!requestId) {
      return NextResponse.json({ error: 'requestId is required' }, { status: 400 })
    }

    // Check xAI directly
    const result = await checkGrokVideoStatus(requestId)

    // If completed and we have a videoId, update the DB record
    if (result.status === 'completed' && result.outputUrl && videoId) {
      const supabase = createAdminClient()
      await supabase
        .from('videos')
        .update({
          status: 'completed',
          output_url: result.outputUrl,
        })
        .eq('id', videoId)
    }

    // If failed and we have a videoId, update the DB record
    if (result.status === 'failed' && videoId) {
      const supabase = createAdminClient()
      await supabase
        .from('videos')
        .update({
          status: 'failed',
          error_message: result.error || 'Generation failed',
        })
        .eq('id', videoId)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Video status check error:', error)
    return NextResponse.json(
      { status: 'error', error: 'Failed to check video status' },
      { status: 500 }
    )
  }
}
