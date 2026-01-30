// Stripe configuration for MRKTCMD

import type { BillingInterval, PlanSlug } from '@/types/billing'

// Stripe Price IDs - set these in environment variables after creating products in Stripe
export const STRIPE_PRICE_IDS: Record<PlanSlug, Record<BillingInterval, string>> = {
  starter: {
    monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || '',
    yearly: process.env.STRIPE_PRICE_STARTER_YEARLY || '',
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
    yearly: process.env.STRIPE_PRICE_PRO_YEARLY || '',
  },
  business: {
    monthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY || '',
    yearly: process.env.STRIPE_PRICE_BUSINESS_YEARLY || '',
  },
}

export function getStripePriceId(plan: PlanSlug, interval: BillingInterval): string {
  const priceId = STRIPE_PRICE_IDS[plan]?.[interval]
  if (!priceId) {
    throw new Error(`No Stripe price ID configured for ${plan} ${interval}`)
  }
  return priceId
}

export function getPlanFromPriceId(priceId: string): { plan: PlanSlug; interval: BillingInterval } | null {
  for (const [plan, intervals] of Object.entries(STRIPE_PRICE_IDS)) {
    for (const [interval, id] of Object.entries(intervals)) {
      if (id === priceId) {
        return { plan: plan as PlanSlug, interval: interval as BillingInterval }
      }
    }
  }
  return null
}

// Public Stripe key for frontend
export function getPublicStripeKey(): string {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  if (!key) {
    throw new Error('Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY')
  }
  return key
}
