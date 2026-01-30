// Billing state API endpoint
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { BillingState } from '@/types/billing'

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    // Get user from Supabase
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (!user) {
      // User not synced yet, return empty state
      const emptyState: BillingState = {
        subscription: null,
        credits: {
          remaining: 0,
          used: 0,
          total: 0,
          periodEnd: null,
        },
        isSubscribed: false,
        canGenerate: false,
      }
      return NextResponse.json(emptyState)
    }

    // Get subscription with plan
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select(`
        *,
        plan:pricing_plans(*)
      `)
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .single()

    // Get current credit balance
    const now = new Date().toISOString()
    const { data: creditBalance } = await supabase
      .from('credit_balances')
      .select('*')
      .eq('user_id', user.id)
      .lte('period_start', now)
      .gte('period_end', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const billingState: BillingState = {
      subscription: subscription || null,
      credits: {
        remaining: creditBalance?.credits_remaining || 0,
        used: creditBalance?.credits_used || 0,
        total: subscription?.plan?.monthly_credits || 0,
        periodEnd: creditBalance?.period_end || null,
      },
      isSubscribed: !!subscription && subscription.status === 'active',
      canGenerate: (creditBalance?.credits_remaining || 0) > 0,
    }

    return NextResponse.json(billingState)
  } catch (error) {
    console.error('Billing API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch billing state' },
      { status: 500 }
    )
  }
}
