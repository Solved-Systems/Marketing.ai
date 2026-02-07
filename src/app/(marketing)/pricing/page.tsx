'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Terminal, ArrowLeft, X, Zap, Loader2 } from 'lucide-react'
import { PricingTable } from '@/components/billing/pricing-table'
import { useSubscription } from '@/hooks/use-subscription'
import { CREDIT_COSTS } from '@/lib/billing/models'
import type { BillingInterval, PlanSlug } from '@/types/billing'

function PricingContent() {
  const searchParams = useSearchParams()
  const canceled = searchParams.get('canceled')
  const { subscription, createCheckoutSession } = useSubscription()
  const [showCanceled, setShowCanceled] = useState(false)

  // Show canceled banner based on URL param
  useEffect(() => {
    if (canceled) {
      setShowCanceled(true)
      // Clear the canceled param from URL after showing
      const url = new URL(window.location.href)
      url.searchParams.delete('canceled')
      window.history.replaceState({}, '', url.toString())
    }
  }, [canceled])

  const handleSelectPlan = async (plan: PlanSlug, interval: BillingInterval) => {
    await createCheckoutSession(plan, interval)
  }

  return (
    <>
      {/* Canceled banner */}
      {showCanceled && (
        <div className="bg-destructive/10 border-b border-destructive/30 py-3">
          <div className="container mx-auto px-4 flex items-center justify-center gap-2 text-sm">
            <X className="h-4 w-4 text-destructive" />
            <span>Checkout was canceled. Choose a plan to continue.</span>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground font-mono mb-4">
            <span>$</span>
            <span className="text-primary">./pricing</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Choose Your Plan
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Simple, transparent pricing. All plans include access to all features.
            Only pay for what you use.
          </p>
        </div>

        {/* Pricing Table */}
        <PricingTable
          onSelectPlan={handleSelectPlan}
          currentPlan={subscription?.plan?.slug as PlanSlug}
          currentInterval={subscription?.billing_interval}
        />

        {/* Credit Costs */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Credit Costs</h2>
          <div className="terminal-border rounded-lg bg-card/50 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="text-left p-4 font-mono">Generation Type</th>
                  <th className="text-left p-4 font-mono">Model</th>
                  <th className="text-right p-4 font-mono">Credits</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(CREDIT_COSTS).map((cost) => (
                  <tr key={cost.type} className="border-b border-border/30 last:border-0">
                    <td className="p-4">
                      <p className="font-semibold">{cost.label}</p>
                      <p className="text-xs text-muted-foreground">{cost.description}</p>
                    </td>
                    <td className="p-4 text-muted-foreground">{cost.model}</td>
                    <td className="p-4 text-right">
                      <span className="inline-flex items-center gap-1 font-mono">
                        <Zap className="h-3 w-3 text-primary" />
                        {cost.credits}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">FAQ</h2>
          <div className="space-y-6">
            <div className="terminal-border rounded-lg bg-card/50 p-6">
              <h3 className="font-semibold mb-2">What are credits?</h3>
              <p className="text-muted-foreground text-sm">
                Credits are used to generate content. Different generation types cost different amounts of credits based on the AI model used.
              </p>
            </div>
            <div className="terminal-border rounded-lg bg-card/50 p-6">
              <h3 className="font-semibold mb-2">Do unused credits roll over?</h3>
              <p className="text-muted-foreground text-sm">
                No, credits reset at the start of each billing period. Use them before they expire!
              </p>
            </div>
            <div className="terminal-border rounded-lg bg-card/50 p-6">
              <h3 className="font-semibold mb-2">Can I change plans?</h3>
              <p className="text-muted-foreground text-sm">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect at the start of your next billing period.
              </p>
            </div>
            <div className="terminal-border rounded-lg bg-card/50 p-6">
              <h3 className="font-semibold mb-2">How do I cancel?</h3>
              <p className="text-muted-foreground text-sm">
                You can cancel anytime from your billing settings. You&apos;ll continue to have access until the end of your current billing period.
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-primary" />
            <span className="font-mono text-primary crt-glow font-semibold">mrktcmd</span>
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </header>

      <Suspense fallback={
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }>
        <PricingContent />
      </Suspense>
    </div>
  )
}
