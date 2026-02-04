import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'

const ROUSSEL_GATEWAY_URL = process.env.ROUSSEL_GATEWAY_URL || 'https://api.roussel.io/v1'

export interface OpenAIImageRequest {
  prompt: string
  model?: 'dall-e-3' | 'dall-e-2' | 'gpt-image-1'
  size?: '1024x1024' | '1792x1024' | '1024x1792' | '512x512' | '256x256'
  quality?: 'standard' | 'hd'
  style?: 'vivid' | 'natural'
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

    const apiKey = process.env.ROUSSEL_API_KEY || process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'OpenAI/Roussel API key not configured' }, { status: 500 })
    }

    const body = await request.json() as OpenAIImageRequest
    const {
      prompt,
      model = 'gpt-image-1',
      size = '1024x1024',
      quality = 'standard',
      style = 'vivid',
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

    // Determine the API endpoint (Roussel Gateway or direct OpenAI)
    const baseUrl = process.env.ROUSSEL_GATEWAY_URL || 'https://api.openai.com/v1'

    // Call OpenAI image generation API (via Roussel Gateway or direct)
    const response = await fetch(`${baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        prompt,
        n,
        size,
        ...(model === 'dall-e-3' && { quality, style }),
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('OpenAI image API error:', errorData)
      return NextResponse.json(
        { success: false, error: errorData.error?.message || `API error: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Extract image URLs (OpenAI returns data array with url or b64_json)
    const images = data.data?.map((img: { url?: string; b64_json?: string }) => ({
      url: img.url || (img.b64_json ? `data:image/png;base64,${img.b64_json}` : null),
    })).filter((img: { url: string | null }) => img.url)

    return NextResponse.json({
      success: true,
      images,
    })
  } catch (error) {
    console.error('OpenAI image generation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate image' },
      { status: 500 }
    )
  }
}
