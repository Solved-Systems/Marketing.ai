'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import type { GenerationType } from '@/types/billing'
import { CREDIT_COSTS } from '@/lib/billing/models'

interface CreditState {
  remaining: number
  used: number
  total: number
  periodEnd: string | null
}

export function useCredits() {
  const { data: session, status } = useSession()
  const [credits, setCredits] = useState<CreditState>({
    remaining: 0,
    used: 0,
    total: 0,
    periodEnd: null,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCredits = useCallback(async () => {
    if (status !== 'authenticated' || !session?.user) {
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/billing')
      if (!response.ok) {
        throw new Error('Failed to fetch credits')
      }
      const data = await response.json()
      setCredits(data.credits || {
        remaining: 0,
        used: 0,
        total: 0,
        periodEnd: null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [session, status])

  useEffect(() => {
    fetchCredits()
  }, [fetchCredits])

  const canAfford = (generationType: GenerationType): boolean => {
    const cost = CREDIT_COSTS[generationType].credits
    return credits.remaining >= cost
  }

  const getCost = (generationType: GenerationType): number => {
    return CREDIT_COSTS[generationType].credits
  }

  const getPercentUsed = (): number => {
    if (credits.total === 0) return 0
    return Math.round((credits.used / credits.total) * 100)
  }

  return {
    ...credits,
    isLoading: status === 'loading' || isLoading,
    error,
    canAfford,
    getCost,
    getPercentUsed,
    refetch: fetchCredits,
  }
}
