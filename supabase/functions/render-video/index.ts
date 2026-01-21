import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RenderRequest {
  jobId: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const remotionFunctionName = Deno.env.get('REMOTION_FUNCTION_NAME') || 'remotion-render-videoforge'
    const remotionSiteUrl = Deno.env.get('REMOTION_SITE_URL')!
    const awsRegion = Deno.env.get('AWS_REGION') || 'us-east-1'
    const awsAccessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID')!
    const awsSecretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { jobId }: RenderRequest = await req.json()

    if (!jobId) {
      throw new Error('Job ID is required')
    }

    // Fetch the video job
    const { data: job, error: jobError } = await supabase
      .from('video_jobs')
      .select('*, video_templates(*)')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      throw new Error(`Job not found: ${jobError?.message}`)
    }

    // Update job status to queued
    await supabase
      .from('video_jobs')
      .update({ status: 'queued', started_at: new Date().toISOString() })
      .eq('id', jobId)

    // Prepare Remotion Lambda render request
    const compositionId = job.video_templates?.composition_id || 'FeatureAnnouncement'
    const inputProps = job.input_props

    // Call Remotion Lambda to start rendering
    // Note: In production, you'd use the actual Remotion Lambda SDK
    // This is a simplified version for demonstration

    const renderPayload = {
      functionName: remotionFunctionName,
      region: awsRegion,
      serveUrl: remotionSiteUrl,
      composition: compositionId,
      inputProps,
      codec: 'h264',
      outName: `${jobId}.mp4`,
    }

    // For now, simulate the render process
    // In production, you'd call: renderMediaOnLambda(renderPayload)

    // Update job to rendering
    await supabase
      .from('video_jobs')
      .update({
        status: 'rendering',
        render_id: `render-${jobId}`,
        progress: 0,
      })
      .eq('id', jobId)

    // In production, you'd poll for render status or use webhooks
    // For demo, we'll mark as completed after a delay
    // This would be handled by a separate polling function

    return new Response(
      JSON.stringify({
        success: true,
        jobId,
        compositionId,
        message: 'Render job queued successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Render error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
