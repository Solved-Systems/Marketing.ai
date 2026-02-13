'use client'

import { useState, useEffect } from 'react'
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
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ToolResultProps {
  tool: Record<string, unknown>
  defaultExpanded?: boolean
}

function getToolMeta(toolName: string) {
  const meta: Record<string, { icon: typeof Image; color: string; label: string; cmd: string }> = {
    generate_image: { icon: Image, color: 'hsl(var(--primary))', label: 'Image Generation', cmd: 'generate' },
    edit_image: { icon: Zap, color: 'hsl(var(--primary))', label: 'Image Edit', cmd: 'edit' },
    generate_video: { icon: Video, color: 'hsl(142 76% 36%)', label: 'Video Generation', cmd: 'grok-imagine' },
    check_video_status: { icon: Clock, color: 'hsl(142 76% 36%)', label: 'Video Status', cmd: 'status' },
    generate_remotion_video: { icon: Play, color: 'hsl(262 83% 58%)', label: 'Remotion Video', cmd: 'remotion' },
    check_remotion_status: { icon: Clock, color: 'hsl(262 83% 58%)', label: 'Render Status', cmd: 'remotion-status' },
    analyze_repo: { icon: Github, color: 'hsl(var(--muted-foreground))', label: 'Repo Analysis', cmd: 'github' },
    get_repo_activity: { icon: GitPullRequest, color: 'hsl(var(--muted-foreground))', label: 'Repo Activity', cmd: 'activity' },
    read_repo_file: { icon: FileCode, color: 'hsl(38 92% 50%)', label: 'Read File', cmd: 'read' },
    // Legacy tool names
    analyze_github_repo: { icon: Github, color: 'hsl(var(--muted-foreground))', label: 'Repo Analysis', cmd: 'github' },
  }
  return meta[toolName] || { icon: Zap, color: 'hsl(var(--muted-foreground))', label: toolName, cmd: 'tool' }
}

function getResultSummary(toolName: string, result: Record<string, unknown> | undefined) {
  if (!result) return null

  if (toolName === 'read_repo_file') {
    const path = typeof result.path === 'string' ? result.path : 'file'
    const entries = Array.isArray(result.entries) ? result.entries : null
    const content = typeof result.content === 'string' ? result.content : ''
    if (entries) return `${path}/ — ${entries.length} items`
    const lines = content ? content.split('\n').length : 0
    return `${path} — ${lines} lines read`
  }

  if (toolName === 'analyze_repo' || toolName === 'analyze_github_repo') {
    const fullName = typeof result.fullName === 'string' ? result.fullName : ''
    const language = typeof result.language === 'string' ? result.language : ''
    return [fullName, language].filter(Boolean).join(' • ')
  }

  if (toolName === 'get_repo_activity') {
    const prs = Array.isArray(result.mergedPRs) ? result.mergedPRs.length : 0
    const commits = Array.isArray(result.recentCommits) ? result.recentCommits.length : 0
    return `${prs} PRs • ${commits} commits`
  }

  if (toolName === 'generate_image' || toolName === 'edit_image') {
    const images = Array.isArray(result.images) ? result.images.length : 0
    return `${images} image${images === 1 ? '' : 's'}`
  }

  return null
}

function readErrorMessage(output: Record<string, unknown> | undefined, fallback?: string) {
  if (fallback) return fallback
  if (!output) return undefined
  return typeof output.error === 'string' ? output.error : undefined
}

