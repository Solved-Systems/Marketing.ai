// Admin invitations API endpoint
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, requireSuperAdmin, logAdminAction } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'
import type { CreateInvitationRequest, AdminInvitationsResponse } from '@/types/admin'

// Generate a secure random token
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// GET /api/admin/invites - List all invitations
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || 'pending' // pending, accepted, expired, all

    const supabase = createAdminClient()
    const now = new Date().toISOString()

    let query = supabase
      .from('invitations')
      .select(`
        *,
        inviter:users!invitations_invited_by_fkey(id, email, name)
      `)
      .order('created_at', { ascending: false })

    // Apply status filter
    if (status === 'pending') {
      query = query.is('accepted_at', null).gte('expires_at', now)
    } else if (status === 'accepted') {
      query = query.not('accepted_at', 'is', null)
    } else if (status === 'expired') {
      query = query.is('accepted_at', null).lt('expires_at', now)
    }

    const { data: invitations, error, count } = await query

    if (error) {
      console.error('Error fetching invitations:', error)
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 })
    }

    const response: AdminInvitationsResponse = {
      invitations: invitations || [],
      total: count || invitations?.length || 0,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Admin invites GET error:', error)
    if (error instanceof Error && error.message.includes('access required')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

// POST /api/admin/invites - Create a new invitation
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateInvitationRequest
    const { email, role } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Only super_admin can invite admin or super_admin roles
    let adminSession
    if (role === 'admin' || role === 'super_admin') {
      adminSession = await requireSuperAdmin()
    } else {
      adminSession = await requireAdmin()
    }

    const supabase = createAdminClient()

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 })
    }

    // Check if there's already a pending invitation for this email
    const now = new Date().toISOString()
    const { data: existingInvite } = await supabase
      .from('invitations')
      .select('id')
      .eq('email', email)
      .is('accepted_at', null)
      .gte('expires_at', now)
      .single()

    if (existingInvite) {
      return NextResponse.json({ error: 'Pending invitation already exists for this email' }, { status: 400 })
    }

    // Get invitation settings for expiry
    const { data: settings } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'invitation_settings')
      .single()

    const expiryDays = settings?.value?.expiry_days || 7
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiryDays)

    // Create invitation
    const token = generateToken()
    const { data: invitation, error } = await supabase
      .from('invitations')
      .insert({
        email,
        role: role || 'user',
        token,
        invited_by: adminSession.user.id,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating invitation:', error)
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
    }

    await logAdminAction(adminSession.user.id, 'invitation.create', 'invitation', invitation.id, {
      email,
      role: role || 'user',
    })

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        token: invitation.token,
        expires_at: invitation.expires_at,
      },
    })
  } catch (error) {
    console.error('Admin invites POST error:', error)
    if (error instanceof Error && error.message.includes('access required')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

// DELETE /api/admin/invites - Delete an invitation
export async function DELETE(request: NextRequest) {
  try {
    const adminSession = await requireAdmin()

    const searchParams = request.nextUrl.searchParams
    const inviteId = searchParams.get('id')

    if (!inviteId) {
      return NextResponse.json({ error: 'Invitation ID required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get invitation details for logging
    const { data: invitation } = await supabase
      .from('invitations')
      .select('email, role')
      .eq('id', inviteId)
      .single()

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    // Delete invitation
    const { error } = await supabase
      .from('invitations')
      .delete()
      .eq('id', inviteId)

    if (error) {
      console.error('Error deleting invitation:', error)
      return NextResponse.json({ error: 'Failed to delete invitation' }, { status: 500 })
    }

    await logAdminAction(adminSession.user.id, 'invitation.delete', 'invitation', inviteId, {
      email: invitation.email,
      role: invitation.role,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin invites DELETE error:', error)
    if (error instanceof Error && error.message.includes('access required')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
