'use client'

import { useState } from 'react'
import { PricingCard } from './pricing-card'
import { BillingToggle } from './billing-toggle'
import { PLANS, PLAN_ORDER } from '@/lib/billing/plans'
import type { BillingInterval, PlanSlug } from '@/types/billing'

interface PricingTableProps {
  onSelectPlan: (plan: PlanSlug, interval: BillingInterval) => Promise<void>
  currentPlan?: PlanSlug | null
  currentInterval?: BillingInterval | null
}

export function PricingTable({
  onSelectPlan,
  currentPlan,
  currentInterval,
}: PricingTableProps) {
  const [interval, setInterval] = useState<BillingInterval>(currentInterval || 'monthly')
  const [loadingPlan, setLoadingPlan] = useState<PlanSlug | null>(null)

  const handleSelect = async (planSlug: PlanSlug) => {
    setLoadingPlan(planSlug)
    try {
      await onSelectPlan(planSlug, interval)
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <div>
      <BillingToggle value={interval} onChange={setInterval} />

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {PLAN_ORDER.map((slug) => {
          const plan = PLANS[slug]
          const isCurrentPlan = currentPlan === slug && currentInterval === interval

          return (
            <PricingCard
              key={slug}
              plan={plan}
              interval={interval}
              onSelect={() => handleSelect(slug)}
              isLoading={loadingPlan === slug}
              isCurrentPlan={isCurrentPlan}
            />
          )
        })}
      </div>
    </div>
  )
}
