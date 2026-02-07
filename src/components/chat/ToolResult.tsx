'use client'

import { useState } from 'react'
import {
  Image,
  Video,
  Github,
  Zap,
  Download,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Loader2,
  Star,
  GitFork,
  Eye,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ToolInvocation {
  toolName: string
  toolCallId: string
  state: 'call' | 'partial-call' | 'result'
  args?: Record<string, unknown>
  result?: unknown
}

interface ToolResultProps {
  tool: ToolInvocation
}

function getToolMeta(toolName: string) {
  const meta: Record<string, { icon: typeof Image; color: string; label: string; cmd: string }> = {
    generate_image: {
      icon: Image,
      color: 'hsl(var(--primary))',
      label: 'Image Generation',
      cmd: 'grok',
    },
    generate_video: {
      icon: Video,
      color: 'hsl(142 76% 36%)',
      label: 'Video Generation',
      cmd: 'grok-imagine',
    },
    check_video_status: {
      icon: Clock,
      color: 'hsl(142 76% 36%)',
      label: 'Video Status',
      cmd: 'status',
    },
    analyze_github_repo: {
      icon: Github,
      color: 'hsl(var(--muted-foreground))',
      label: 'Repository Analysis',
      cmd: 'github',
    },
    edit_image: {
      icon: Zap,
      color: 'hsl(var(--primary))',
      label: 'Image Edit',
      cmd: 'edit',
    },
  }

  return meta[toolName] || {
    icon: Zap,
    color: 'hsl(var(--muted-foreground))',
    label: toolName,
    cmd: 'tool',
  }
}

export function ToolResult({ tool }: ToolResultProps) {
  const [expanded, setExpanded] = useState(true)
  const { icon: Icon, color, label, cmd } = getToolMeta(tool.toolName)
  const isLoading = tool.state === 'call' || tool.state === 'partial-call'
  const result = tool.result as Record<string, unknown> | undefined

  return (
    <div className="rounded-lg bg-card/50 border border-border overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-2.5 sm:p-3 hover:bg-muted/50 transition-colors min-h-[44px]"
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)` }}
          >
            {isLoading ? (
              <Loader2 size={14} style={{ color }} className="animate-spin" />
            ) : (
              <Icon size={14} style={{ color }} />
            )}
          </div>
          <div className="text-left">
            <span className="text-sm">{label}</span>
            <span className="ml-2 text-xs text-muted-foreground font-mono">{cmd}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isLoading && (
            <span className="text-[10px] text-primary font-mono">
              done
            </span>
          )}
          {expanded ? (
            <ChevronUp size={14} className="text-muted-foreground" />
          ) : (
            <ChevronDown size={14} className="text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Content */}
      {expanded && result && (
        <div className="p-3 sm:p-4 pt-0 border-t border-border">
          {tool.toolName === 'generate_image' && renderImageResult(result)}
          {tool.toolName === 'edit_image' && renderImageResult(result)}
          {tool.toolName === 'generate_video' && renderVideoResult(result)}
          {tool.toolName === 'check_video_status' && renderVideoStatusResult(result)}
          {tool.toolName === 'analyze_github_repo' && renderRepoResult(result)}
          {!['generate_image', 'edit_image', 'generate_video', 'check_video_status', 'analyze_github_repo'].includes(tool.toolName) &&
            renderGenericResult(result)}
        </div>
      )}
    </div>
  )
}

function renderImageResult(result: Record<string, unknown>) {
  const images = (result.images as Array<{ url: string }>) || []
  const error = result.error as string | undefined

  if (error) {
    return (
      <div className="flex items-center gap-2 p-2.5 rounded bg-destructive/20 border border-destructive/30 text-destructive text-xs">
        <span className="font-medium">error:</span>
        <span>{error}</span>
      </div>
    )
  }

  if (images.length === 0) {
    return <p className="text-xs text-muted-foreground"># no output</p>
  }

  return (
    <div className="grid grid-cols-2 gap-3 mt-3">
      {images.map((img, i) => (
        <div key={i} className="relative group rounded-lg overflow-hidden border border-border">
          <img
            src={img.url}
            alt={`Generated ${i + 1}`}
            className="w-full aspect-square object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center gap-2 p-2 sm:p-3">
            <a
              href={img.url}
              download={`generated-${i + 1}.png`}
              className="p-1.5 sm:p-2 rounded bg-white/20 hover:bg-white/30 transition-colors"
            >
              <Download size={14} className="text-white" />
            </a>
            <a
              href={img.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 sm:p-2 rounded bg-white/20 hover:bg-white/30 transition-colors"
            >
              <ExternalLink size={14} className="text-white" />
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}

function renderVideoResult(result: Record<string, unknown>) {
  const status = result.status as string | undefined
  const videoId = result.videoId as string | undefined
  const message = result.message as string | undefined
  const error = result.error as string | undefined

  if (error) {
    return (
      <div className="flex items-center gap-2 p-2.5 rounded bg-destructive/20 border border-destructive/30 text-destructive text-xs">
        <span className="font-medium">error:</span>
        <span>{error}</span>
      </div>
    )
  }

  if (status === 'processing') {
    return (
      <div className="mt-3 p-3 rounded bg-muted/50 border border-border">
        <div className="flex items-center gap-2 text-sm">
          <Loader2 size={14} className="animate-spin text-primary" />
          <span>{message || 'Processing video...'}</span>
        </div>
        {videoId && (
          <p className="text-xs text-muted-foreground mt-2 font-mono">
            video_id: {videoId}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="mt-3 p-3 rounded bg-muted/50 border border-border">
      <pre className="text-[10px] text-muted-foreground overflow-auto">
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  )
}

function renderVideoStatusResult(result: Record<string, unknown>) {
  const status = result.status as string | undefined
  const progress = result.progress as number | undefined
  const outputUrl = result.outputUrl as string | undefined
  const error = result.error as string | undefined

  if (error) {
    return (
      <div className="flex items-center gap-2 p-2.5 rounded bg-destructive/20 border border-destructive/30 text-destructive text-xs">
        <span className="font-medium">error:</span>
        <span>{error}</span>
      </div>
    )
  }

  if (status === 'completed' && outputUrl) {
    return (
      <div className="mt-3">
        <video
          controls
          src={outputUrl}
          className="w-full rounded-lg border border-border"
          playsInline
        >
          Your browser does not support video.
        </video>
        <div className="flex gap-2 mt-2">
          <a href={outputUrl} download className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              <Download size={14} />
              Download
            </Button>
          </a>
          <a href={outputUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              <ExternalLink size={14} />
              Open
            </Button>
          </a>
        </div>
      </div>
    )
  }

  if (progress !== undefined) {
    return (
      <div className="mt-3">
        <div className="flex items-center justify-between mb-2 text-xs">
          <span className="text-muted-foreground"># rendering...</span>
          <span className="text-primary font-mono">{progress}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 size={14} className="animate-spin" />
      <span>Status: {status || 'unknown'}</span>
    </div>
  )
}

function renderRepoResult(result: Record<string, unknown>) {
  const name = result.name as string | undefined
  const description = result.description as string | undefined
  const stars = result.stars as number | undefined
  const forks = result.forks as number | undefined
  const watchers = result.watchers as number | undefined
  const language = result.language as string | undefined
  const url = result.url as string | undefined
  const topics = result.topics as string[] | undefined
  const error = result.error as string | undefined

  if (error) {
    return (
      <div className="flex items-center gap-2 p-2.5 rounded bg-destructive/20 border border-destructive/30 text-destructive text-xs">
        <span className="font-medium">error:</span>
        <span>{error}</span>
      </div>
    )
  }

  return (
    <div className="mt-3 p-3 rounded bg-muted/50 border border-border text-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Github size={12} className="flex-shrink-0" />
            <span className="font-medium truncate">{name}</span>
          </div>
          {description && (
            <p className="text-muted-foreground mt-1 line-clamp-2"># {description}</p>
          )}
        </div>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded hover:bg-muted transition-colors flex-shrink-0"
          >
            <ExternalLink size={12} className="text-muted-foreground" />
          </a>
        )}
      </div>

      <div className="flex items-center gap-3 mt-3 flex-wrap text-muted-foreground">
        {stars !== undefined && (
          <span className="flex items-center gap-1">
            <Star size={10} className="text-yellow-500" />
            {stars.toLocaleString()}
          </span>
        )}
        {forks !== undefined && (
          <span className="flex items-center gap-1">
            <GitFork size={10} />
            {forks.toLocaleString()}
          </span>
        )}
        {watchers !== undefined && (
          <span className="flex items-center gap-1">
            <Eye size={10} />
            {watchers.toLocaleString()}
          </span>
        )}
        {language && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-primary" />
            {language}
          </span>
        )}
      </div>

      {topics && topics.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {topics.slice(0, 8).map((topic) => (
            <span
              key={topic}
              className="px-1.5 py-0.5 text-[10px] rounded bg-muted text-muted-foreground border border-border"
            >
              {topic}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function renderGenericResult(result: Record<string, unknown>) {
  return (
    <div className="mt-3 p-3 rounded bg-muted/50 border border-border">
      <pre className="text-[10px] text-muted-foreground overflow-auto max-h-[200px]">
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  )
}
