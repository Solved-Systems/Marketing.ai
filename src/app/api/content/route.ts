import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export interface Content {
  id: string
  user_id: string
  brand_id: string
  type: 'image' | 'video' | 'post'
  title: string | null
  description: string | null
  prompt: string | null
  url: string | null
  thumbnail_url: string | null
  source_url: string | null
  metadata: Record<string, unknown>
  engine: string | null
  status: string
  duration: number | null
  aspect_ratio: string | null
  chat_id: string | null
  created_at: string
  updated_at: string
}

// GET: List content for a brand
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const brandId = request.nextUrl.searchParams.get('brandId')
    const type = request.nextUrl.searchParams.get('type') // 'image', 'video', 'post', or null for all
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50')

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify user
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify brand ownership
    const { data: brand } = await supabase
      .from('brands')
      .select('id')
      .eq('id', brandId)
      .eq('user_id', user.id)
      .single()

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    // Build query
    let query = supabase
      .from('content')
      .select('*')
      .eq('brand_id', brandId)
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (type) {
      query = query.eq('type', type)
    }

    const { data: content, error } = await query

    if (error) {
      console.error('Failed to fetch content:', error)
      return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 })
    }

    return NextResponse.json({ content })
  } catch (error) {
    console.error('Content API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch content' },
      { status: 500 }
    )
  }
}

// POST: Save new content
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      brandId,
      type,
      title,
      description,
      prompt,
      url,
      thumbnailUrl,
      sourceUrl,
      metadata = {},
      engine,
      duration,
      aspectRatio,
      chatId,
    } = body

    if (!brandId || !type || !url) {
      return NextResponse.json({ error: 'Brand ID, type, and URL required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify user
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify brand ownership
    const { data: brand } = await supabase
      .from('brands')
      .select('id')
      .eq('id', brandId)
      .eq('user_id', user.id)
      .single()

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    // Create content
    const { data: content, error } = await supabase
      .from('content')
      .insert({
        user_id: user.id,
        brand_id: brandId,
        type,
        title,
        description,
        prompt,
        url,
        thumbnail_url: thumbnailUrl,
        source_url: sourceUrl,
        metadata,
        engine,
        status: 'completed',
        duration,
        aspect_ratio: aspectRatio,
        chat_id: chatId,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to save content:', error)
      return NextResponse.json({ error: 'Failed to save content' }, { status: 500 })
    }

    return NextResponse.json({ content })
  } catch (error) {
    console.error('Save content error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save content' },
      { status: 500 }
    )
  }
}
