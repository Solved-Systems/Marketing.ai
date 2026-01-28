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
    const renderServerUrl = Deno.env.get('RENDER_SERVER_URL')!

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

    const compositionId = job.video_templates?.composition_id || 'FeatureAnnouncement'
    const inputProps = job.input_props

    // Call the Render.com render server
    const renderResponse = await fetch(`${renderServerUrl}/render`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jobId,
        compositionId,
        inputProps,
      }),
    })

    if (!renderResponse.ok) {
      const errorText = await renderResponse.text()
      throw new Error(`Render server error: ${errorText}`)
    }

    const renderResult = await renderResponse.json()

    return new Response(
      JSON.stringify({
        success: true,
        jobId,
        compositionId,
        message: 'Render job started successfully',
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
