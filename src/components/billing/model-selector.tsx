'use client'

import { Zap } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { IMAGE_TIERS, VIDEO_TIERS, type ModelQuality, type ModelTier } from '@/lib/billing/models'

interface ModelSelectorProps {
  type: 'image' | 'video'
  value: ModelQuality
  onChange: (value: ModelQuality) => void
  creditsRemaining: number
  disabled?: boolean
}

export function ModelSelector({
  type,
  value,
  onChange,
  creditsRemaining,
  disabled,
}: ModelSelectorProps) {
  const tiers = type === 'image' ? IMAGE_TIERS : VIDEO_TIERS

  const getCreditCost = (tier: ModelTier): number => {
    if (type === 'image') {
      switch (tier.quality) {
        case 'default': return 1
        case 'standard': return 3
        case 'premium': return 5
      }
    } else {
      return tier.quality === 'premium' ? 20 : 10
    }
  }

  return (
    <div className="space-y-2">
      <Label className="font-mono text-sm">quality_tier</Label>
      <div className="grid gap-2">
        {tiers.map((tier) => {
          const cost = getCreditCost(tier)
          const canAfford = creditsRemaining >= cost

          return (
            <button
              key={tier.quality}
              type="button"
              onClick={() => onChange(tier.quality)}
              disabled={disabled || !canAfford}
              className={cn(
                'flex items-center justify-between p-3 rounded terminal-border transition-all text-left',
                value === tier.quality
                  ? 'bg-primary/20 border-primary'
                  : 'bg-card/30 hover:bg-card/50',
                (!canAfford || disabled) && 'opacity-50 cursor-not-allowed'
              )}
            >
              <div>
                <p className="font-semibold">{tier.label}</p>
                <p className="text-xs text-muted-foreground">{tier.description.split(' - ')[1]}</p>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <Zap className="h-3 w-3 text-primary" />
                <span className={cn(
                  'font-mono',
                  !canAfford && 'text-destructive'
                )}>
                  {cost}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
