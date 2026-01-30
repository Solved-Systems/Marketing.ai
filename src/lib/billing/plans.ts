// MRKTCMD Pricing Plans Configuration

import type { PlanDisplay, PlanSlug } from '@/types/billing'

export const PLANS: Record<PlanSlug, PlanDisplay> = {
  starter: {
    slug: 'starter',
    name: 'Starter',
    monthlyPrice: 2900, // $29 in cents
    yearlyPrice: 30000, // $300/year in cents
    yearlyMonthlyPrice: 2500, // $25/month equivalent
    credits: 200,
    features: [
      '200 AI credits/month',
      'All generation types',
      'Basic support',
      '1 brand',
    ],
  },
  pro: {
    slug: 'pro',
    name: 'Pro',
    monthlyPrice: 7900, // $79 in cents
    yearlyPrice: 80400, // $804/year in cents
    yearlyMonthlyPrice: 6700, // $67/month equivalent
    credits: 600,
    features: [
      '600 AI credits/month',
      'All generation types',
      'Priority support',
      '5 brands',
      'Team collaboration',
    ],
    popular: true,
  },
  business: {
    slug: 'business',
    name: 'Business',
    monthlyPrice: 19900, // $199 in cents
    yearlyPrice: 202800, // $2,028/year in cents
    yearlyMonthlyPrice: 16900, // $169/month equivalent
    credits: 2000,
    features: [
      '2,000 AI credits/month',
      'All generation types',
      'Dedicated support',
      'Unlimited brands',
      'Advanced analytics',
      'API access',
    ],
  },
}

export const PLAN_ORDER: PlanSlug[] = ['starter', 'pro', 'business']

export function getPlan(slug: PlanSlug): PlanDisplay {
  return PLANS[slug]
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`
}

export function formatPriceWithCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function getYearlySavingsPercent(): number {
  return 15 // 15% savings on yearly plans
}
