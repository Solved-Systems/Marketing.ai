// Stripe webhook handler
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/client'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPlanFromPriceId } from '@/lib/stripe/config'
import { PLANS } from '@/lib/billing/plans'
import type Stripe from 'stripe'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Helper type for subscription data from Stripe API
interface StripeSubscriptionData {
  id: string
  current_period_start: number
  current_period_end: number
  cancel_at_period_end: boolean
  status: Stripe.Subscription.Status
  items: {
    data: Array<{
      price: {
        id: string
      }
    }>
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Check if event was already processed (idempotency)
    const { data: existingEvent } = await supabase
      .from('stripe_webhook_events')
      .select('id')
      .eq('id', event.id)
      .single()

    if (existingEvent) {
      return NextResponse.json({ received: true, message: 'Event already processed' })
    }

    // Process the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, supabase)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as unknown as StripeSubscriptionData, supabase)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as unknown as StripeSubscriptionData, supabase)
        break

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice, supabase)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    // Mark event as processed
    await supabase
      .from('stripe_webhook_events')
      .insert({ id: event.id, event_type: event.type })

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  supabase: ReturnType<typeof createAdminClient>
) {
  const userId = session.metadata?.user_id
  const planSlug = session.metadata?.plan
  const interval = session.metadata?.interval as 'monthly' | 'yearly'

  if (!userId || !planSlug || !session.subscription) {
    console.error('Missing data in checkout session')
    return
  }

  // Get plan from database
  const { data: plan } = await supabase
    .from('pricing_plans')
    .select('id, monthly_credits')
    .eq('slug', planSlug)
    .single()

  if (!plan) {
    console.error('Plan not found:', planSlug)
    return
  }

  // Get subscription details from Stripe
  const subscriptionResponse = await stripe.subscriptions.retrieve(session.subscription as string)
  const subscription = subscriptionResponse as unknown as StripeSubscriptionData

  // Create subscription record
  await supabase.from('subscriptions').upsert({
    user_id: userId,
    plan_id: plan.id,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: session.customer as string,
    billing_interval: interval,
    status: 'active',
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
  }, {
    onConflict: 'stripe_subscription_id',
  })

  // Initialize credits for the period
  await supabase.from('credit_balances').insert({
    user_id: userId,
    credits_remaining: plan.monthly_credits,
    credits_used: 0,
    period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    period_end: new Date(subscription.current_period_end * 1000).toISOString(),
  })

  console.log(`Subscription created for user ${userId}`)
}

async function handleSubscriptionUpdated(
  subscription: StripeSubscriptionData,
  supabase: ReturnType<typeof createAdminClient>
) {
  const priceId = subscription.items.data[0]?.price.id
  const planInfo = getPlanFromPriceId(priceId)

  if (!planInfo) {
    console.error('Unknown price ID:', priceId)
    return
  }

  // Get plan from database
  const { data: plan } = await supabase
    .from('pricing_plans')
    .select('id')
    .eq('slug', planInfo.plan)
    .single()

  if (!plan) return

  // Update subscription
  await supabase
    .from('subscriptions')
    .update({
      plan_id: plan.id,
      billing_interval: planInfo.interval,
      status: mapStripeStatus(subscription.status),
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
    })
    .eq('stripe_subscription_id', subscription.id)

  console.log(`Subscription updated: ${subscription.id}`)
}

async function handleSubscriptionDeleted(
  subscription: StripeSubscriptionData,
  supabase: ReturnType<typeof createAdminClient>
) {
  await supabase
    .from('subscriptions')
    .update({ status: 'canceled' })
    .eq('stripe_subscription_id', subscription.id)

  console.log(`Subscription canceled: ${subscription.id}`)
}

async function handleInvoicePaid(
  invoiceData: Stripe.Invoice,
  supabase: ReturnType<typeof createAdminClient>
) {
  // Cast to access properties that may differ in SDK versions
  const invoice = invoiceData as unknown as {
    subscription: string | null
    billing_reason: string | null
  }

  // Only process subscription invoices (not the initial checkout)
  if (!invoice.subscription || invoice.billing_reason === 'subscription_create') {
    return
  }

  const subscriptionId = invoice.subscription

  // Get subscription details
  const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId)
  const subscription = subscriptionResponse as unknown as StripeSubscriptionData
  const priceId = subscription.items.data[0]?.price.id
  const planInfo = getPlanFromPriceId(priceId)

  if (!planInfo) return

  // Get the user's subscription from our database
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (!sub) return

  // Get plan credits
  const plan = PLANS[planInfo.plan]
  if (!plan) return

  // Reset credits for the new period
  await supabase.from('credit_balances').insert({
    user_id: sub.user_id,
    credits_remaining: plan.credits,
    credits_used: 0,
    period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    period_end: new Date(subscription.current_period_end * 1000).toISOString(),
  })

  console.log(`Credits reset for subscription: ${subscriptionId}`)
}

function mapStripeStatus(status: Stripe.Subscription.Status): string {
  switch (status) {
    case 'active':
      return 'active'
    case 'canceled':
      return 'canceled'
    case 'past_due':
      return 'past_due'
    case 'incomplete':
    case 'incomplete_expired':
      return 'incomplete'
    case 'trialing':
      return 'trialing'
    default:
      return 'active'
  }
}
