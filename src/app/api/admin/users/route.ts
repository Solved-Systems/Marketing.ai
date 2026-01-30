// Admin users API endpoint
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, requireSuperAdmin, logAdminAction } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AdminUsersResponse, UpdateUserRequest } from '@/types/admin'

// GET /api/admin/users - List all users with pagination and search
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''
    const locked = searchParams.get('locked')

    const supabase = createAdminClient()
    const offset = (page - 1) * pageSize

    // Build query
    let query = supabase
      .from('users')
      .select('*', { count: 'exact' })

    // Apply filters
    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`)
    }
    if (role) {
      query = query.eq('role', role)
    }
    if (locked !== null && locked !== '') {
      query = query.eq('is_locked', locked === 'true')
    }

    // Apply pagination and ordering
    const { data: users, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // Get subscription and credit info for each user
    const usersWithDetails = await Promise.all(
      (users || []).map(async (user) => {
        // Get subscription
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select(`
            status,
            current_period_end,
            plan:pricing_plans(name)
          `)
          .eq('user_id', user.id)
          .in('status', ['active', 'trialing'])
          .single()

        // Get current credits
        const now = new Date().toISOString()
        const { data: creditBalance } = await supabase
          .from('credit_balances')
          .select('credits_remaining, credits_used')
          .eq('user_id', user.id)
          .lte('period_start', now)
          .gte('period_end', now)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        const plan = subscription?.plan as { name: string } | { name: string }[] | null
        const planName = Array.isArray(plan) ? plan[0]?.name : plan?.name

        return {
          ...user,
          subscription: subscription
            ? {
                plan_name: planName || 'Unknown',
                status: subscription.status,
                current_period_end: subscription.current_period_end,
              }
            : null,
          credits: creditBalance
            ? {
                remaining: creditBalance.credits_remaining,
                used: creditBalance.credits_used,
                total: creditBalance.credits_remaining + creditBalance.credits_used,
              }
            : null,
        }
      })
    )

    const response: AdminUsersResponse = {
      users: usersWithDetails,
      total: count || 0,
      page,
      pageSize,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Admin users API error:', error)
    if (error instanceof Error && error.message.includes('access required')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

// PATCH /api/admin/users - Update a user (lock/unlock, role change)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, ...updates } = body as { userId: string } & UpdateUserRequest

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Role changes require super_admin
    if (updates.role !== undefined) {
      const adminSession = await requireSuperAdmin()

      // Cannot change own role
      if (userId === adminSession.user.id) {
        return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })
      }

      // Get current user data for logging
      const { data: targetUser } = await supabase
        .from('users')
        .select('email, role')
        .eq('id', userId)
        .single()

      // Update role
      const { error } = await supabase
        .from('users')
        .update({ role: updates.role })
        .eq('id', userId)

      if (error) {
        console.error('Error updating user role:', error)
        return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 })
      }

      await logAdminAction(adminSession.user.id, 'user.role_change', 'user', userId, {
        email: targetUser?.email,
        from_role: targetUser?.role,
        to_role: updates.role,
      })
    }

    // Lock/unlock can be done by any admin
    if (updates.is_locked !== undefined) {
      const adminSession = await requireAdmin()

      // Cannot lock yourself
      if (userId === adminSession.user.id) {
        return NextResponse.json({ error: 'Cannot lock your own account' }, { status: 400 })
      }

      // Get current user data for logging
      const { data: targetUser } = await supabase
        .from('users')
        .select('email, role')
        .eq('id', userId)
        .single()

      // Cannot lock super_admin unless you are also super_admin
      if (targetUser?.role === 'super_admin' && !adminSession.isSuperAdmin) {
        return NextResponse.json({ error: 'Cannot lock super admin account' }, { status: 403 })
      }

      const updateData: Record<string, unknown> = {
        is_locked: updates.is_locked,
      }

      if (updates.is_locked) {
        updateData.locked_at = new Date().toISOString()
        updateData.locked_by = adminSession.user.id
      } else {
        updateData.locked_at = null
        updateData.locked_by = null
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)

      if (error) {
        console.error('Error updating user lock status:', error)
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
      }

      await logAdminAction(
        adminSession.user.id,
        updates.is_locked ? 'user.lock' : 'user.unlock',
        'user',
        userId,
        { email: targetUser?.email }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin users PATCH error:', error)
    if (error instanceof Error && error.message.includes('access required')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
