'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import type { BillingState, BillingInterval, PlanSlug } from '@/types/billing'

export function useSubscription() {
  const { data: session, status } = useSession()
  const [billingState, setBillingState] = useState<BillingState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBillingState = useCallback(async () => {
    if (status !== 'authenticated' || !session?.user) {
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/billing')
      if (!response.ok) {
        throw new Error('Failed to fetch billing state')
      }
      const data = await response.json()
      setBillingState(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [session, status])

  useEffect(() => {
    fetchBillingState()
  }, [fetchBillingState])

  const createCheckoutSession = async (plan: PlanSlug, interval: BillingInterval) => {
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, interval }),
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { url } = await response.json()
      if (url) {
        window.location.href = url
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  const openCustomerPortal = async () => {
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to open portal')
      }

      const { url } = await response.json()
      if (url) {
        window.location.href = url
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  return {
    subscription: billingState?.subscription || null,
    isSubscribed: billingState?.isSubscribed || false,
    isLoading: status === 'loading' || isLoading,
    error,
    createCheckoutSession,
    openCustomerPortal,
    refetch: fetchBillingState,
  }
}
