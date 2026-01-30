// Stripe server client for MRKTCMD
import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (_stripe) return _stripe

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  if (!stripeSecretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY environment variable')
  }

  _stripe = new Stripe(stripeSecretKey, {
    typescript: true,
  })

  return _stripe
}

// Lazy proxy for backwards compatibility - throws at call time, not import time
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return getStripe()[prop as keyof Stripe]
  },
})
