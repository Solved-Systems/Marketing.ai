import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export interface OpenAIImageRequest {
  prompt: string
  model?: string
  size?: '1024x1024' | '1792x1024' | '1024x1792'
  quality?: 'standard' | 'hd'
  n?: number
}

export interface OpenAIImageResponse {
  success: boolean
  images?: { url: string }[]
  error?: string
  model?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<OpenAIImageResponse>> {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Check for Vercel AI Gateway authentication
    const gatewayKey = process.env.AI_GATEWAY_API_KEY

    if (!gatewayKey) {
      return NextResponse.json({
        success: false,
        error: 'AI_GATEWAY_API_KEY not configured'
      }, { status: 500 })
    }

    const body = await request.json() as OpenAIImageRequest
    const { prompt, n = 1 } = body

    if (!prompt) {
      return NextResponse.json({ success: false, error: 'Prompt is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify user exists
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    // Use OpenAI GPT-5.2 via Vercel AI Gateway chat completions
    // GPT-5.2 supports image generation through the chat endpoint
    const modelId = 'openai/gpt-5.2'

    const response = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${gatewayKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          {
            role: 'user',
            content: `Create an image: ${prompt}`
          }
        ],
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('OpenAI API error:', errorData)
      return NextResponse.json({
        success: false,
        error: errorData.error?.message || `API error: ${response.status}`
      }, { status: response.status })
    }

    const result = await response.json()
    console.log('GPT-5.2 response:', JSON.stringify(result, null, 2))

    // Extract images from chat completion response
    // Images are in choices[0].message.images array
    const message = result.choices?.[0]?.message
    const messageImages = message?.images as Array<{
      type: string
      image_url: { url: string }
    }> | undefined

    // Log for debugging
    console.log('Message content:', message?.content)
    console.log('Message images:', messageImages)

    if (!messageImages || messageImages.length === 0) {
      // Fallback to Imagen if GPT-5.2 doesn't return images
      console.log('GPT-5.2 did not return images, falling back to Imagen...')

      const imagenResponse = await fetch('https://ai-gateway.vercel.sh/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${gatewayKey}`,
        },
        body: JSON.stringify({
          model: 'google/imagen-4.0-generate-001',
          prompt: prompt,
          n: Math.min(n, 4),
        }),
      })

      if (!imagenResponse.ok) {
        const errorData = await imagenResponse.json().catch(() => ({}))
        return NextResponse.json({
          success: false,
          error: errorData.error?.message || `Imagen API error: ${imagenResponse.status}`
        }, { status: imagenResponse.status })
      }

      const imagenResult = await imagenResponse.json()
      const imagenImages = imagenResult.data as Array<{ url?: string; b64_json?: string }> | undefined

      if (!imagenImages || imagenImages.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No images generated'
        }, { status: 500 })
      }

      const images = imagenImages
        .map(img => ({
          url: img.url || (img.b64_json ? `data:image/png;base64,${img.b64_json}` : ''),
        }))
        .filter(img => img.url)

      return NextResponse.json({
        success: true,
        images,
        model: 'Google Imagen 4',
      })
    }

    const images = messageImages
      .map(img => ({
        url: img.image_url?.url || '',
      }))
      .filter(img => img.url)

    if (images.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No images generated'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      images,
      model: 'OpenAI GPT-5.2',
    })
  } catch (error) {
    console.error('Image generation error:', error)

    // Extract detailed error message
    let errorMessage = 'Failed to generate image'
    if (error instanceof Error) {
      errorMessage = error.message
    }
    // Handle API errors
    if (error && typeof error === 'object' && 'error' in error) {
      const apiError = error as { error?: { message?: string } }
      if (apiError.error?.message) {
        errorMessage = apiError.error.message
      }
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