export function ToolResult({ tool: rawTool, defaultExpanded = false }: ToolResultProps) {
  const rawType = String(rawTool.type || '')
  const toolName = rawType.startsWith('tool-')
    ? rawType.slice(5) // "tool-analyze_repo" → "analyze_repo"
    : String(rawTool.toolName || '')
  const state = String(rawTool.state || '')
  const input = rawTool.input as Record<string, unknown> | undefined
  const output = rawTool.output as Record<string, unknown> | undefined

  const isLoading = state === 'input-streaming' || state === 'input-available'
  const [expanded, setExpanded] = useState(isLoading || defaultExpanded)
  const [userToggled, setUserToggled] = useState(false)

  useEffect(() => {
    if (!userToggled) {
      setExpanded(isLoading || defaultExpanded)
    }
  }, [isLoading, defaultExpanded, userToggled])

  const { icon: Icon, color, label, cmd } = getToolMeta(toolName)
  const result = output
  const errorMessage = readErrorMessage(output, typeof rawTool.errorText === 'string' ? rawTool.errorText : undefined)

  if (!isLoading && errorMessage) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-xs text-amber-200">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{label}: {errorMessage.replace(/^Error:\s*/i, '')}</span>
      </div>
    )
  }

  // Show loading args while tool is executing
  const loadingLabel = isLoading && input ? getLoadingDescription(toolName, input) : null
  const resultSummary = !isLoading ? getResultSummary(toolName, result) : null

  return (
    <div className="rounded-lg bg-card/50 border border-border overflow-hidden">
      <button
        onClick={() => {
          setUserToggled(true)
          setExpanded((value) => !value)
        }}
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
            {resultSummary && (
              <span className="ml-2 text-xs text-muted-foreground">{resultSummary}</span>
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
              {toolName === 'generate_remotion_video' && <RemotionVideoResult result={result} />}
              {toolName === 'check_remotion_status' && <RemotionVideoResult result={result} />}
              {(toolName === 'analyze_repo' || toolName === 'analyze_github_repo') && <RepoResult result={result} />}
              {toolName === 'get_repo_activity' && <ActivityResult result={result} />}
              {toolName === 'read_repo_file' && <FileResult result={result} />}
              {!['generate_image', 'edit_image', 'generate_video', 'check_video_status', 'generate_remotion_video', 'check_remotion_status', 'analyze_repo', 'analyze_github_repo', 'get_repo_activity', 'read_repo_file'].includes(toolName) && <GenericResult result={result} />}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function getLoadingDescription(toolName: string, args: Record<string, unknown>): string | null {
  switch (toolName) {
    case 'generate_image': {
      const provider = args.provider ? ` [${args.provider}]` : ''
      return `"${String(args.prompt || '').slice(0, 50)}..."${provider}`
    }
    case 'edit_image': return `"${String(args.prompt || '').slice(0, 50)}..."`
    case 'generate_video': return `"${String(args.prompt || '').slice(0, 50)}..."`
    case 'generate_remotion_video': return `${args.template} — "${String(args.title || '').slice(0, 40)}"`
    case 'check_remotion_status': return 'polling...'
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
  const [selectedIndex, setSelectedIndex] = useState(0)
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
          <div
            key={i}
            className={`relative group overflow-hidden rounded-lg border bg-muted transition-all ${
              selectedIndex === i ? 'border-primary ring-1 ring-primary/40' : 'border-border'
            }`}
          >
            <img
              src={img.url}
              alt={`Generated ${i + 1}`}
              className="w-full aspect-square object-cover"
              loading="lazy"
              onClick={() => setSelectedIndex(i)}
            />
            <div className="absolute left-2 top-2 rounded bg-black/55 px-1.5 py-0.5 text-[10px] text-white">
              {selectedIndex === i ? 'Selected' : `Option ${i + 1}`}
            </div>
            <div className="absolute inset-0 flex items-end justify-center gap-2 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={() => setSelectedIndex(i)}
                className="rounded bg-white/20 p-2 transition-colors hover:bg-white/30"
                title="Select image"
              >
                <Check size={14} className="text-white" />
              </button>
              <a
                href={img.url}
                download={`mrkt-${i + 1}.png`}
                className="rounded bg-white/20 p-2 transition-colors hover:bg-white/30"
                title="Download image"
              >
                <Download size={14} className="text-white" />
              </a>
              <a
                href={img.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded bg-white/20 p-2 transition-colors hover:bg-white/30"
                title="Open in new tab"
              >
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

// ── Remotion Video Result ─────────────────────────────────────

function RemotionVideoResult({ result }: { result: Record<string, unknown> }) {
  const status = result.status as string | undefined
  const outputUrl = result.outputUrl as string | undefined
  const error = result.error as string | undefined
  const message = result.message as string | undefined
  const progress = result.progress as number | undefined
  const template = result.template as string | undefined
  const duration = result.duration as string | undefined
  const videoId = result.videoId as string | undefined
  const renderId = result.renderId as string | undefined

  if (error) return <ErrorDisplay error={error} />

  // Completed — show inline video player
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

  // Rendering / processing — show progress
  return (
    <div className="p-3 rounded bg-muted/50 border border-border space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <Loader2 size={14} className="animate-spin text-purple-500" />
        <span>{message || `Status: ${status || 'starting...'}`}</span>
      </div>
      {progress !== undefined && progress > 0 && (
        <div className="w-full bg-muted rounded-full h-1.5">
          <div
            className="bg-purple-500 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}
      <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground font-mono">
        {template && <span>template: {template}</span>}
        {duration && <span>duration: {duration}</span>}
        {videoId && <span>id: {videoId.slice(0, 8)}...</span>}
        {renderId && <span>render: {renderId.slice(0, 8)}...</span>}
      </div>
    </div>
  )
}

// ── Repo Analysis Result ──────────────────────────────────────

function RepoResult({ result }: { result: Record<string, unknown> }) {
  const [showDetails, setShowDetails] = useState(false)
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
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Github size={14} className="flex-shrink-0" />
            <span className="font-medium text-sm">{fullName || name}</span>
          </div>
          {description && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{description}</p>}
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            {language && (
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-primary" />
                {language}
              </span>
            )}
            {stars !== undefined && (
              <span className="flex items-center gap-1">
                <Star size={11} className="text-yellow-500" />
                {stars.toLocaleString()}
              </span>
            )}
            {forks !== undefined && (
              <span className="flex items-center gap-1">
                <GitFork size={11} />
                {forks.toLocaleString()}
              </span>
            )}
            {watchers !== undefined && (
              <span className="flex items-center gap-1">
                <Eye size={11} />
                {watchers.toLocaleString()}
              </span>
            )}
          </div>
        </div>
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer" className="rounded p-1.5 transition-colors hover:bg-muted">
            <ExternalLink size={12} className="text-muted-foreground" />
          </a>
        )}
      </div>

      <button
        onClick={() => setShowDetails((value) => !value)}
        className="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
      >
        {showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {showDetails ? 'Hide details' : 'View details'}
      </button>

      {showDetails && (
        <div className="space-y-3 rounded-md border border-border/50 bg-background/40 p-3">
          {homepage && (
            <a href={homepage} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
              {homepage}
            </a>
          )}

          {topics && topics.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {topics.slice(0, 10).map((topic) => (
                <span key={topic} className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {topic}
                </span>
              ))}
            </div>
          )}

          {packageJson?.dependencies && packageJson.dependencies.length > 0 && (
            <div>
              <p className="mb-1 text-[10px] font-mono text-muted-foreground">
                dependencies ({packageJson.dependencies.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {packageJson.dependencies.slice(0, 12).map((dep) => (
                  <span key={dep} className="rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">
                    {dep}
                  </span>
                ))}
                {packageJson.dependencies.length > 12 && (
                  <span className="text-[10px] text-muted-foreground">+{packageJson.dependencies.length - 12} more</span>
                )}
              </div>
            </div>
          )}

          {readme && (
            <div>
              <button
                onClick={() => setShowReadme((value) => !value)}
                className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground"
              >
                {showReadme ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                README.md
              </button>
              {showReadme && (
                <pre className="mt-2 max-h-[240px] overflow-auto whitespace-pre-wrap rounded border border-border bg-background p-3 text-[10px] text-muted-foreground">
                  {readme}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Activity Result ───────────────────────────────────────────

function ActivityResult({ result }: { result: Record<string, unknown> }) {
  const [showDetails, setShowDetails] = useState(false)
  const error = result.error as string | undefined
  if (error) return <ErrorDisplay error={error} />

  const mergedPRs = (result.mergedPRs as Array<{ number: number; title: string; author: string; mergedAt: string; url: string }>) || []
  const recentCommits = (result.recentCommits as Array<{ sha: string; message: string; author: string; date: string }>) || []

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>{mergedPRs.length} merged PRs</span>
        <span>{recentCommits.length} recent commits</span>
      </div>

      <button
        onClick={() => setShowDetails((value) => !value)}
        className="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
      >
        {showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {showDetails ? 'Hide details' : 'View details'}
      </button>

      {showDetails && (
        <div className="space-y-3 rounded-md border border-border/50 bg-background/40 p-3">
      {mergedPRs.length > 0 && (
        <div>
          <p className="text-[10px] text-muted-foreground font-mono mb-2">merged PRs ({mergedPRs.length})</p>
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
          <p className="text-[10px] text-muted-foreground font-mono mb-2">recent commits ({recentCommits.length})</p>
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
        <p className="text-xs text-muted-foreground">No recent activity found.</p>
      )}
        </div>
      )}
    </div>
  )
}

// ── File/Directory Result ─────────────────────────────────────

function FileResult({ result }: { result: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(false)
  const error = result.error as string | undefined
  if (error) return <ErrorDisplay error={error} />

  const path = result.path as string
  const content = result.content as string | undefined
  const entries = result.entries as Array<{ name: string; type: string; size: number; path: string }> | undefined

  // Directory listing
  if (entries) {
    return (
      <div>
        <button
          onClick={() => setExpanded((value) => !value)}
          className="mb-2 flex items-center gap-2 text-left transition-colors hover:text-primary"
        >
          <FolderOpen size={12} className="text-primary" />
          <span className="text-xs font-mono">{path}/</span>
          <span className="text-[10px] text-muted-foreground">{entries.length} items</span>
          {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </button>
        {expanded && (
          <div className="grid grid-cols-2 gap-1">
            {entries.map((entry) => (
              <div key={entry.path} className="flex items-center gap-1.5 rounded p-1 text-[11px] hover:bg-muted/50">
                {entry.type === 'dir' ? (
                  <FolderOpen size={10} className="text-primary flex-shrink-0" />
                ) : (
                  <FileCode size={10} className="text-muted-foreground flex-shrink-0" />
                )}
                <span className="truncate font-mono">{entry.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // File content
  if (content) {
    const lineCount = content.split('\n').length

    return (
      <div>
        <button
          onClick={() => setExpanded((value) => !value)}
          className="flex items-center gap-2 mb-2 hover:text-primary transition-colors"
        >
          <FileCode size={12} />
          <span className="text-xs font-mono">{path}</span>
          <span className="text-[10px] text-muted-foreground">{lineCount} lines read</span>
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
