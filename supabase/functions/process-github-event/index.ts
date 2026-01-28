import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.27.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProcessRequest {
  eventId: string
}

const ANALYSIS_SYSTEM_PROMPT = `You are a code analyst and marketing specialist for MRKTCMD.

Your task is to analyze GitHub release or commit information and extract user-facing features that would be interesting to announce in a video.

For each feature you identify:
1. Focus on USER BENEFITS, not technical implementation details
2. Write engaging, non-technical descriptions
3. Suggest an appropriate icon (from: zap, shield, sparkles, star, rocket, heart, globe, lock, check)

Respond with a JSON object:
{
  "title": "Main announcement title",
  "subtitle": "Engaging subtitle",
  "features": [
    { "icon": "string", "title": "Feature name", "description": "User benefit description" }
  ],
  "ctaText": "Call to action text",
  "summary": "Brief summary for social media caption"
}

Keep the tone professional but exciting. Maximum 3 features.`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')!
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const anthropic = new Anthropic({ apiKey: anthropicApiKey })

    const { eventId }: ProcessRequest = await req.json()

    if (!eventId) {
      throw new Error('Event ID is required')
    }

    // Fetch the GitHub event
    const { data: event, error: eventError } = await supabase
      .from('github_events')
      .select(`
        *,
        watched_repositories (
          *,
          projects (*),
          github_connections (*)
        )
      `)
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      throw new Error(`Event not found: ${eventError?.message}`)
    }

    const watchedRepo = event.watched_repositories as {
      project_id: string
      projects: { brand_config: Record<string, unknown> }
    }

    // Extract relevant information based on event type
    let analysisContext = ''
    const payload = event.payload as Record<string, unknown>

    switch (event.event_type) {
      case 'release': {
        const release = payload as {
          release: {
            tag_name: string
            name: string
            body: string
          }
          repository: {
            full_name: string
            description: string
          }
        }
        analysisContext = `
Repository: ${release.repository?.full_name}
Description: ${release.repository?.description || 'No description'}
Release: ${release.release?.tag_name}
Release Name: ${release.release?.name || 'Unnamed'}
Release Notes:
${release.release?.body || 'No release notes provided'}
`
        break
      }
      case 'push': {
        const push = payload as {
          ref: string
          commits: Array<{ message: string; added: string[]; modified: string[] }>
          repository: { full_name: string; description: string }
        }
        const commits = push.commits || []
        const commitMessages = commits.map((c) => c.message).join('\n')
        analysisContext = `
Repository: ${push.repository?.full_name}
Description: ${push.repository?.description || 'No description'}
Branch: ${push.ref}
Commits:
${commitMessages || 'No commits'}
`
        break
      }
      default:
        throw new Error(`Unsupported event type: ${event.event_type}`)
    }

    // Analyze with Claude
    const analysisMessage = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: ANALYSIS_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analyze this ${event.event_type} and create a feature announcement:\n\n${analysisContext}`,
        },
      ],
    })

    const analysisText = analysisMessage.content[0].type === 'text'
      ? analysisMessage.content[0].text
      : ''

    // Parse the analysis
    let analysis
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in analysis')
      }
    } catch (parseError) {
      throw new Error(`Failed to parse analysis: ${parseError.message}`)
    }

    // Get brand colors from project
    const brandConfig = watchedRepo.projects?.brand_config as {
      primary?: string
      secondary?: string
      background?: string
    } || {}

    // Create video job
    const inputProps = {
      title: analysis.title,
      subtitle: analysis.subtitle,
      features: analysis.features,
      brandColors: {
        primary: brandConfig.primary || '#7c3aed',
        secondary: brandConfig.secondary || '#1e293b',
        background: brandConfig.background || '#ffffff',
      },
      logoUrl: '',
      ctaText: analysis.ctaText || 'Learn More',
      ctaUrl: '',
    }

    // Find the FeatureAnnouncement template
    const { data: template } = await supabase
      .from('video_templates')
      .select('id')
      .eq('composition_id', 'FeatureAnnouncement')
      .eq('is_public', true)
      .single()

    const { data: videoJob, error: jobError } = await supabase
      .from('video_jobs')
      .insert({
        project_id: watchedRepo.project_id,
        template_id: template?.id,
        status: 'pending',
        input_props: inputProps,
        render_metadata: {
          source: 'github',
          event_type: event.event_type,
          event_id: eventId,
          analysis_summary: analysis.summary,
        },
      })
      .select()
      .single()

    if (jobError) {
      throw new Error(`Failed to create video job: ${jobError.message}`)
    }

    // Mark event as processed
    await supabase
      .from('github_events')
      .update({ processed: true, video_job_id: videoJob.id })
      .eq('id', eventId)

    // Trigger video rendering
    const renderUrl = `${supabaseUrl}/functions/v1/render-video`
    fetch(renderUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jobId: videoJob.id }),
    }).catch(err => console.error('Failed to trigger render:', err))

    return new Response(
      JSON.stringify({
        success: true,
        videoJobId: videoJob.id,
        analysis: analysis,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Process error:', error)

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
