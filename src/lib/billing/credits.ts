// Credit management utilities for MRKTCMD

import { createAdminClient } from '@/lib/supabase/admin'
import { CREDIT_COSTS } from './models'
import type { GenerationType, CreditBalance, BillingState, SubscriptionWithPlan } from '@/types/billing'

// Get user's current credit balance
export async function getCurrentCredits(userId: string): Promise<CreditBalance | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('credit_balances')
    .select('*')
    .eq('user_id', userId)
    .gte('period_end', new Date().toISOString())
    .lte('period_start', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    console.error('Error fetching credits:', error)
    return null
  }

  return data
}

// Check if user has enough credits for a generation
export async function hasEnoughCredits(
  userId: string,
  generationType: GenerationType
): Promise<boolean> {
  const balance = await getCurrentCredits(userId)
  if (!balance) return false

  const cost = CREDIT_COSTS[generationType].credits
  return balance.credits_remaining >= cost
}

// Deduct credits for a generation
export async function deductCredits(
  userId: string,
  generationType: GenerationType,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; remaining: number; error?: string }> {
  const supabase = createAdminClient()
  const cost = CREDIT_COSTS[generationType].credits
  const modelUsed = CREDIT_COSTS[generationType].model

  // Get current balance
  const balance = await getCurrentCredits(userId)

  if (!balance) {
    return { success: false, remaining: 0, error: 'No active credit balance' }
  }

  if (balance.credits_remaining < cost) {
    return {
      success: false,
      remaining: balance.credits_remaining,
      error: `Insufficient credits. Need ${cost}, have ${balance.credits_remaining}`,
    }
  }

  // Deduct credits
  const { error: updateError } = await supabase
    .from('credit_balances')
    .update({
      credits_remaining: balance.credits_remaining - cost,
      credits_used: balance.credits_used + cost,
    })
    .eq('id', balance.id)

  if (updateError) {
    console.error('Error deducting credits:', updateError)
    return { success: false, remaining: balance.credits_remaining, error: 'Failed to deduct credits' }
  }

  // Log the usage
  await supabase.from('credit_usage').insert({
    user_id: userId,
    credits_consumed: cost,
    action_type: generationType,
    model_used: modelUsed,
    metadata: metadata || {},
  })

  return {
    success: true,
    remaining: balance.credits_remaining - cost,
  }
}

// Get user's subscription with plan details
export async function getSubscription(userId: string): Promise<SubscriptionWithPlan | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('subscriptions')
    .select(`
      *,
      plan:pricing_plans(*)
    `)
    .eq('user_id', userId)
    .in('status', ['active', 'trialing'])
    .single()

  if (error) {
    console.error('Error fetching subscription:', error)
    return null
  }

  return data as SubscriptionWithPlan
}

// Get full billing state for a user
export async function getBillingState(userId: string): Promise<BillingState> {
  const [subscription, creditBalance] = await Promise.all([
    getSubscription(userId),
    getCurrentCredits(userId),
  ])

  return {
    subscription,
    credits: {
      remaining: creditBalance?.credits_remaining || 0,
      used: creditBalance?.credits_used || 0,
      total: subscription?.plan?.monthly_credits || 0,
      periodEnd: creditBalance?.period_end || null,
    },
    isSubscribed: !!subscription && subscription.status === 'active',
    canGenerate: (creditBalance?.credits_remaining || 0) > 0,
  }
}

// Get user's credit usage history
export async function getCreditUsageHistory(
  userId: string,
  limit: number = 50
): Promise<Array<{
  id: string
  credits_consumed: number
  action_type: GenerationType
  model_used: string | null
  created_at: string
}>> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('credit_usage')
    .select('id, credits_consumed, action_type, model_used, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching usage history:', error)
    return []
  }

  return data
}
