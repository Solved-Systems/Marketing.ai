import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { createOpenAI } from '@ai-sdk/openai'
import { experimental_generateImage as generateImage } from 'ai'

export interface OpenAIImageRequest {
  prompt: string
  model?: 'dall-e-3' | 'dall-e-2' | 'gpt-image-1'
  size?: '1024x1024' | '1792x1024' | '1024x1792' | '512x512' | '256x256'
  n?: number
}

export interface OpenAIImageResponse {
  success: boolean
  images?: { url: string }[]
  error?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<OpenAIImageResponse>> {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Use Vercel AI Gateway with OIDC token
    const oidcToken = process.env.VERCEL_OIDC_TOKEN
    if (!oidcToken) {
      return NextResponse.json({ success: false, error: 'Vercel OIDC token not configured' }, { status: 500 })
    }

    const body = await request.json() as OpenAIImageRequest
    const {
      prompt,
      model = 'gpt-image-1',
      size = '1024x1024',
      n = 1
    } = body

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

    // Create OpenAI client via Vercel AI Gateway
    const openai = createOpenAI({
      baseURL: 'https://gateway.ai.vercel.app/v1',
      headers: {
        Authorization: `Bearer ${oidcToken}`,
      },
    })

    // Generate image using Vercel AI SDK
    const result = await generateImage({
      model: openai.image(model),
      prompt,
      n,
      size,
    })

    // Extract image URLs from result
    const images = result.images.map(img => ({
      url: img.base64 ? `data:image/png;base64,${img.base64}` : (img as unknown as { url?: string }).url || '',
    })).filter(img => img.url)

    return NextResponse.json({
      success: true,
      images,
    })
  } catch (error) {
    console.error('OpenAI image generation error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate image' },
      { status: 500 }
    )
  }
}
