// Admin stats API endpoint
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AdminStats } from '@/types/admin'

export async function GET() {
  try {
    await requireAdmin()

    const supabase = createAdminClient()
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Get user stats
    const { data: users } = await supabase.from('users').select('id, role, is_locked')

    const userStats = {
      total: users?.length || 0,
      active: users?.filter((u) => !u.is_locked).length || 0,
      locked: users?.filter((u) => u.is_locked).length || 0,
      byRole: {
        user: users?.filter((u) => u.role === 'user').length || 0,
        admin: users?.filter((u) => u.role === 'admin').length || 0,
        super_admin: users?.filter((u) => u.role === 'super_admin').length || 0,
      },
    }

    // Get subscription stats
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select(`
        status,
        plan:pricing_plans(name)
      `)

    const subStats = {
      total: subscriptions?.length || 0,
      active: subscriptions?.filter((s) => s.status === 'active' || s.status === 'trialing').length || 0,
      canceled: subscriptions?.filter((s) => s.status === 'canceled').length || 0,
      byPlan: {} as Record<string, number>,
    }

    // Count by plan
    subscriptions?.forEach((sub) => {
      const plan = sub.plan as { name: string } | { name: string }[] | null
      const planName = Array.isArray(plan) ? plan[0]?.name : plan?.name
      subStats.byPlan[planName || 'Unknown'] = (subStats.byPlan[planName || 'Unknown'] || 0) + 1
    })

    // Get credit usage stats
    const { data: allUsage } = await supabase
      .from('credit_usage')
      .select('credits_consumed, action_type, created_at')

    const { data: recentUsage } = await supabase
      .from('credit_usage')
      .select('credits_consumed')
      .gte('created_at', thirtyDaysAgo.toISOString())

    const creditStats = {
      totalConsumed: allUsage?.reduce((sum, u) => sum + u.credits_consumed, 0) || 0,
      byType: {} as Record<string, number>,
      last30Days: recentUsage?.reduce((sum, u) => sum + u.credits_consumed, 0) || 0,
    }

    // Count by action type
    allUsage?.forEach((usage) => {
      creditStats.byType[usage.action_type] =
        (creditStats.byType[usage.action_type] || 0) + usage.credits_consumed
    })

    // Get invitation stats
    const { data: invitations } = await supabase
      .from('invitations')
      .select('accepted_at, expires_at')

    const inviteStats = {
      pending: invitations?.filter((i) => !i.accepted_at && new Date(i.expires_at) > now).length || 0,
      accepted: invitations?.filter((i) => i.accepted_at).length || 0,
      expired: invitations?.filter((i) => !i.accepted_at && new Date(i.expires_at) <= now).length || 0,
    }

    const stats: AdminStats = {
      users: userStats,
      subscriptions: subStats,
      credits: creditStats,
      invitations: inviteStats,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Admin stats API error:', error)
    if (error instanceof Error && error.message.includes('access required')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
