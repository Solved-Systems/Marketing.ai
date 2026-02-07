import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'

const XAI_API_BASE = 'https://api.x.ai/v1'

// Supported image sizes
export const GROK_IMAGE_SIZES = [
  { value: '1024x1024', label: 'Square (1024×1024)', aspectRatio: '1:1' },
  { value: '1536x1024', label: 'Landscape (1536×1024)', aspectRatio: '3:2' },
  { value: '1024x1536', label: 'Portrait (1024×1536)', aspectRatio: '2:3' },
  { value: '1792x1024', label: 'Wide (1792×1024)', aspectRatio: '16:9' },
  { value: '1024x1792', label: 'Tall (1024×1792)', aspectRatio: '9:16' },
  { value: '1344x768', label: 'Widescreen (1344×768)', aspectRatio: '16:9' },
  { value: '768x1344', label: 'Mobile (768×1344)', aspectRatio: '9:16' },
] as const

export type GrokImageSize = typeof GROK_IMAGE_SIZES[number]['value']
export type GrokAspectRatio = '1:1' | '3:2' | '2:3' | '16:9' | '9:16' | '4:3' | '3:4'

export interface GrokImageRequest {
  prompt: string
  n?: number // 1-10
  response_format?: 'url' | 'b64_json'
  size?: GrokImageSize
  aspectRatio?: GrokAspectRatio
  quality?: 'standard' | 'hd'
}

export interface GrokImageResponse {
  success: boolean
  images?: { url: string; size?: string }[]
  error?: string
  requestedSize?: string
  requestedAspectRatio?: string
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
    const {
      prompt,
      n = 1,
      // response_format and quality are part of the API but not currently used
      size = '1024x1024',
      aspectRatio,
    } = body

    if (!prompt) {
      return NextResponse.json({ success: false, error: 'Prompt is required' }, { status: 400 })
    }

    // Determine final size based on aspectRatio if provided
    let finalSize = size
    if (aspectRatio && !size) {
      const sizeForRatio = GROK_IMAGE_SIZES.find(s => s.aspectRatio === aspectRatio)
      if (sizeForRatio) {
        finalSize = sizeForRatio.value
      }
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
    const requestBody = {
      model: 'grok-2-image',
      prompt,
      n: Math.min(n, 4), // Max 4 images
    }

    console.log('Grok API request:', JSON.stringify(requestBody))

    const response = await fetch(`${XAI_API_BASE}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
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
      size: finalSize,
    })).filter((img: { url: string | null }) => img.url)

    return NextResponse.json({
      success: true,
      images,
      requestedSize: finalSize,
      requestedAspectRatio: aspectRatio || GROK_IMAGE_SIZES.find(s => s.value === finalSize)?.aspectRatio,
    })
  } catch (error) {
    console.error('Image generation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate image' },
      { status: 500 }
    )
  }
}
