import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_VIDEO_SIZE = 500 * 1024 * 1024 // 500MB
const ALLOWED_VIDEO_TYPES = [
  'video/webm',
  'video/mp4',
  'video/quicktime',
  'video/x-matroska',
]

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const brandId = formData.get('brandId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 })
    }

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
    }

    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: WebM, MP4, MOV, MKV' },
        { status: 400 }
      )
    }

    if (file.size > MAX_VIDEO_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size: 500MB' },
        { status: 400 }
      )
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

    // Generate unique filename
    const ext = file.type === 'video/mp4' ? 'mp4' : 'webm'
    const filename = `${user.id}/videos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Video upload error:', uploadError)
      if (uploadError.message.includes('Bucket not found')) {
        return NextResponse.json(
          { error: 'Storage not configured. Please create a "media" bucket in Supabase.' },
          { status: 500 }
        )
      }
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('media')
      .getPublicUrl(filename)

    // Create content record
    const { data: content, error: contentError } = await supabase
      .from('content')
      .insert({
        user_id: user.id,
        brand_id: brandId,
        type: 'video',
        url: urlData.publicUrl,
        engine: 'video-editor',
        status: 'completed',
        metadata: {
          originalSize: file.size,
          mimeType: file.type,
        },
      })
      .select()
      .single()

    if (contentError) {
      console.error('Failed to create content record:', contentError)
      return NextResponse.json({ error: 'Failed to save content record' }, { status: 500 })
    }

    return NextResponse.json({
      contentId: content.id,
      url: urlData.publicUrl,
    })
  } catch (error) {
    console.error('Video save error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save video' },
      { status: 500 }
    )
  }
}
