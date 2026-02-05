'use client'

import { Button } from '@/components/ui/button'
import {
  Image as ImageIcon,
  MessageSquare,
  Video,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Logo {
  path: string
  downloadUrl: string
}

interface ChatEmptyStateProps {
  onQuickAction: (action: string) => void
  availableLogos: Logo[]
  uploadedImages: string[]
  onAddLogo: (url: string) => void
}

export function ChatEmptyState({
  onQuickAction,
  availableLogos,
  uploadedImages,
  onAddLogo,
}: ChatEmptyStateProps) {
  const quickActions = [
    {
      icon: ImageIcon,
      label: 'Create Image',
      prompt: 'Create a promotional image for social media',
      color: 'text-orange-400',
    },
    {
      icon: MessageSquare,
      label: 'Create Post',
      prompt: 'Write a social media post announcing a new feature',
      color: 'text-blue-400',
    },
    {
      icon: Video,
      label: 'Create Video',
      prompt: 'Create an animated video ad for the product',
      color: 'text-emerald-400',
    },
  ]

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] px-6 py-12">
      {/* Icon */}
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
          <Sparkles className="h-7 w-7 text-primary" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary/80 rounded-full animate-pulse" />
      </div>

      {/* Title */}
      <h2 className="text-lg font-medium mb-2">What would you like to create?</h2>
      <p className="text-sm text-muted-foreground mb-8 text-center max-w-md">
        Generate images, write posts, or create videos for your brand
      </p>

      {/* Quick actions */}
      <div className="flex flex-wrap justify-center gap-3 mb-8">
        {quickActions.map((action) => {
          const Icon = action.icon
          return (
            <Button
              key={action.label}
              variant="outline"
              onClick={() => onQuickAction(action.prompt)}
              className="h-auto py-3 px-4 flex-col gap-2 border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all"
            >
              <Icon className={cn('h-5 w-5', action.color)} />
              <span className="text-xs">{action.label}</span>
            </Button>
          )
        })}
      </div>

      {/* Workflow tip */}
      <div className="px-4 py-3 bg-primary/5 border border-primary/10 rounded-xl max-w-md text-center mb-8">
        <p className="text-xs text-muted-foreground">
          <span className="text-primary font-medium">Tip:</span> Generate an image, then click{' '}
          <span className="font-mono bg-muted/50 px-1.5 py-0.5 rounded text-foreground">Animate</span>{' '}
          to turn it into a video
        </p>
      </div>

      {/* Brand logos */}
      {availableLogos.length > 0 && (
        <div className="w-full max-w-md">
          <p className="text-[10px] text-muted-foreground/60 font-mono mb-3 text-center tracking-wider uppercase">
            Brand Assets
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {availableLogos.slice(0, 8).map((logo) => (
              <button
                key={logo.path}
                onClick={() => onAddLogo(logo.downloadUrl)}
                className={cn(
                  'p-1.5 rounded-lg border-2 transition-all duration-150',
                  uploadedImages.includes(logo.downloadUrl)
                    ? 'border-primary bg-primary/10 scale-95'
                    : 'border-border/30 hover:border-primary/50 hover:scale-105'
                )}
                title={`Add ${logo.path}`}
              >
                <img
                  src={logo.downloadUrl}
                  alt=""
                  className="w-10 h-10 object-contain rounded bg-white/5"
                />
              </button>
            ))}
            {availableLogos.length > 8 && (
              <div className="w-[52px] h-[52px] rounded-lg border-2 border-dashed border-border/30 flex items-center justify-center">
                <span className="text-xs text-muted-foreground/50 font-mono">
                  +{availableLogos.length - 8}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
