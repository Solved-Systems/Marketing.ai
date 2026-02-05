// Billing system types for MRKTCMD

export type GenerationType =
  | 'text_post'
  | 'image_default'
  | 'image_standard'
  | 'image_premium'
  | 'image_edit'
  | 'video_default'
  | 'video_premium'

export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'past_due'
  | 'incomplete'
  | 'trialing'

export type BillingInterval = 'monthly' | 'yearly'

export type PlanSlug = 'starter' | 'pro' | 'business'

// User roles
export type UserRole = 'user' | 'admin' | 'super_admin'

// Database table types
export interface User {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  github_id: string | null
  stripe_customer_id: string | null
  role: UserRole
  is_locked: boolean
  locked_at: string | null
  locked_by: string | null
  created_at: string
  updated_at: string
}

export interface PricingPlan {
  id: string
  name: string
  slug: PlanSlug
  price_monthly: number
  price_yearly: number
  stripe_price_id_monthly: string | null
  stripe_price_id_yearly: string | null
  monthly_credits: number
  features: string[]
  is_active: boolean
  created_at: string
}

export interface Subscription {
  id: string
  user_id: string
  plan_id: string
  stripe_subscription_id: string | null
  stripe_customer_id: string | null
  billing_interval: BillingInterval
  status: SubscriptionStatus
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

export interface CreditBalance {
  id: string
  user_id: string
  credits_remaining: number
  credits_used: number
  period_start: string
  period_end: string
  created_at: string
  updated_at: string
}

export interface CreditUsage {
  id: string
  user_id: string
  credits_consumed: number
  action_type: GenerationType
  model_used: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface StripeWebhookEvent {
  id: string
  event_type: string
  processed_at: string
}

// Extended types with relations
export interface SubscriptionWithPlan extends Subscription {
  plan: PricingPlan
}

export interface UserWithSubscription extends User {
  subscription: SubscriptionWithPlan | null
  credit_balance: CreditBalance | null
}

// Frontend display types
export interface PlanDisplay {
  slug: PlanSlug
  name: string
  monthlyPrice: number
  yearlyPrice: number
  yearlyMonthlyPrice: number // yearly price divided by 12
  credits: number
  features: string[]
  popular?: boolean
}

export interface CreditCost {
  type: GenerationType
  credits: number
  label: string
  description: string
  model?: string
}

// API response types
export interface BillingState {
  subscription: SubscriptionWithPlan | null
  credits: {
    remaining: number
    used: number
    total: number
    periodEnd: string | null
  }
  isSubscribed: boolean
  canGenerate: boolean
}

export interface CheckoutSessionResponse {
  url: string
}

export interface PortalSessionResponse {
  url: string
}
