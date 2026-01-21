import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hub-signature-256, x-github-event, x-github-delivery',
}

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const hmac = createHmac('sha256', secret)
  hmac.update(payload)
  const expectedSignature = `sha256=${hmac.digest('hex')}`
  return signature === expectedSignature
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const githubWebhookSecret = Deno.env.get('GITHUB_WEBHOOK_SECRET')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get webhook headers
    const signature = req.headers.get('x-hub-signature-256')
    const event = req.headers.get('x-github-event')
    const deliveryId = req.headers.get('x-github-delivery')

    if (!signature || !event) {
      throw new Error('Missing required headers')
    }

    // Get raw body for signature verification
    const body = await req.text()

    // Verify signature
    if (!verifySignature(body, signature, githubWebhookSecret)) {
      console.error('Invalid webhook signature')
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { headers: corsHeaders, status: 401 }
      )
    }

    const payload = JSON.parse(body)

    // Handle different event types
    let repoId: number | undefined
    let repoFullName: string | undefined

    switch (event) {
      case 'push':
        repoId = payload.repository?.id
        repoFullName = payload.repository?.full_name
        break
      case 'release':
        repoId = payload.repository?.id
        repoFullName = payload.repository?.full_name
        break
      case 'pull_request':
        repoId = payload.repository?.id
        repoFullName = payload.repository?.full_name
        break
      case 'installation':
      case 'installation_repositories':
        // Handle app installation events
        console.log(`GitHub App ${event}:`, payload.action)
        return new Response(
          JSON.stringify({ success: true, message: `Handled ${event}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      default:
        console.log(`Unhandled event: ${event}`)
        return new Response(
          JSON.stringify({ success: true, message: 'Event not processed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
    }

    if (!repoId || !repoFullName) {
      throw new Error('Could not extract repository info from payload')
    }

    // Find watched repository
    const { data: watchedRepo, error: repoError } = await supabase
      .from('watched_repositories')
      .select('*, github_connections(*)')
      .eq('repo_id', repoId)
      .eq('is_active', true)
      .single()

    if (repoError || !watchedRepo) {
      console.log(`Repository ${repoFullName} not being watched`)
      return new Response(
        JSON.stringify({ success: true, message: 'Repository not watched' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Check if this event type should be processed
    const watchConfig = watchedRepo.watch_config as {
      events?: string[]
      autoGenerate?: boolean
      autoPublish?: boolean
    } || {}

    const watchedEvents = watchConfig.events || ['release']
    if (!watchedEvents.includes(event)) {
      console.log(`Event ${event} not in watched events for ${repoFullName}`)
      return new Response(
        JSON.stringify({ success: true, message: 'Event type not watched' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Store the event
    const { data: githubEvent, error: eventError } = await supabase
      .from('github_events')
      .insert({
        watched_repository_id: watchedRepo.id,
        event_type: event,
        payload: payload,
        processed: false,
      })
      .select()
      .single()

    if (eventError) {
      throw new Error(`Failed to store event: ${eventError.message}`)
    }

    // Trigger async processing if auto-generate is enabled
    if (watchConfig.autoGenerate) {
      // Call the process-github-event function asynchronously
      const processUrl = `${supabaseUrl}/functions/v1/process-github-event`
      fetch(processUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventId: githubEvent.id }),
      }).catch(err => console.error('Failed to trigger processing:', err))
    }

    return new Response(
      JSON.stringify({
        success: true,
        eventId: githubEvent.id,
        message: `Event ${event} stored successfully`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Webhook error:', error)

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
