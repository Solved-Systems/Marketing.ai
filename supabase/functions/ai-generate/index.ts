import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.27.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GenerateRequest {
  prompt: string
  projectId?: string
  brandId?: string
  productId?: string
  templateId?: string
  assetIds?: string[]
  contentType?: 'video' | 'image' | 'post'
}

const SYSTEM_PROMPT = `You are a video script generator for MRKTCMD, an AI-powered marketing automation platform.

Given a user's prompt and available assets, generate inputProps for a Remotion video template.

Available templates and their schemas:

1. FeatureAnnouncement - For announcing new features
   Schema: {
     title: string,
     subtitle: string,
     features: [{ icon: string (zap|shield|sparkles|star|rocket|heart|globe|lock|check), title: string, description: string }],
     brandColors: { primary: string (hex), secondary: string (hex), background: string (hex) },
     logoUrl: string,
     ctaText: string,
     ctaUrl: string
   }

2. ProductShowcase - For showcasing products
   Schema: {
     productName: string,
     tagline: string,
     images: string[],
     features: string[],
     brandColors: { primary: string (hex), secondary: string (hex) },
     ctaText: string
   }

3. SocialPromo - For social media promotions
   Schema: {
     headline: string,
     subheadline: string,
     backgroundImage: string,
     logoUrl: string,
     brandColor: string (hex)
   }

Respond ONLY with a valid JSON object containing:
- templateId: The recommended template ID
- inputProps: The inputProps object matching the template schema
- reasoning: Brief explanation of your choices

Make the content engaging, professional, and suitable for the platform.`

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

    const { prompt, projectId, brandId, productId, templateId, assetIds, contentType = 'video' }: GenerateRequest = await req.json()

    if (!prompt) {
      throw new Error('Prompt is required')
    }

    // Fetch brand context if provided
    let brandContext = ''
    if (brandId) {
      const { data: brand } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single()

      if (brand) {
        const colors = brand.brand_colors as { primary?: string; secondary?: string; accent?: string; background?: string } | null
        brandContext = `\n\nBrand Context:
- Brand Name: ${brand.name}
- Tagline: ${brand.tagline || 'N/A'}
- Description: ${brand.description || 'N/A'}
- Primary Color: ${colors?.primary || '#ff6b00'}
- Secondary Color: ${colors?.secondary || '#ffffff'}
- Logo URL: ${brand.logo_url || 'N/A'}
- Website: ${brand.website_url || 'N/A'}

IMPORTANT: Use the brand colors and information in the generated content.`
      }
    }

    // Fetch product context if provided
    let productContext = ''
    if (productId) {
      const { data: product } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single()

      if (product) {
        const features = product.features as Array<{ icon?: string; title?: string; description?: string }> | null
        productContext = `\n\nProduct Context:
- Product Name: ${product.name}
- Tagline: ${product.tagline || 'N/A'}
- Description: ${product.description || 'N/A'}
- Category: ${product.category || 'N/A'}
- Pricing: ${product.pricing || 'N/A'}
- Features: ${features?.map(f => `${f.title}: ${f.description}`).join(', ') || 'N/A'}

IMPORTANT: Incorporate the product information and features into the generated content.`
      }
    }

    // Fetch available assets if provided
    let assetsContext = ''
    if (assetIds && assetIds.length > 0) {
      const { data: assets } = await supabase
        .from('assets')
        .select('*')
        .in('id', assetIds)

      if (assets && assets.length > 0) {
        assetsContext = `\n\nAvailable assets:\n${assets.map(a => `- ${a.name} (${a.file_type}): ${a.file_path}`).join('\n')}`
      }
    }

    // Fetch template if specified
    let templateContext = ''
    if (templateId) {
      const { data: template } = await supabase
        .from('video_templates')
        .select('*')
        .eq('id', templateId)
        .single()

      if (template) {
        templateContext = `\n\nSelected template: ${template.name}\nSchema: ${JSON.stringify(template.input_schema)}`
      }
    }

    // Generate content with Claude
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `${prompt}${brandContext}${productContext}${assetsContext}${templateContext}`,
        },
      ],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Parse the JSON response
    let generatedContent
    try {
      // Extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        generatedContent = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (parseError) {
      throw new Error(`Failed to parse AI response: ${parseError.message}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: generatedContent,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('AI generation error:', error)

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
