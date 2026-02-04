import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'ico']

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { url, brandId } = body

    if (!url) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Fetch the image from URL
    const response = await fetch(url, {
      headers: {
        'Accept': 'image/*',
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.status}` },
        { status: 400 }
      )
    }

    // Get content type and validate
    const contentType = response.headers.get('content-type') || 'image/png'
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Check file size
    if (buffer.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Image too large. Maximum size: 10MB' },
        { status: 400 }
      )
    }

    // Determine extension from URL or content type
    let ext = 'png'
    const urlPath = new URL(url).pathname
    const urlExt = urlPath.split('.').pop()?.toLowerCase()

    if (urlExt && ALLOWED_EXTENSIONS.includes(urlExt)) {
      ext = urlExt
    } else if (contentType.includes('svg')) {
      ext = 'svg'
    } else if (contentType.includes('jpeg') || contentType.includes('jpg')) {
      ext = 'jpg'
    } else if (contentType.includes('webp')) {
      ext = 'webp'
    } else if (contentType.includes('gif')) {
      ext = 'gif'
    } else if (contentType.includes('ico')) {
      ext = 'ico'
    }

    // Generate unique filename
    const folder = brandId ? `brands/${brandId}` : `${user.id}`
    const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('media')
      .upload(filename, buffer, {
        contentType: contentType,
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
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

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: uploadData.path,
      originalUrl: url,
    })
  } catch (error) {
    console.error('Upload from URL error:', error)
    return NextResponse.json(
      { error: 'Failed to upload image from URL' },
      { status: 500 }
    )
  }
}
