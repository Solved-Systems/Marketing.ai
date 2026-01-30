'use client'

import { Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface CreditUsageProps {
  remaining: number
  used: number
  total: number
  periodEnd: string | null
  compact?: boolean
}

export function CreditUsage({
  remaining,
  used,
  total,
  periodEnd,
  compact = false,
}: CreditUsageProps) {
  const percentUsed = total > 0 ? Math.round((used / total) * 100) : 0
  const percentRemaining = 100 - percentUsed

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Zap className="h-4 w-4 text-primary" />
        <span className="font-mono">
          <span className="text-primary">{remaining}</span>
          <span className="text-muted-foreground">/{total}</span>
        </span>
      </div>
    )
  }

  return (
    <Card className="terminal-border bg-card/50">
      <CardHeader className="pb-2">
        <CardTitle className="font-mono text-sm flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          credit_balance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Progress bar */}
          <div className="relative h-3 bg-muted rounded overflow-hidden">
            <div
              className={cn(
                'absolute left-0 top-0 h-full transition-all duration-500',
                percentRemaining > 20 ? 'bg-primary' : 'bg-destructive'
              )}
              style={{ width: `${percentRemaining}%` }}
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{remaining}</p>
              <p className="text-xs text-muted-foreground">remaining</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{used}</p>
              <p className="text-xs text-muted-foreground">used</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-muted-foreground">{total}</p>
              <p className="text-xs text-muted-foreground">total</p>
            </div>
          </div>

          {/* Reset date */}
          {periodEnd && (
            <p className="text-xs text-muted-foreground text-center">
              Resets on {formatDate(periodEnd)}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
