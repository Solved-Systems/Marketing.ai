'use client'

import { useState, useEffect, useCallback } from 'react'
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
  FileCode,
  FolderOpen,
  GitPullRequest,
  GitCommit,
  Play,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

// v6 tool part from UIMessage.parts (DynamicToolUIPart)
interface ToolPart {
  type: string
  toolName: string
  toolCallId: string
  state: string // 'input-streaming' | 'input-available' | 'output-available' | 'error' | etc.
  input?: unknown
  output?: unknown
  errorText?: string
}

interface ToolResultProps {
  tool: Record<string, unknown>
}

function getToolMeta(toolName: string) {
  const meta: Record<string, { icon: typeof Image; color: string; label: string; cmd: string }> = {
    generate_image: { icon: Image, color: 'hsl(var(--primary))', label: 'Image Generation', cmd: 'grok' },
    generate_video: { icon: Video, color: 'hsl(142 76% 36%)', label: 'Video Generation', cmd: 'grok-imagine' },
    check_video_status: { icon: Clock, color: 'hsl(142 76% 36%)', label: 'Video Status', cmd: 'status' },
    analyze_repo: { icon: Github, color: 'hsl(var(--muted-foreground))', label: 'Repo Analysis', cmd: 'github' },
    get_repo_activity: { icon: GitPullRequest, color: 'hsl(var(--muted-foreground))', label: 'Repo Activity', cmd: 'activity' },
    read_repo_file: { icon: FileCode, color: 'hsl(38 92% 50%)', label: 'Read File', cmd: 'read' },
    // Legacy tool names
    analyze_github_repo: { icon: Github, color: 'hsl(var(--muted-foreground))', label: 'Repo Analysis', cmd: 'github' },
    edit_image: { icon: Zap, color: 'hsl(var(--primary))', label: 'Image Edit', cmd: 'edit' },
  }
  return meta[toolName] || { icon: Zap, color: 'hsl(var(--muted-foreground))', label: toolName, cmd: 'tool' }
}

