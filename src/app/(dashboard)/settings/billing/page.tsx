'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  CreditCard,
  Settings,
  Check,
  Loader2,
  ExternalLink,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CreditUsage } from '@/components/billing/credit-usage'
import { PricingTable } from '@/components/billing/pricing-table'
import { useSubscription } from '@/hooks/use-subscription'
import { useCredits } from '@/hooks/use-credits'
import { formatPrice } from '@/lib/billing/plans'
import type { BillingInterval, PlanSlug } from '@/types/billing'

function BillingContent() {
  const searchParams = useSearchParams()
  const success = searchParams.get('success')
  const {
    subscription,
    isSubscribed,
    isLoading: subLoading,
    createCheckoutSession,
    openCustomerPortal,
    refetch,
  } = useSubscription()
  const {
    remaining,
    used,
    total,
    periodEnd,
    isLoading: creditsLoading,
  } = useCredits()

  const [showSuccess, setShowSuccess] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    if (success) {
      setShowSuccess(true)
      refetch()
      // Clear the success param from URL
      const url = new URL(window.location.href)
      url.searchParams.delete('success')
      window.history.replaceState({}, '', url.toString())

      // Hide success message after 5 seconds
      const timer = setTimeout(() => setShowSuccess(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [success, refetch])

  const handleSelectPlan = async (plan: PlanSlug, interval: BillingInterval) => {
    await createCheckoutSession(plan, interval)
  }

  const handleManageBilling = async () => {
    setPortalLoading(true)
    try {
      await openCustomerPortal()
    } finally {
      setPortalLoading(false)
    }
  }

  const isLoading = subLoading || creditsLoading

  return (
    <>
      {/* Success Banner */}
      {showSuccess && (
        <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
            <Check className="h-4 w-4 text-green-500" />
          </div>
          <div>
            <p className="font-semibold text-green-400">Subscription Activated!</p>
            <p className="text-sm text-muted-foreground">
              Your credits have been added to your account.
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : isSubscribed ? (
        <div className="space-y-6">
          {/* Current Plan */}
          <Card className="terminal-border bg-card/50">
            <CardHeader>
              <CardTitle className="font-mono text-sm flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                current_plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{subscription?.plan?.name}</p>
                  <p className="text-muted-foreground">
                    {formatPrice(
                      subscription?.billing_interval === 'yearly'
                        ? subscription?.plan?.price_yearly || 0
                        : subscription?.plan?.price_monthly || 0
                    )}
                    /{subscription?.billing_interval === 'yearly' ? 'year' : 'month'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleManageBilling}
                  disabled={portalLoading}
                >
                  {portalLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Settings className="h-4 w-4" />
                      Manage
                      <ExternalLink className="h-3 w-3" />
                    </>
                  )}
                </Button>
              </div>

              {subscription?.cancel_at_period_end && (
                <div className="mt-4 p-3 rounded bg-destructive/10 border border-destructive/30">
                  <p className="text-sm text-destructive">
                    Your subscription will cancel at the end of this billing period.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Credit Balance */}
          <CreditUsage
            remaining={remaining}
            used={used}
            total={total}
            periodEnd={periodEnd}
          />

          {/* Usage History Link */}
          <Card className="terminal-border bg-card/50">
            <CardHeader>
              <CardTitle className="font-mono text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                credit_usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm mb-4">
                View your credit usage history and generation logs.
              </p>
              <Button variant="outline" disabled>
                View Usage History
                <span className="text-xs text-muted-foreground ml-2">(Coming soon)</span>
              </Button>
            </CardContent>
          </Card>

          {/* Change Plan */}
          <Card className="terminal-border bg-card/50">
            <CardHeader>
              <CardTitle className="font-mono text-sm">change_plan</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm mb-6">
                Upgrade or downgrade your plan. Changes take effect at the start of your next billing period.
              </p>
              <PricingTable
                onSelectPlan={handleSelectPlan}
                currentPlan={subscription?.plan?.slug as PlanSlug}
                currentInterval={subscription?.billing_interval}
              />
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          {/* No Subscription */}
          <Card className="terminal-border bg-card/50">
            <CardContent className="py-12 text-center">
              <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <CreditCard className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-bold mb-2">No Active Subscription</h2>
              <p className="text-muted-foreground mb-6">
                Choose a plan to start generating content with AI.
              </p>
            </CardContent>
          </Card>

          {/* Pricing Table */}
          <PricingTable
            onSelectPlan={handleSelectPlan}
            currentPlan={null}
            currentInterval={null}
          />
        </div>
      )}
    </>
  )
}

export default function BillingSettingsPage() {
  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Settings
        </Link>
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono mb-2">
          <span>$</span>
          <span className="text-primary">./settings/billing</span>
        </div>
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="text-muted-foreground mt-2">
          Manage your subscription and credits
        </p>
      </div>

      <Suspense fallback={
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }>
        <BillingContent />
      </Suspense>
    </div>
  )
}
