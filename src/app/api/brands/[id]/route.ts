import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/brands/[id] - Get a single brand
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Get brand (verify ownership)
    const { data: brand, error } = await supabase
      .from('brands')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    return NextResponse.json(brand)
  } catch (error) {
    console.error('Brand GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch brand' }, { status: 500 })
  }
}

// PATCH /api/brands/[id] - Update a brand
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      description,
      tagline,
      website_url,
      logo_url,
      primary_color,
      secondary_color,
      accent_color,
      github_repo,
      metadata,
    } = body

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

    // Verify ownership
    const { data: existingBrand } = await supabase
      .from('brands')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!existingBrand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    // Build update object (only include provided fields)
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (tagline !== undefined) updateData.tagline = tagline
    if (website_url !== undefined) updateData.website_url = website_url
    if (logo_url !== undefined) updateData.logo_url = logo_url
    if (primary_color !== undefined) updateData.primary_color = primary_color
    if (secondary_color !== undefined) updateData.secondary_color = secondary_color
    if (accent_color !== undefined) updateData.accent_color = accent_color
    if (github_repo !== undefined) updateData.github_repo = github_repo
    if (metadata !== undefined) updateData.metadata = metadata

    // Update brand
    const { data: brand, error } = await supabase
      .from('brands')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating brand:', error)
      return NextResponse.json({ error: 'Failed to update brand' }, { status: 500 })
    }

    return NextResponse.json(brand)
  } catch (error) {
    console.error('Brand PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update brand' }, { status: 500 })
  }
}

// DELETE /api/brands/[id] - Delete a brand
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Delete brand (with ownership check)
    const { error } = await supabase
      .from('brands')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting brand:', error)
      return NextResponse.json({ error: 'Failed to delete brand' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Brand DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete brand' }, { status: 500 })
  }
}
