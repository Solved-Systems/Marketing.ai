'use client'

import { Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/billing/plans'
import type { BillingInterval, PlanDisplay } from '@/types/billing'

interface PricingCardProps {
  plan: PlanDisplay
  interval: BillingInterval
  onSelect: () => void
  isLoading?: boolean
  isCurrentPlan?: boolean
}

export function PricingCard({
  plan,
  interval,
  onSelect,
  isLoading,
  isCurrentPlan,
}: PricingCardProps) {
  const price = interval === 'yearly' ? plan.yearlyMonthlyPrice : plan.monthlyPrice
  const yearlyTotal = plan.yearlyPrice

  return (
    <Card
      className={cn(
        'terminal-border bg-card/50 relative flex flex-col',
        plan.popular && 'border-primary shadow-lg shadow-primary/10'
      )}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-primary-foreground text-xs font-mono px-3 py-1 rounded">
            POPULAR
          </span>
        </div>
      )}

      <CardHeader className="text-center pb-2">
        <CardTitle className="font-mono text-lg">{plan.name}</CardTitle>
        <div className="mt-4">
          <span className="text-4xl font-bold">{formatPrice(price)}</span>
          <span className="text-muted-foreground">/mo</span>
        </div>
        {interval === 'yearly' && (
          <p className="text-xs text-muted-foreground mt-1">
            {formatPrice(yearlyTotal)}/year
          </p>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        <div className="text-center mb-6">
          <span className="text-2xl font-bold text-primary">{plan.credits}</span>
          <span className="text-muted-foreground ml-1">credits/mo</span>
        </div>

        <ul className="space-y-3 flex-1 mb-6">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <Button
          variant={plan.popular ? 'terminal' : 'outline'}
          className={cn(
            "w-full font-mono",
            !plan.popular && "hover:text-primary hover:border-primary/50"
          )}
          onClick={onSelect}
          disabled={isLoading || isCurrentPlan}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : isCurrentPlan ? (
            'Current Plan'
          ) : (
            '$ subscribe'
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
