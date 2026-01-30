// Create Stripe checkout session
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { stripe } from '@/lib/stripe/client'
import { getStripePriceId } from '@/lib/stripe/config'
import { createAdminClient } from '@/lib/supabase/admin'
import type { BillingInterval, PlanSlug } from '@/types/billing'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { plan, interval } = await request.json() as {
      plan: PlanSlug
      interval: BillingInterval
    }

    if (!plan || !interval) {
      return NextResponse.json({ error: 'Plan and interval are required' }, { status: 400 })
    }

    const priceId = getStripePriceId(plan, interval)
    const supabase = createAdminClient()

    // Get or create user in Supabase
    const { data: user } = await supabase
      .from('users')
      .select('id, stripe_customer_id')
      .eq('email', session.user.email)
      .single()

    let customerId = user?.stripe_customer_id

    // Create Stripe customer if needed
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email,
        name: session.user.name || undefined,
        metadata: {
          user_id: user?.id || '',
        },
      })
      customerId = customer.id

      // Update user with Stripe customer ID
      if (user?.id) {
        await supabase
          .from('users')
          .update({ stripe_customer_id: customerId })
          .eq('id', user.id)
      }
    }

    // Get the base URL for redirects
    const origin = request.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000'

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/settings/billing?success=true`,
      cancel_url: `${origin}/pricing?canceled=true`,
      metadata: {
        user_id: user?.id || '',
        plan,
        interval,
      },
      subscription_data: {
        metadata: {
          user_id: user?.id || '',
          plan,
          interval,
        },
      },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
