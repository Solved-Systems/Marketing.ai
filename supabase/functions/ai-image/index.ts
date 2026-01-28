import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ImageGenerateRequest {
  prompt: string
  brandId?: string
  productId?: string
  imageType: 'social' | 'banner' | 'ad' | 'product'
  size: '1024x1024' | '1024x1792' | '1792x1024'
  style: 'modern' | 'minimalist' | 'bold' | 'corporate'
  includeLogo: boolean
  count?: number
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const aiGatewayKey = Deno.env.get('AI_GATEWAY_API_KEY')!
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const {
      prompt,
      brandId,
      productId,
      imageType,
      size = '1024x1024',
      style = 'modern',
      includeLogo,
      count = 1
    }: ImageGenerateRequest = await req.json()

    if (!prompt) {
      throw new Error('Prompt is required')
    }

    // Build enhanced prompt with brand/product context
    let enhancedPrompt = prompt

    // Add style context
    const styleDescriptions: Record<string, string> = {
      modern: 'modern, clean design with contemporary aesthetics',
      minimalist: 'minimalist design with lots of white space, simple and elegant',
      bold: 'bold, vibrant colors with strong visual impact',
      corporate: 'professional, corporate style suitable for business communications',
    }

    enhancedPrompt = `${enhancedPrompt}. Style: ${styleDescriptions[style]}`

    // Add image type context
    const typeDescriptions: Record<string, string> = {
      social: 'social media marketing graphic',
      banner: 'website banner or header image',
      ad: 'advertising creative for digital marketing',
      product: 'product showcase image',
    }

    enhancedPrompt = `Create a ${typeDescriptions[imageType]}: ${enhancedPrompt}`

    // Fetch brand context if provided
    if (brandId) {
      const { data: brand } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single()

      if (brand) {
        const colors = brand.brand_colors as { primary?: string; secondary?: string } | null
        enhancedPrompt = `${enhancedPrompt}. Brand: ${brand.name}${brand.tagline ? ` - "${brand.tagline}"` : ''}. Use colors: primary ${colors?.primary || '#ff6b00'}, secondary ${colors?.secondary || '#ffffff'}.`
      }
    }

    // Fetch product context if provided
    if (productId) {
      const { data: product } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single()

      if (product) {
        enhancedPrompt = `${enhancedPrompt}. Product: ${product.name}${product.tagline ? ` - "${product.tagline}"` : ''}.`
      }
    }

    // Add quality and format instructions
    enhancedPrompt = `${enhancedPrompt}. High quality, professional marketing image, no text or watermarks.`

    // Generate images using Vercel AI Gateway
    const images: string[] = []
    const numImages = Math.min(count, 4) // Max 4 images

    for (let i = 0; i < numImages; i++) {
      const response = await fetch('https://gateway.ai.vercel.app/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aiGatewayKey}`,
        },
        body: JSON.stringify({
          model: 'openai/gpt-5',
          prompt: enhancedPrompt,
          n: 1,
          size,
          quality: 'standard',
          response_format: 'url',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to generate image')
      }

      const result = await response.json()
      if (result.data && result.data[0]?.url) {
        images.push(result.data[0].url)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          images,
          enhancedPrompt,
          size,
          style,
          imageType,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Image generation error:', error)

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
