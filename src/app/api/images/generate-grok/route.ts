import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'

const XAI_API_BASE = 'https://api.x.ai/v1'

export interface GrokImageRequest {
  prompt: string
  n?: number // 1-10
  response_format?: 'url' | 'b64_json'
}

export interface GrokImageResponse {
  success: boolean
  images?: { url: string }[]
  error?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<GrokImageResponse>> {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const apiKey = process.env.XAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'XAI_API_KEY not configured' }, { status: 500 })
    }

    const body = await request.json() as GrokImageRequest
    const { prompt, n = 1, response_format = 'url' } = body

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

    // Call Grok image generation API
    const response = await fetch(`${XAI_API_BASE}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-2-image',
        prompt,
        n,
        response_format,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Grok image API error:', errorData)
      return NextResponse.json(
        { success: false, error: errorData.error?.message || `API error: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Extract image URLs
    const images = data.data?.map((img: { url?: string; b64_json?: string }) => ({
      url: img.url || (img.b64_json ? `data:image/png;base64,${img.b64_json}` : null),
    })).filter((img: { url: string | null }) => img.url)

    return NextResponse.json({
      success: true,
      images,
    })
  } catch (error) {
    console.error('Image generation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate image' },
      { status: 500 }
    )
  }
}
