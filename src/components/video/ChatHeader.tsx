'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Github,
  Check,
  ExternalLink,
  History,
  Plus,
  Save,
  Loader2,
  GitPullRequest,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Brand {
  id: string
  name: string
  github_repo: string | null
}

interface ChatHeaderProps {
  brandId: string
  brand: Brand | null
  isSaving: boolean
  hasUnsavedChanges: boolean
  showHistory: boolean
  onToggleHistory: () => void
  showGitHubPanel: boolean
  onToggleGitHubPanel: () => void
  onNewChat: () => void
  chatCount: number
}

export function ChatHeader({
  brandId,
  brand,
  isSaving,
  hasUnsavedChanges,
  showHistory,
  onToggleHistory,
  showGitHubPanel,
  onToggleGitHubPanel,
  onNewChat,
  chatCount,
}: ChatHeaderProps) {
  return (
    <header className="px-6 py-4 border-b border-border/30">
      {/* Top row - navigation */}
      <div className="flex items-center justify-between mb-3">
        <Link
          href={`/brands/${brandId}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="font-mono text-xs">back</span>
        </Link>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          {/* Save indicator */}
          {hasUnsavedChanges && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground/70 mr-2">
              {isSaving ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="font-mono">saving</span>
                </>
              ) : (
                <>
                  <Save className="h-3 w-3" />
                  <span className="font-mono">unsaved</span>
                </>
              )}
            </span>
          )}

          {/* GitHub panel toggle */}
          {brand?.github_repo && (
            <Button
              variant={showGitHubPanel ? 'secondary' : 'ghost'}
              size="sm"
              onClick={onToggleGitHubPanel}
              className="h-8 gap-1.5 text-xs"
            >
              <GitPullRequest className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Posts</span>
              {showGitHubPanel ? (
                <PanelRightClose className="h-3 w-3" />
              ) : (
                <PanelRightOpen className="h-3 w-3" />
              )}
            </Button>
          )}

          {/* History toggle */}
          <Button
            variant={showHistory ? 'secondary' : 'ghost'}
            size="sm"
            onClick={onToggleHistory}
            className="h-8 gap-1.5 text-xs"
          >
            <History className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">History</span>
            {chatCount > 0 && (
              <span className="text-[10px] bg-muted/80 px-1.5 py-0.5 rounded font-mono">
                {chatCount}
              </span>
            )}
          </Button>

          {/* New chat */}
          <Button
            variant="outline"
            size="sm"
            onClick={onNewChat}
            className="h-8 gap-1.5 text-xs border-border/50"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New</span>
          </Button>
        </div>
      </div>

      {/* Brand info row */}
      <div className="flex items-center gap-4">
        {/* Title */}
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-primary">Create</span>
          {brand && (
            <span className="text-muted-foreground font-normal text-sm">
              for {brand.name}
            </span>
          )}
        </h1>

        {/* GitHub badge */}
        {brand?.github_repo && (
          <div className="flex items-center gap-2">
            <div className={cn(
              'flex items-center gap-2 px-2.5 py-1 rounded-full text-xs',
              'bg-muted/30 border border-border/50'
            )}>
              <Github className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-mono text-muted-foreground">{brand.github_repo}</span>
              <Check className="h-3.5 w-3.5 text-green-500/80" />
            </div>
            <a
              href={`https://github.com/${brand.github_repo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}
      </div>
    </header>
  )
}