export function ToolResult({ tool: rawTool }: ToolResultProps) {
  const [expanded, setExpanded] = useState(true)

  // Normalize v6 tool part — typed tools have type "tool-{name}", dynamic tools have toolName
  const rawType = String(rawTool.type || '')
  const toolName = rawType.startsWith('tool-')
    ? rawType.slice(5) // "tool-analyze_repo" → "analyze_repo"
    : String(rawTool.toolName || '')
  const toolCallId = String(rawTool.toolCallId || '')
  const state = String(rawTool.state || '')
  const input = rawTool.input as Record<string, unknown> | undefined
  const output = rawTool.output as Record<string, unknown> | undefined

  const { icon: Icon, color, label, cmd } = getToolMeta(toolName)
  const isLoading = state === 'input-streaming' || state === 'input-available'
  const result = output

  // Show loading args while tool is executing
  const loadingLabel = isLoading && input ? getLoadingDescription(toolName, input) : null

  return (
    <div className="rounded-lg bg-card/50 border border-border overflow-hidden">
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
            {loadingLabel && (
              <span className="ml-2 text-xs text-muted-foreground">{loadingLabel}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isLoading && result && (
            <span className="text-[10px] text-primary font-mono flex items-center gap-1">
              <Check size={10} /> done
            </span>
          )}
          {expanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border">
          {isLoading && (
            <div className="p-3 sm:p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 size={14} className="animate-spin" />
                <span>Executing{loadingLabel ? `: ${loadingLabel}` : '...'}</span>
              </div>
            </div>
          )}
          {result && (
            <div className="p-3 sm:p-4">
              {(toolName === 'generate_image' || toolName === 'edit_image') && <ImageResult result={result} />}
              {toolName === 'generate_video' && <VideoStartResult result={result} />}
              {toolName === 'check_video_status' && <VideoStatusResult result={result} />}
              {(toolName === 'analyze_repo' || toolName === 'analyze_github_repo') && <RepoResult result={result} />}
              {toolName === 'get_repo_activity' && <ActivityResult result={result} />}
              {toolName === 'read_repo_file' && <FileResult result={result} />}
              {!['generate_image', 'edit_image', 'generate_video', 'check_video_status', 'analyze_repo', 'analyze_github_repo', 'get_repo_activity', 'read_repo_file'].includes(toolName) && <GenericResult result={result} />}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function getLoadingDescription(toolName: string, args: Record<string, unknown>): string | null {
  switch (toolName) {
    case 'generate_image': return `"${String(args.prompt || '').slice(0, 50)}..."`
    case 'generate_video': return `"${String(args.prompt || '').slice(0, 50)}..."`
    case 'analyze_repo':
    case 'analyze_github_repo': return `${args.owner}/${args.repo}`
    case 'get_repo_activity': return `${args.owner}/${args.repo}`
    case 'read_repo_file': return String(args.path || '')
    case 'check_video_status': return 'polling...'
    default: return null
  }
}

// ── Image Result ──────────────────────────────────────────────

function ImageResult({ result }: { result: Record<string, unknown> }) {
  const images = (result.images as Array<{ url: string }>) || []
  const error = result.error as string | undefined
  const prompt = result.prompt as string | undefined

  if (error) return <ErrorDisplay error={error} />
  if (images.length === 0) return <p className="text-xs text-muted-foreground"># no images generated</p>

  return (
    <div>
      {prompt && <p className="text-xs text-muted-foreground mb-3 font-mono line-clamp-2"># {prompt}</p>}
      <div className={`grid gap-3 ${images.length === 1 ? 'grid-cols-1 max-w-md' : 'grid-cols-2'}`}>
        {images.map((img, i) => (
          <div key={i} className="relative group rounded-lg overflow-hidden border border-border bg-muted">
            <img
              src={img.url}
              alt={`Generated ${i + 1}`}
              className="w-full aspect-square object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center gap-2 p-3">
              <a href={img.url} download={`mrkt-${i + 1}.png`} className="p-2 rounded bg-white/20 hover:bg-white/30 transition-colors">
                <Download size={14} className="text-white" />
              </a>
              <a href={img.url} target="_blank" rel="noopener noreferrer" className="p-2 rounded bg-white/20 hover:bg-white/30 transition-colors">
                <ExternalLink size={14} className="text-white" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Video Start Result ────────────────────────────────────────

function VideoStartResult({ result }: { result: Record<string, unknown> }) {
  const status = result.status as string | undefined
  const requestId = result.requestId as string | undefined
  const message = result.message as string | undefined
  const error = result.error as string | undefined

  if (error) return <ErrorDisplay error={error} />

  return (
    <div className="p-3 rounded bg-muted/50 border border-border">
      <div className="flex items-center gap-2 text-sm">
        {status === 'processing' ? (
          <>
            <Loader2 size={14} className="animate-spin text-green-500" />
            <span>{message || 'Video generation started...'}</span>
          </>
        ) : (
          <span>{message || JSON.stringify(result)}</span>
        )}
      </div>
      {requestId && (
        <p className="text-[10px] text-muted-foreground mt-2 font-mono">request_id: {requestId}</p>
      )}
    </div>
  )
}

// ── Video Status with Auto-Poll ───────────────────────────────

function VideoStatusResult({ result }: { result: Record<string, unknown> }) {
  const status = result.status as string | undefined
  const outputUrl = result.outputUrl as string | undefined
  const error = result.error as string | undefined
  const message = result.message as string | undefined

  if (error) return <ErrorDisplay error={error} />

  if (status === 'completed' && outputUrl) {
    return (
      <div>
        <video
          controls
          autoPlay
          muted
          playsInline
          src={outputUrl}
          className="w-full max-w-lg rounded-lg border border-border"
        />
        <div className="flex gap-2 mt-3">
          <a href={outputUrl} download className="flex-1">
            <Button variant="outline" size="sm" className="w-full gap-1.5">
              <Download size={14} /> Download
            </Button>
          </a>
          <a href={outputUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
            <Button variant="outline" size="sm" className="w-full gap-1.5">
              <ExternalLink size={14} /> Open
            </Button>
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 rounded bg-muted/50 border border-border">
      <div className="flex items-center gap-2 text-sm">
        <Loader2 size={14} className="animate-spin text-green-500" />
        <span>{message || `Status: ${status || 'checking...'}`}</span>
      </div>
    </div>
  )
}

// ── Repo Analysis Result ──────────────────────────────────────

function RepoResult({ result }: { result: Record<string, unknown> }) {
  const [showReadme, setShowReadme] = useState(false)
  const error = result.error as string | undefined
  if (error) return <ErrorDisplay error={error} />

  const name = result.name as string
  const fullName = result.fullName as string
  const description = result.description as string | undefined
  const stars = result.stars as number | undefined
  const forks = result.forks as number | undefined
  const watchers = result.watchers as number | undefined
  const language = result.language as string | undefined
  const topics = result.topics as string[] | undefined
  const url = result.url as string | undefined
  const readme = result.readme as string | undefined
  const homepage = result.homepage as string | undefined
  const packageJson = result.packageJson as { name?: string; description?: string; dependencies?: string[]; devDependencies?: string[] } | undefined

  return (
    <div className="space-y-3">
      {/* Repo header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Github size={14} className="flex-shrink-0" />
            <span className="font-medium text-sm">{fullName || name}</span>
          </div>
          {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
          {homepage && (
            <a href={homepage} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 inline-block">
              {homepage}
            </a>
          )}
        </div>
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-muted transition-colors flex-shrink-0">
            <ExternalLink size={12} className="text-muted-foreground" />
          </a>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
        {stars !== undefined && (
          <span className="flex items-center gap-1"><Star size={11} className="text-yellow-500" />{stars.toLocaleString()}</span>
        )}
        {forks !== undefined && (
          <span className="flex items-center gap-1"><GitFork size={11} />{forks.toLocaleString()}</span>
        )}
        {watchers !== undefined && (
          <span className="flex items-center gap-1"><Eye size={11} />{watchers.toLocaleString()}</span>
        )}
        {language && (
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" />{language}</span>
        )}
      </div>

      {/* Topics */}
      {topics && topics.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {topics.slice(0, 10).map((topic) => (
            <span key={topic} className="px-1.5 py-0.5 text-[10px] rounded bg-muted text-muted-foreground border border-border">
              {topic}
            </span>
          ))}
        </div>
      )}

      {/* Package.json deps */}
      {packageJson?.dependencies && packageJson.dependencies.length > 0 && (
        <div>
          <p className="text-[10px] text-muted-foreground font-mono mb-1"># dependencies ({packageJson.dependencies.length})</p>
          <div className="flex flex-wrap gap-1">
            {packageJson.dependencies.slice(0, 15).map((dep) => (
              <span key={dep} className="px-1.5 py-0.5 text-[10px] rounded bg-primary/10 text-primary border border-primary/20 font-mono">
                {dep}
              </span>
            ))}
            {packageJson.dependencies.length > 15 && (
              <span className="text-[10px] text-muted-foreground">+{packageJson.dependencies.length - 15} more</span>
            )}
          </div>
        </div>
      )}

      {/* README preview */}
      {readme && (
        <div>
          <button
            onClick={() => setShowReadme(!showReadme)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground font-mono"
          >
            {showReadme ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            README.md
          </button>
          {showReadme && (
            <pre className="mt-2 p-3 rounded bg-background border border-border text-[10px] text-muted-foreground overflow-auto max-h-[300px] whitespace-pre-wrap">
              {readme}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

// ── Activity Result ───────────────────────────────────────────

function ActivityResult({ result }: { result: Record<string, unknown> }) {
  const error = result.error as string | undefined
  if (error) return <ErrorDisplay error={error} />

  const mergedPRs = (result.mergedPRs as Array<{ number: number; title: string; author: string; mergedAt: string; url: string }>) || []
  const recentCommits = (result.recentCommits as Array<{ sha: string; message: string; author: string; date: string }>) || []

  return (
    <div className="space-y-3">
      {mergedPRs.length > 0 && (
        <div>
          <p className="text-[10px] text-muted-foreground font-mono mb-2"># merged PRs ({mergedPRs.length})</p>
          <div className="space-y-1.5">
            {mergedPRs.map((pr) => (
              <div key={pr.number} className="flex items-start gap-2 text-xs">
                <GitPullRequest size={12} className="text-purple-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <a href={pr.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                    #{pr.number} {pr.title}
                  </a>
                  <span className="text-muted-foreground ml-2">by {pr.author}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentCommits.length > 0 && (
        <div>
          <p className="text-[10px] text-muted-foreground font-mono mb-2"># recent commits ({recentCommits.length})</p>
          <div className="space-y-1.5">
            {recentCommits.slice(0, 7).map((commit) => (
              <div key={commit.sha} className="flex items-start gap-2 text-xs">
                <GitCommit size={12} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="font-mono text-primary">{commit.sha}</span>
                  <span className="ml-2 text-muted-foreground truncate">{commit.message}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {mergedPRs.length === 0 && recentCommits.length === 0 && (
        <p className="text-xs text-muted-foreground"># no recent activity found</p>
      )}
    </div>
  )
}

// ── File/Directory Result ─────────────────────────────────────

function FileResult({ result }: { result: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(true)
  const error = result.error as string | undefined
  if (error) return <ErrorDisplay error={error} />

  const path = result.path as string
  const content = result.content as string | undefined
  const entries = result.entries as Array<{ name: string; type: string; size: number; path: string }> | undefined

  // Directory listing
  if (entries) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-2">
          <FolderOpen size={12} className="text-primary" />
          <span className="text-xs font-mono">{path}/</span>
          <span className="text-[10px] text-muted-foreground">({entries.length} items)</span>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {entries.map((entry) => (
            <div key={entry.path} className="flex items-center gap-1.5 text-[11px] p-1 rounded hover:bg-muted/50">
              {entry.type === 'dir' ? (
                <FolderOpen size={10} className="text-primary flex-shrink-0" />
              ) : (
                <FileCode size={10} className="text-muted-foreground flex-shrink-0" />
              )}
              <span className="truncate font-mono">{entry.name}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // File content
  if (content) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 mb-2 hover:text-primary transition-colors"
        >
          <FileCode size={12} />
          <span className="text-xs font-mono">{path}</span>
          {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </button>
        {expanded && (
          <pre className="p-3 rounded bg-background border border-border text-[10px] text-muted-foreground overflow-auto max-h-[400px] whitespace-pre-wrap font-mono">
            {content}
          </pre>
        )}
      </div>
    )
  }

  return <GenericResult result={result} />
}

// ── Error Display ─────────────────────────────────────────────

function ErrorDisplay({ error }: { error: string }) {
  return (
    <div className="flex items-center gap-2 p-2.5 rounded bg-destructive/20 border border-destructive/30 text-destructive text-xs">
      <span className="font-medium font-mono">error:</span>
      <span>{error}</span>
    </div>
  )
}

// ── Generic Result ────────────────────────────────────────────

function GenericResult({ result }: { result: Record<string, unknown> }) {
  return (
    <pre className="p-3 rounded bg-background border border-border text-[10px] text-muted-foreground overflow-auto max-h-[200px] whitespace-pre-wrap">
      {JSON.stringify(result, null, 2)}
    </pre>
  )
}
