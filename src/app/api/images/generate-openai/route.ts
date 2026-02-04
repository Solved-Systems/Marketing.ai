import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { experimental_generateImage as generateImage } from 'ai'
import { createGateway } from '@ai-sdk/gateway'

export interface OpenAIImageRequest {
  prompt: string
  model?: string
  aspectRatio?: '1:1' | '16:9' | '4:3' | '3:2' | '9:16'
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

    // Check for Vercel AI Gateway authentication
    const gatewayKey = process.env.AI_GATEWAY_API_KEY
    const oidcToken = process.env.VERCEL_OIDC_TOKEN

    if (!gatewayKey && !oidcToken) {
      return NextResponse.json({
        success: false,
        error: 'Vercel AI Gateway not configured. Add AI_GATEWAY_API_KEY or run "vercel env pull" for OIDC token.'
      }, { status: 500 })
    }

    const body = await request.json() as OpenAIImageRequest
    const {
      prompt,
      model = 'bfl/flux-pro-1.1', // Black Forest Labs Flux - high quality image model
      aspectRatio = '1:1',
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

    // Generate image using Vercel AI Gateway
    const gateway = createGateway({
      apiKey: gatewayKey,
    })

    const result = await generateImage({
      model: gateway.imageModel(model as any),
      prompt,
      n,
      aspectRatio,
    })

    // Extract image URLs from result
    const images = result.images.map(img => ({
      url: img.base64 ? `data:image/png;base64,${img.base64}` : '',
    })).filter(img => img.url)

    return NextResponse.json({
      success: true,
      images,
    })
  } catch (error) {
    console.error('Image generation error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate image' },
      { status: 500 }
    )
  }
}
