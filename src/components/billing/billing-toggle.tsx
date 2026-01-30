'use client'

import { cn } from '@/lib/utils'
import type { BillingInterval } from '@/types/billing'

interface BillingToggleProps {
  value: BillingInterval
  onChange: (value: BillingInterval) => void
}

export function BillingToggle({ value, onChange }: BillingToggleProps) {
  return (
    <div className="flex items-center justify-center gap-4 mb-8">
      <button
        onClick={() => onChange('monthly')}
        className={cn(
          'px-4 py-2 rounded font-mono text-sm transition-all terminal-border',
          value === 'monthly'
            ? 'bg-primary/20 border-primary text-primary'
            : 'bg-card/30 text-muted-foreground hover:bg-card/50'
        )}
      >
        Monthly
      </button>
      <button
        onClick={() => onChange('yearly')}
        className={cn(
          'px-4 py-2 rounded font-mono text-sm transition-all terminal-border relative',
          value === 'yearly'
            ? 'bg-primary/20 border-primary text-primary'
            : 'bg-card/30 text-muted-foreground hover:bg-card/50'
        )}
      >
        Yearly
        <span className="absolute -top-2 -right-2 bg-green-500/20 text-green-400 text-xs px-1.5 py-0.5 rounded border border-green-500/30">
          -15%
        </span>
      </button>
    </div>
  )
}
