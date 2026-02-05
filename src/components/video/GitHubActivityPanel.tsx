'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  GitPullRequest,
  GitCommit,
  Sparkles,
  Loader2,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
} from 'lucide-react'
import type { Brand, MarketingCopy } from '@/types/video-creation'

interface MergedPR {
  id: number
  number: number
  title: string
  mergedAt: string
  url: string
  author: string
  authorAvatar?: string
  sourceBranch: string
  targetBranch: string
}

interface RecentCommit {
  sha: string
  message: string
  date: string
  url: string
  author: string
  authorAvatar?: string
}

interface GitHubActivity {
  mergedPRs: MergedPR[]
  recentCommits: RecentCommit[]
}

interface GeneratedPost extends MarketingCopy {
  imagePrompt?: string
  context?: {
    type: string
    title: string
    url?: string
  }
  platform?: string
}

interface GitHubActivityPanelProps {
  brand: Brand | null
  githubRepo: string | null
  onGenerateImage?: (prompt: string) => void
  onUsePost?: (post: GeneratedPost) => void
}

export function GitHubActivityPanel({
  brand,
  githubRepo,
  onGenerateImage,
  onUsePost,
}: GitHubActivityPanelProps) {
  const [activity, setActivity] = useState<GitHubActivity | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedSection, setExpandedSection] = useState<'prs' | 'commits' | null>('prs')
  const [generatingPostFor, setGeneratingPostFor] = useState<string | null>(null)
  const [generatedPost, setGeneratedPost] = useState<GeneratedPost | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [selectedPlatform, setSelectedPlatform] = useState<'linkedin' | 'twitter' | 'general'>('linkedin')

  // Fetch GitHub activity
  const fetchActivity = useCallback(async () => {
    if (!githubRepo) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/github/activity?repo=${encodeURIComponent(githubRepo)}`)
      if (!response.ok) {
        throw new Error('Failed to fetch activity')
      }
      const data = await response.json()
      setActivity(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity')
    } finally {
      setLoading(false)
    }
  }, [githubRepo])

  useEffect(() => {
    fetchActivity()
  }, [fetchActivity])

  // Copy to clipboard
  const handleCopy = (field: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  // Generate post from activity item
  const generatePost = async (
    type: 'pr' | 'commit',
    item: MergedPR | RecentCommit
  ) => {
    const itemId = type === 'pr' ? `pr-${(item as MergedPR).number}` : `commit-${(item as RecentCommit).sha}`
    setGeneratingPostFor(itemId)
    setGeneratedPost(null)

    try {
      const context = type === 'pr'
        ? {
            type: 'pr' as const,
            title: (item as MergedPR).title,
            url: (item as MergedPR).url,
            author: (item as MergedPR).author,
            date: (item as MergedPR).mergedAt,
          }
        : {
            type: 'commit' as const,
            title: (item as RecentCommit).message,
            url: (item as RecentCommit).url,
            author: (item as RecentCommit).author,
            date: (item as RecentCommit).date,
          }

      const response = await fetch('/api/posts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: brand?.id,
          brandName: brand?.name,
          brandDescription: brand?.description,
          brandTagline: brand?.tagline,
          context,
          tone: 'professional',
          platform: selectedPlatform,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate post')
      }

      const data = await response.json()
      setGeneratedPost(data.post)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate post')
    } finally {
      setGeneratingPostFor(null)
    }
  }

  if (!githubRepo) {
    return (
      <Card className="terminal-border bg-card/50">
        <CardContent className="p-6 text-center">
          <GitPullRequest className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Connect a GitHub repository to generate posts from your activity
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">GitHub Activity</h3>
          <p className="text-xs text-muted-foreground">{githubRepo}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchActivity}
          disabled={loading}
          className="h-8"
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Platform selector */}
      <div className="flex gap-1 p-1 bg-muted/30 rounded-lg">
        {(['linkedin', 'twitter', 'general'] as const).map((platform) => (
          <button
            key={platform}
            type="button"
            onClick={() => setSelectedPlatform(platform)}
            className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-all ${
              selectedPlatform === platform
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {platform === 'linkedin' ? 'LinkedIn' : platform === 'twitter' ? 'Twitter/X' : 'General'}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 rounded-lg text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && !activity ? (
        <div className="p-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          <p className="text-xs text-muted-foreground mt-2">Loading activity...</p>
        </div>
      ) : activity ? (
        <ScrollArea className="h-[400px]">
          <div className="space-y-4 pr-4">
            {/* Merged PRs */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setExpandedSection(expandedSection === 'prs' ? null : 'prs')}
                className="flex items-center justify-between w-full p-2 hover:bg-muted/30 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2">
                  <GitPullRequest className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Merged PRs</span>
                  <span className="text-xs text-muted-foreground">
                    ({activity.mergedPRs.length})
                  </span>
                </div>
                {expandedSection === 'prs' ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {expandedSection === 'prs' && (
                <div className="space-y-2 pl-2">
                  {activity.mergedPRs.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-2">No merged PRs recently</p>
                  ) : (
                    activity.mergedPRs.map((pr) => (
                      <ActivityCard
                        key={pr.id}
                        type="pr"
                        title={pr.title}
                        subtitle={`#${pr.number} by ${pr.author}`}
                        date={pr.mergedAt}
                        url={pr.url}
                        isGenerating={generatingPostFor === `pr-${pr.number}`}
                        onGenerate={() => generatePost('pr', pr)}
                      />
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Recent Commits */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setExpandedSection(expandedSection === 'commits' ? null : 'commits')}
                className="flex items-center justify-between w-full p-2 hover:bg-muted/30 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2">
                  <GitCommit className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Recent Commits</span>
                  <span className="text-xs text-muted-foreground">
                    ({activity.recentCommits.length})
                  </span>
                </div>
                {expandedSection === 'commits' ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {expandedSection === 'commits' && (
                <div className="space-y-2 pl-2">
                  {activity.recentCommits.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-2">No recent commits</p>
                  ) : (
                    activity.recentCommits.map((commit) => (
                      <ActivityCard
                        key={commit.sha}
                        type="commit"
                        title={commit.message}
                        subtitle={`${commit.sha} by ${commit.author}`}
                        date={commit.date}
                        url={commit.url}
                        isGenerating={generatingPostFor === `commit-${commit.sha}`}
                        onGenerate={() => generatePost('commit', commit)}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      ) : null}

      {/* Generated Post Preview */}
      {generatedPost && (
        <Card className="terminal-border bg-primary/5 border-primary/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Generated Post
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setGeneratedPost(null)}
                className="h-6 w-6 p-0"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Headline */}
            <CopyableField
              label="Headline"
              value={generatedPost.headline}
              copied={copiedField === 'headline'}
              onCopy={() => handleCopy('headline', generatedPost.headline)}
            />

            {/* Body */}
            <CopyableField
              label="Body"
              value={generatedPost.body}
              copied={copiedField === 'body'}
              onCopy={() => handleCopy('body', generatedPost.body)}
              multiline
            />

            {/* CTA */}
            <CopyableField
              label="Call to Action"
              value={generatedPost.cta}
              copied={copiedField === 'cta'}
              onCopy={() => handleCopy('cta', generatedPost.cta)}
            />

            {/* Hashtags */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Hashtags</span>
                <button
                  type="button"
                  onClick={() => handleCopy('hashtags', generatedPost.hashtags.join(' '))}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  {copiedField === 'hashtags' ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  {copiedField === 'hashtags' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {generatedPost.hashtags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Copy full post */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  const fullPost = `${generatedPost.headline}\n\n${generatedPost.body}\n\n${generatedPost.cta}\n\n${generatedPost.hashtags.join(' ')}`
                  handleCopy('full', fullPost)
                }}
              >
                {copiedField === 'full' ? (
                  <Check className="h-3 w-3 mr-1" />
                ) : (
                  <Copy className="h-3 w-3 mr-1" />
                )}
                Copy Full Post
              </Button>
              {onGenerateImage && generatedPost.imagePrompt && (
                <Button
                  variant="terminal"
                  size="sm"
                  className="flex-1"
                  onClick={() => onGenerateImage(generatedPost.imagePrompt!)}
                >
                  <ImageIcon className="h-3 w-3 mr-1" />
                  Generate Image
                </Button>
              )}
              {onUsePost && (
                <Button
                  variant="terminal"
                  size="sm"
                  className="flex-1"
                  onClick={() => onUsePost(generatedPost)}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Use Post
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Activity card component
function ActivityCard({
  type,
  title,
  subtitle,
  date,
  url,
  isGenerating,
  onGenerate,
}: {
  type: 'pr' | 'commit'
  title: string
  subtitle: string
  date: string
  url: string
  isGenerating: boolean
  onGenerate: () => void
}) {
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  return (
    <div className="p-3 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          <p className="text-xs text-muted-foreground/60 mt-1">{formattedDate}</p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 hover:bg-muted rounded"
            title="View on GitHub"
          >
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </a>
          <Button
            variant="ghost"
            size="sm"
            onClick={onGenerate}
            disabled={isGenerating}
            className="h-7 px-2"
          >
            {isGenerating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                Post
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

// Copyable field component
function CopyableField({
  label,
  value,
  copied,
  onCopy,
  multiline = false,
}: {
  label: string
  value: string
  copied: boolean
  onCopy: () => void
  multiline?: boolean
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <button
          type="button"
          onClick={onCopy}
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p className={`text-sm ${multiline ? 'whitespace-pre-wrap' : ''}`}>{value}</p>
    </div>
  )
}
