'use client'

import { useRef, useEffect, useState, useMemo, useCallback, type ComponentType } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import {
  Send,
  Terminal,
  Image,
  Video,
  Github,
  Zap,
  Copy,
  Check,
  RefreshCw,
  ChevronDown,
  Loader2,
  Square,
  Plus,
  Search,
  Trash2,
  PanelLeft,
  FolderCode,
  Palette,
  Sparkles,
  Pencil,
  MoreHorizontal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { MessageContent } from './MessageContent'
import { ToolResult } from './ToolResult'
import { PostCard, parseMarketingPost } from './PostCard'

interface ChatProps {
  brandId?: string
  brandName?: string
  initialWorkflow?: 'image' | 'post' | 'repo' | 'campaign' | null
}

interface PersistedChat {
  id: string
  title: string
  messages: unknown[]
  updated_at: string
  created_at?: string
}

interface BrandContext {
  id: string
  name: string
  description: string | null
  tagline: string | null
  primary_color: string | null
  secondary_color: string | null
  accent_color: string | null
  logo_url: string | null
  github_repo: string | null
  metadata?: {
    availableLogos?: { path: string; downloadUrl: string }[]
    detectedFonts?: string[]
    aiAnalysis?: { summary?: string }
  }
}

interface SidebarAction {
  id: string
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
  onClick: () => void
}

const suggestedPrompts = [
  {
    icon: Image,
    title: 'Generate post images',
    desc: 'Create social-ready image set',
    prompt: 'Generate 4 social post images for this brand. Mix one product-focused visual, one lifestyle visual, one announcement graphic, and one story-format visual.',
    color: 'hsl(var(--primary))',
  },
  {
    icon: Github,
    title: 'Crawl repo for angles',
    desc: 'Extract fresh release messaging',
    prompt: 'Analyze our connected GitHub repository and propose 5 marketing angles based on recent commits and PRs. Then generate image prompts for each angle.',
    color: 'hsl(var(--muted-foreground))',
  },
  {
    icon: Video,
    title: 'Storyboard short video',
    desc: 'Plan image-to-video sequence',
    prompt: 'Create a 20-30 second social video concept from our brand messaging, including scene-by-scene storyboard and a hero image prompt.',
    color: 'hsl(142 76% 36%)',
  },
  {
    icon: Zap,
    title: 'Run full campaign',
    desc: 'Posts + visuals + video',
    prompt: 'Create a one-week social campaign: daily post concepts, image prompts for each post, and one short launch video concept tied to this brand.',
    color: 'hsl(38 92% 50%)',
  },
]

const campaignPrompt =
  'Build a 7-day social campaign plan for this brand with daily post hooks, one image prompt per day, and one motion-video concept at the end of the week.'

function createLocalId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function extractTextFromMessage(message: Record<string, unknown>) {
  const parts = Array.isArray(message.parts) ? message.parts : []
  let text = ''

  for (const part of parts) {
    if (part && typeof part === 'object' && (part as { type?: string }).type === 'text') {
      const piece = String((part as { text?: string }).text || '')
      if (piece) text += piece
    }
  }

  if (!text && typeof message.content === 'string') {
    text = message.content
  }

  return text.trim()
}

function isToolPart(part: Record<string, unknown>) {
  const type = typeof part.type === 'string' ? part.type : ''
  return type === 'dynamic-tool' || type.startsWith('tool-')
}

function messageHasToolParts(message: Record<string, unknown>) {
  const parts = Array.isArray(message.parts) ? (message.parts as Array<Record<string, unknown>>) : []
  return parts.some((part) => part && typeof part === 'object' && isToolPart(part))
}

function sanitizeWorkingNarration(text: string) {
  const compact = text
    .split('\n')
    .filter((line) => {
      const value = line.trim()
      if (!value) return true
      return !/^(let me|now let me|i(?:'| wi)ll (?:start|analyze|read|check|review))/i.test(value)
    })
    .join('\n')
    .trim()

  return compact || text
}

function extractImageUrlsFromToolPart(part: Record<string, unknown>) {
  const output = part.output
  if (!output || typeof output !== 'object') return [] as string[]

  const result = output as { images?: Array<{ url?: string }> }
  if (!Array.isArray(result.images)) return [] as string[]

  return result.images
    .map((image) => (typeof image?.url === 'string' ? image.url : null))
    .filter((url): url is string => Boolean(url))
}

interface RemotionLiveState {
  status: string
  progress?: number
  outputUrl?: string
  message?: string
  error?: string
}

function isRemotionTool(toolName: string) {
  return toolName === 'generate_remotion_video' || toolName === 'check_remotion_status'
}

function getRemotionVideoIdFromPart(part: Record<string, unknown>) {
  const output = part.output && typeof part.output === 'object' ? (part.output as Record<string, unknown>) : undefined
  const input = part.input && typeof part.input === 'object' ? (part.input as Record<string, unknown>) : undefined

  if (output && typeof output.videoId === 'string' && output.videoId) return output.videoId
  if (input && typeof input.videoId === 'string' && input.videoId) return input.videoId
  return ''
}

function normalizeRemotionStatus(status: string | undefined) {
  const normalized = (status || '').toLowerCase()
  if (normalized === 'completed') return 'completed'
  if (normalized === 'failed' || normalized === 'error') return 'failed'
  if (normalized === 'rendering' || normalized === 'processing' || normalized === 'queued' || normalized === 'starting') {
    return 'rendering'
  }
  return normalized || 'rendering'
}

function remotionStatusFromPart(part: Record<string, unknown>, liveByVideoId?: Record<string, RemotionLiveState>) {
  const toolName = getToolNameFromPart(part)
  if (!isRemotionTool(toolName)) return null

  const output = part.output && typeof part.output === 'object' ? (part.output as Record<string, unknown>) : undefined
  const videoId = getRemotionVideoIdFromPart(part)
  const live = videoId ? liveByVideoId?.[videoId] : undefined

  const rawStatus = typeof live?.status === 'string'
    ? live.status
    : (typeof output?.status === 'string' ? output.status : undefined)

  const rawProgress = typeof live?.progress === 'number'
    ? live.progress
    : (typeof output?.progress === 'number' ? output.progress : undefined)

  return {
    videoId,
    status: normalizeRemotionStatus(rawStatus),
    progress: typeof rawProgress === 'number' ? Math.max(0, Math.min(rawProgress, 100)) : undefined,
    outputUrl:
      typeof live?.outputUrl === 'string'
        ? live.outputUrl
        : (typeof output?.outputUrl === 'string' ? output.outputUrl : undefined),
  }
}

function getToolNameFromPart(part: Record<string, unknown>) {
  const rawType = typeof part.type === 'string' ? part.type : ''
  if (rawType.startsWith('tool-')) return rawType.slice(5)
  if (typeof part.toolName === 'string') return part.toolName
  return ''
}

function buildAgentActivitySummary(
  toolParts: Array<Record<string, unknown>>,
  liveRemotionByVideoId?: Record<string, RemotionLiveState>
) {
  let repoName = ''
  let analyzedRepo = false
  let readFileCount = 0
  let generatedImages = 0
  let mergedPrs = 0
  let activeRenderProgress: number | undefined
  let videoReady = false

  for (const part of toolParts) {
    const toolName = getToolNameFromPart(part)
    const output = part.output
    const input = part.input
    const result = output && typeof output === 'object' ? (output as Record<string, unknown>) : undefined
    const args = input && typeof input === 'object' ? (input as Record<string, unknown>) : undefined
    const hasError = Boolean(result && typeof result.error === 'string')
    if (hasError) continue

    if (toolName === 'analyze_repo' || toolName === 'analyze_github_repo') {
      analyzedRepo = true
      if (result && typeof result.fullName === 'string' && result.fullName) {
        repoName = result.fullName
      } else if (args && typeof args.owner === 'string' && typeof args.repo === 'string') {
        repoName = `${args.owner}/${args.repo}`
      }
    }

    if (toolName === 'get_repo_activity') {
      const prCount = Array.isArray(result?.mergedPRs) ? result?.mergedPRs.length : 0
      mergedPrs += prCount
      if (!repoName && args && typeof args.owner === 'string' && typeof args.repo === 'string') {
        repoName = `${args.owner}/${args.repo}`
      }
    }

    if (toolName === 'read_repo_file') {
      readFileCount += 1
    }

    if (toolName === 'generate_image' || toolName === 'edit_image') {
      const imageCount = Array.isArray(result?.images) ? result.images.length : 0
      generatedImages += imageCount
    }

    const remotion = remotionStatusFromPart(part, liveRemotionByVideoId)
    if (remotion) {
      if (remotion.status === 'completed') {
        videoReady = true
      } else if (remotion.status === 'rendering') {
        activeRenderProgress = typeof remotion.progress === 'number' ? remotion.progress : activeRenderProgress
      }
    }
  }

  const parts: string[] = []

  if (repoName) {
    parts.push(`Crawled ${repoName}`)
  } else if (analyzedRepo) {
    parts.push('Analyzed repo')
  }

  if (readFileCount > 0) {
    parts.push(`read ${readFileCount} file${readFileCount === 1 ? '' : 's'}`)
  }

  if (mergedPrs > 0) {
    parts.push(`${mergedPrs} PR${mergedPrs === 1 ? '' : 's'}`)
  }

  if (generatedImages > 0) {
    parts.push(`generated ${generatedImages} image${generatedImages === 1 ? '' : 's'}`)
  }

  let videoStatusPart: string | null = null
  if (typeof activeRenderProgress === 'number') {
    videoStatusPart = `rendering video (${Math.round(activeRenderProgress)}%)`
    parts.push(videoStatusPart)
  } else if (videoReady) {
    videoStatusPart = 'video ready'
    parts.push(videoStatusPart)
  }

  const summaryParts = parts.slice(0, 3)
  if (videoStatusPart && !summaryParts.some((part) => part.includes('video'))) {
    if (summaryParts.length === 3) {
      summaryParts[2] = videoStatusPart
    } else {
      summaryParts.push(videoStatusPart)
    }
  }

  return summaryParts.join(' · ')
}

function normalizeLoadedMessages(rawMessages: unknown): UIMessage[] {
  if (!Array.isArray(rawMessages)) return []

  return rawMessages
    .map((raw) => {
      if (!raw || typeof raw !== 'object') return null
      const candidate = raw as Record<string, unknown>

      const role =
        candidate.role === 'assistant' || candidate.role === 'system' || candidate.role === 'user'
          ? candidate.role
          : 'assistant'

      if (Array.isArray(candidate.parts) && candidate.parts.length > 0) {
        return {
          ...(candidate as unknown as UIMessage),
          id: typeof candidate.id === 'string' ? candidate.id : createLocalId(),
          role,
        }
      }

      if (typeof candidate.content === 'string' && candidate.content.trim()) {
        const baseText = candidate.content.trim()
        const generatedImages = Array.isArray(candidate.generatedImages)
          ? candidate.generatedImages
              .map((url) => (typeof url === 'string' ? `- ${url}` : null))
              .filter(Boolean)
              .join('\n')
          : ''
        const generatedVideo =
          typeof candidate.generatedVideo === 'string' && candidate.generatedVideo
            ? `\n\nVideo: ${candidate.generatedVideo}`
            : ''

        const withArtifacts = generatedImages
          ? `${baseText}\n\nGenerated images:\n${generatedImages}${generatedVideo}`
          : `${baseText}${generatedVideo}`

        return {
          id: typeof candidate.id === 'string' ? candidate.id : createLocalId(),
          role,
          parts: [{ type: 'text', text: withArtifacts }],
        } as UIMessage
      }

      return null
    })
    .filter((msg): msg is UIMessage => Boolean(msg))
}

function serializeMessages(messages: UIMessage[]) {
  return messages.map((message) => ({
    ...message,
    content: extractTextFromMessage(message as unknown as Record<string, unknown>),
    timestamp: new Date().toISOString(),
  }))
}

function deriveChatTitle(messages: UIMessage[]) {
  const firstUserMessage = messages.find((m) => m.role === 'user')
  if (!firstUserMessage) return 'Untitled Chat'

  const text = extractTextFromMessage(firstUserMessage as unknown as Record<string, unknown>)
  if (!text) return 'Untitled Chat'

  return text.length > 64 ? `${text.slice(0, 61)}...` : text
}

function parseRepoRef(repoRef: string) {
  const clean = repoRef
    .trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/\/$/, '')

  const [owner, repo] = clean.split('/')
  if (!owner || !repo) return null

  return { owner, repo, fullName: `${owner}/${repo}` }
}

function buildBrandMaterialsPrompt(brand: BrandContext) {
  const logos = brand.metadata?.availableLogos?.length || 0
  const fonts = brand.metadata?.detectedFonts?.slice(0, 5).join(', ') || 'not detected'

  return `Load brand materials into the working context for ${brand.name}.\n\nBrand details:\n- Name: ${brand.name}\n- Tagline: ${brand.tagline || 'not set'}\n- Description: ${brand.description || 'not set'}\n- Colors: primary=${brand.primary_color || 'not set'}, secondary=${brand.secondary_color || 'not set'}, accent=${brand.accent_color || 'not set'}\n- Logos available from repo: ${logos}\n- Detected fonts: ${fonts}\n\nUse this context to create social post concepts and image prompts that stay on-brand.`
}

function buildRepoCrawlPrompt(repoRef: string, brand?: string) {
  const parsed = parseRepoRef(repoRef)
  if (!parsed) {
    return `I want to analyze repository "${repoRef}" and turn it into social content. Please infer owner/repo and proceed with repo analysis, recent activity, and image prompt generation.`
  }

  return `Crawl and analyze ${parsed.fullName}${brand ? ` for ${brand}` : ''}.\n\nRun this workflow:\n1) analyze_repo(owner: "${parsed.owner}", repo: "${parsed.repo}")\n2) get_repo_activity(owner: "${parsed.owner}", repo: "${parsed.repo}")\n3) read core files needed for messaging (README and key app pages/components)\n4) return:\n   - 5 social post ideas tied to actual repo progress\n   - 5 image prompts ready for generation\n   - 1 short video concept using the strongest image idea.`
}

function getWorkflowStarterPrompt(workflow: 'image' | 'post' | 'repo' | 'campaign', brand?: string) {
  const brandContext = brand ? ` for ${brand}` : ''

  if (workflow === 'image') {
    return `Generate a social image pack${brandContext}. Create 4 distinct image prompts and recommend which provider (Grok/OpenAI/Imagen) is best for each.`
  }

  if (workflow === 'post') {
    return `Create a social post set${brandContext}. Draft LinkedIn, X, and Instagram copy for one campaign theme, plus matching image prompts and hashtags.`
  }

  if (workflow === 'repo') {
    return `Analyze our repository${brandContext} and convert the latest work into post ideas, image prompts, and one short launch video concept.`
  }

  return `Build a 7-day social campaign${brandContext} with daily post hooks, one image prompt per day, and one motion/video concept for the week.`
}

export function Chat({ brandId, brandName, initialWorkflow }: ChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isHydratingChatRef = useRef(false)
  const appliedWorkflowRef = useRef<string | null>(null)

  const [input, setInput] = useState('')
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [showAgentWork, setShowAgentWork] = useState(false)

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [chatSearch, setChatSearch] = useState('')
  const [repoReference, setRepoReference] = useState('')
  const [chats, setChats] = useState<PersistedChat[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [isLoadingChats, setIsLoadingChats] = useState(false)
  const [isSavingChat, setIsSavingChat] = useState(false)
  const [brandContext, setBrandContext] = useState<BrandContext | null>(null)

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: { brandId },
      }),
    [brandId]
  )

  const { messages, setMessages, sendMessage, status, error, regenerate, stop } = useChat({
    transport,
    onFinish: () => {
      scrollToBottom()
    },
  })

  const isStreaming = status === 'streaming' || status === 'submitted'

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const persistChat = useCallback(
    async (draftMessages: UIMessage[]) => {
      if (!brandId || draftMessages.length === 0) return

      const serialized = serializeMessages(draftMessages)
      const title = deriveChatTitle(draftMessages)

      setIsSavingChat(true)
      try {
        if (currentChatId) {
          const response = await fetch(`/api/chats/${currentChatId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, messages: serialized }),
          })

          if (!response.ok) return

          setChats((prev) =>
            [...prev]
              .map((chat) =>
                chat.id === currentChatId
                  ? {
                      ...chat,
                      title,
                      messages: serialized,
                      updated_at: new Date().toISOString(),
                    }
                  : chat
              )
              .sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at))
          )
          return
        }

        const response = await fetch('/api/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brandId,
            title,
            messages: serialized,
          }),
        })

        if (!response.ok) return

        const data = await response.json()
        const createdChat = data.chat as PersistedChat
        if (!createdChat?.id) return

        setCurrentChatId(createdChat.id)
        setChats((prev) =>
          [
            {
              ...createdChat,
              messages: serialized,
              title,
            },
            ...prev.filter((chat) => chat.id !== createdChat.id),
          ].sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at))
        )
      } catch (persistError) {
        console.error('Failed to persist chat:', persistError)
      } finally {
        setIsSavingChat(false)
      }
    },
    [brandId, currentChatId]
  )

  const fetchChats = useCallback(async () => {
    if (!brandId) return

    setIsLoadingChats(true)
    try {
      const response = await fetch(`/api/chats?brandId=${encodeURIComponent(brandId)}`)
      if (!response.ok) return

      const data = await response.json()
      const loaded = Array.isArray(data.chats) ? (data.chats as PersistedChat[]) : []
      setChats(loaded)
    } catch (fetchError) {
      console.error('Failed to fetch chats:', fetchError)
    } finally {
      setIsLoadingChats(false)
    }
  }, [brandId])

  const fetchBrandContext = useCallback(async () => {
    if (!brandId) return

    try {
      const response = await fetch(`/api/brands/${brandId}`)
      if (!response.ok) return

      const data = (await response.json()) as BrandContext
      setBrandContext(data)
      setRepoReference((previous) => previous || data.github_repo || '')
    } catch (fetchError) {
      console.error('Failed to fetch brand context:', fetchError)
    }
  }, [brandId])

  useEffect(() => {
    fetchChats()
  }, [fetchChats])

  useEffect(() => {
    fetchBrandContext()
  }, [fetchBrandContext])

  useEffect(() => {
    if (!initialWorkflow) return
    if (messages.length > 0) return
    if (input.trim().length > 0) return
    if (appliedWorkflowRef.current === initialWorkflow) return

    setInput(getWorkflowStarterPrompt(initialWorkflow, brandName || brandContext?.name))
    appliedWorkflowRef.current = initialWorkflow
  }, [initialWorkflow, messages.length, input, brandName, brandContext?.name])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      setShowScrollButton(scrollHeight - scrollTop - clientHeight > 120)
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (isHydratingChatRef.current) return
    if (messages.length === 0) return

    const typedMessages = messages as UIMessage[]

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }

    saveTimerRef.current = setTimeout(() => {
      void persistChat(typedMessages)
    }, 1600)

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [messages, persistChat])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [])

  const startNewChat = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }

    if (isStreaming) {
      stop()
    }

    setCurrentChatId(null)
    setMessages([])
    setInput('')
    setSidebarOpen(false)
  }, [isStreaming, setMessages, stop])

  const loadChat = useCallback(
    async (chatId: string) => {
      try {
        const response = await fetch(`/api/chats/${chatId}`)
        if (!response.ok) return

        const data = await response.json()
        const rawMessages = data.chat?.messages
        const normalized = normalizeLoadedMessages(rawMessages)

        isHydratingChatRef.current = true
        setCurrentChatId(chatId)
        setMessages(normalized)
        setSidebarOpen(false)

        window.setTimeout(() => {
          isHydratingChatRef.current = false
        }, 0)
      } catch (loadError) {
        console.error('Failed to load chat:', loadError)
        isHydratingChatRef.current = false
      }
    },
    [setMessages]
  )

  const deleteChat = useCallback(
    async (chatId: string) => {
      try {
        const response = await fetch(`/api/chats/${chatId}`, { method: 'DELETE' })
        if (!response.ok) return

        setChats((prev) => prev.filter((chat) => chat.id !== chatId))

        if (currentChatId === chatId) {
          setCurrentChatId(null)
          setMessages([])
        }
      } catch (deleteError) {
        console.error('Failed to delete chat:', deleteError)
      }
    },
    [currentChatId, setMessages]
  )

  const sendQuickPrompt = useCallback(
    async (prompt: string) => {
      const nextPrompt = prompt.trim()
      if (!nextPrompt || isStreaming) return

      setSidebarOpen(false)
      await sendMessage({ text: nextPrompt })
    },
    [isStreaming, sendMessage]
  )

  const runBrandMaterialsAction = useCallback(() => {
    if (!brandContext) return
    void sendQuickPrompt(buildBrandMaterialsPrompt(brandContext))
  }, [brandContext, sendQuickPrompt])

  const runRepoCrawlAction = useCallback(() => {
    const repo = repoReference.trim() || brandContext?.github_repo || ''
    if (!repo) return
    void sendQuickPrompt(buildRepoCrawlPrompt(repo, brandContext?.name || brandName))
  }, [repoReference, brandContext, brandName, sendQuickPrompt])

  const runImageSetAction = useCallback(() => {
    void sendQuickPrompt('Generate a batch of 4 social post image concepts for this brand with short captions and hashtags for each image.')
  }, [sendQuickPrompt])

  const runCampaignAction = useCallback(() => {
    void sendQuickPrompt(campaignPrompt)
  }, [sendQuickPrompt])

  const sidebarActions = useMemo<SidebarAction[]>(
    () => [
      {
        id: 'brand-materials',
        icon: Palette,
        title: 'Pull Brand Materials',
        description: 'Inject colors, logos, fonts, and tone into chat context.',
        onClick: runBrandMaterialsAction,
      },
      {
        id: 'repo-crawl',
        icon: FolderCode,
        title: 'Crawl Repo',
        description: 'Analyze codebase and convert updates into social content.',
        onClick: runRepoCrawlAction,
      },
      {
        id: 'image-batch',
        icon: Image,
        title: 'Generate Image Set',
        description: 'Create post images and captions as a single run.',
        onClick: runImageSetAction,
      },
      {
        id: 'campaign',
        icon: Sparkles,
        title: 'Plan Weekly Campaign',
        description: 'Posts, visuals, and one motion concept across a week.',
        onClick: runCampaignAction,
      },
    ],
    [runBrandMaterialsAction, runRepoCrawlAction, runImageSetAction, runCampaignAction]
  )

  const filteredChats = useMemo(() => {
    const needle = chatSearch.trim().toLowerCase()
    if (!needle) return chats

    return chats.filter((chat) => {
      const title = (chat.title || '').toLowerCase()
      return title.includes(needle)
    })
  }, [chats, chatSearch])

  const activeChatTitle = useMemo(() => {
    if (!currentChatId) return 'New chat'
    const active = chats.find((chat) => chat.id === currentChatId)
    return active?.title || 'Saved chat'
  }, [chats, currentChatId])

  const hasAnyToolCalls = useMemo(
    () => messages.some((message) => messageHasToolParts(message as unknown as Record<string, unknown>)),
    [messages]
  )

  const rawErrorMessage = error?.message || ''
  const isContextTooLongError = /input is too long|context length|token limit/i.test(rawErrorMessage)
  const friendlyErrorMessage = isContextTooLongError
    ? 'This conversation got too long for the model. Start a new chat or retry with a simpler request.'
    : rawErrorMessage || 'Command failed.'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isStreaming) return

    const message = input.trim()
    setInput('')
    await sendMessage({ text: message })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSubmit(e as unknown as React.FormEvent)
    }
  }

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = e.target
    setInput(target.value)
    target.style.height = 'auto'
    target.style.height = `${Math.min(target.scrollHeight, 220)}px`
  }

  const handlePromptSelect = (prompt: string) => {
    setInput(prompt)
  }

  const renderSidebar = (
    <ChatSidebar
      brandName={brandContext?.name || brandName}
      chatSearch={chatSearch}
      onChatSearchChange={setChatSearch}
      repoReference={repoReference}
      onRepoReferenceChange={setRepoReference}
      onNewChat={startNewChat}
      actions={sidebarActions}
      chats={filteredChats}
      currentChatId={currentChatId}
      onLoadChat={loadChat}
      onDeleteChat={deleteChat}
      isLoadingChats={isLoadingChats}
      isSavingChat={isSavingChat}
      connectedRepo={brandContext?.github_repo}
      onCloseMobile={() => setSidebarOpen(false)}
    />
  )

  const isEmpty = messages.length === 0

  return (
    <div className="relative flex h-full min-h-0 flex-1 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden w-[320px] border-r border-border/50 bg-sidebar lg:flex lg:flex-col">
        {renderSidebar}
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent
          side="left"
          className="w-[320px] max-w-[90vw] border-r border-border/50 bg-sidebar p-0"
          showCloseButton={false}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Chat Sidebar</SheetTitle>
            <SheetDescription>Chat history and workflow actions</SheetDescription>
          </SheetHeader>
          {renderSidebar}
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border/50 px-3 py-2.5 lg:hidden">
          <Button variant="ghost" size="icon-sm" onClick={() => setSidebarOpen(true)}>
            <PanelLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 text-center">
            <p className="truncate text-sm font-medium">{brandContext?.name || brandName || 'Brand chat'}</p>
            <p className="text-[11px] text-muted-foreground">{activeChatTitle}</p>
          </div>
          <div className="h-8 w-8" />
        </div>

        <div className="hidden items-center justify-between border-b border-border/50 px-6 py-3 lg:flex">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-primary" />
              <p className="truncate text-sm font-medium">{activeChatTitle}</p>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {brandContext?.github_repo || 'No repository connected yet'}
            </p>
          </div>
          <span className="text-xs text-muted-foreground">{isSavingChat ? 'Saving…' : 'Saved'}</span>
        </div>

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-5 md:px-6 md:py-6">
          {isEmpty ? (
            <EmptyState
              brandName={brandContext?.name || brandName}
              onPromptSelect={handlePromptSelect}
              onRunRepoCrawl={runRepoCrawlAction}
              onRunCampaign={runCampaignAction}
              hasConnectedRepo={Boolean(brandContext?.github_repo || repoReference.trim())}
              recentChat={chats[0] || null}
              onContinueChat={
                chats[0]
                  ? () => {
                      void loadChat(chats[0].id)
                    }
                  : undefined
              }
            />
          ) : (
            <div className="mx-auto max-w-4xl space-y-4 sm:space-y-6">
              {hasAnyToolCalls && (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setShowAgentWork((value) => !value)}
                  >
                    {showAgentWork ? 'Hide' : 'Show'} agent work
                  </Button>
                </div>
              )}

              {messages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={message as unknown as MessageBubbleProps['message']}
                  isLoading={isStreaming && index === messages.length - 1}
                  showAgentWork={showAgentWork}
                  onToggleAgentWork={() => setShowAgentWork((value) => !value)}
                  onEditPrompt={handlePromptSelect}
                />
              ))}

              {isStreaming && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex items-start gap-3 animate-fade-in">
                  <span className="mt-0.5 flex h-6 min-w-6 items-center justify-center rounded border border-border bg-muted text-[10px] font-semibold text-primary">
                    AI
                  </span>
                  <div className="rounded-lg border border-border bg-muted px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 size={14} className="animate-spin" />
                      <span className="font-mono">processing...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-28 left-1/2 -translate-x-1/2 rounded-full border border-border bg-card p-2 shadow-lg transition-all hover:bg-muted"
          >
            <ChevronDown size={18} className="text-muted-foreground" />
          </button>
        )}

        <div className="border-t border-border bg-background/95 px-4 py-4 backdrop-blur md:px-6">
          <div className="mx-auto max-w-4xl">
            {error && (
              <div className="mb-3 flex items-center justify-between gap-2 rounded border border-destructive/30 bg-destructive/20 p-3 text-sm text-destructive">
                <span className="text-xs">{friendlyErrorMessage}</span>
                <div className="flex items-center gap-2">
                  {isContextTooLongError && (
                    <Button variant="outline" size="xs" onClick={startNewChat}>
                      Start new chat
                    </Button>
                  )}
                  <button
                    onClick={() => regenerate()}
                    className="flex items-center gap-1 text-xs transition-colors hover:text-destructive/80"
                  >
                    <RefreshCw size={12} /> retry
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="relative">
              <div className="relative overflow-hidden rounded-lg border border-border bg-muted transition-all focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20">
                <div className="pointer-events-none absolute left-4 top-4 flex items-center text-sm">
                  <span className="font-mono text-primary">$</span>
                </div>

                <textarea
                  value={input}
                  onChange={handleTextareaInput}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
                  placeholder="Ask the agent to create posts, generate visuals, or crawl your repo..."
                  rows={1}
                  className="min-h-[56px] w-full resize-none bg-transparent py-4 pl-10 pr-14 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  disabled={isStreaming}
                />

                <div className="absolute bottom-2 right-2 flex items-center gap-2">
                  {isStreaming ? (
                    <Button
                      type="button"
                      onClick={() => stop()}
                      size="icon"
                      variant="destructive"
                      className="h-10 w-10"
                    >
                      <Square size={14} />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={!input.trim()}
                      size="icon"
                      variant="default"
                      className="h-10 w-10"
                    >
                      <Send size={16} />
                    </Button>
                  )}
                </div>
              </div>

              {isInputFocused && (
                <div className="mt-2 hidden justify-end px-1 text-[10px] text-muted-foreground sm:flex">
                  <span>enter to send • shift+enter for new line</span>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

interface ChatSidebarProps {
  brandName?: string
  chatSearch: string
  onChatSearchChange: (value: string) => void
  repoReference: string
  onRepoReferenceChange: (value: string) => void
  onNewChat: () => void
  actions: SidebarAction[]
  chats: PersistedChat[]
  currentChatId: string | null
  onLoadChat: (chatId: string) => void
  onDeleteChat: (chatId: string) => void
  isLoadingChats: boolean
  isSavingChat: boolean
  connectedRepo?: string | null
  onCloseMobile: () => void
}

function ChatSidebar({
  brandName,
  chatSearch,
  onChatSearchChange,
  repoReference,
  onRepoReferenceChange,
  onNewChat,
  actions,
  chats,
  currentChatId,
  onLoadChat,
  onDeleteChat,
  isLoadingChats,
  isSavingChat,
  connectedRepo,
  onCloseMobile,
}: ChatSidebarProps) {
  const [isEditingRepo, setIsEditingRepo] = useState(false)
  const [repoDraft, setRepoDraft] = useState(repoReference)
  const [showSyncStatus, setShowSyncStatus] = useState(false)
  const wasSavingRef = useRef(false)

  useEffect(() => {
    if (!isEditingRepo) {
      setRepoDraft(repoReference)
    }
  }, [repoReference, isEditingRepo])

  useEffect(() => {
    let timer: number | null = null

    if (isSavingChat) {
      setShowSyncStatus(true)
    } else if (wasSavingRef.current) {
      timer = window.setTimeout(() => setShowSyncStatus(false), 1400)
    }

    wasSavingRef.current = isSavingChat

    return () => {
      if (timer) window.clearTimeout(timer)
    }
  }, [isSavingChat])

  const activeRepo = repoReference.trim() || connectedRepo || ''

  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="border-b border-border/40 px-4 pb-3 pt-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-primary/30 bg-primary/10">
            <Terminal className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{brandName || 'Brand Studio'}</p>
            <p className="truncate text-[11px] text-muted-foreground">Chat-first social automation</p>
          </div>
        </div>

        <Button
          variant="outline"
          className="mt-3 h-8 w-full justify-start border-border/60 bg-transparent text-xs font-medium hover:bg-muted/70"
          onClick={() => {
            onNewChat()
            onCloseMobile()
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          New chat
        </Button>
      </div>

      <div className="border-b border-border/40 px-3 py-3">
        <p className="px-1 text-[11px] uppercase tracking-wide text-muted-foreground">Chats</p>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={chatSearch}
            onChange={(e) => onChatSearchChange(e.target.value)}
            placeholder="Search chats"
            className="mt-2 h-8 border-border/50 bg-muted/30 pl-8 text-xs"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {isLoadingChats ? (
          <div className="flex items-center gap-2 px-2 py-3 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading chats...
          </div>
        ) : chats.length === 0 ? (
          <p className="px-2 py-3 text-xs text-muted-foreground">No saved chats yet.</p>
        ) : (
          <div className="space-y-1">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className={cn(
                  'group rounded-md border border-transparent transition-all',
                  currentChatId === chat.id && 'border-primary/40 bg-primary/10'
                )}
              >
                <div className="flex items-start gap-1 px-1 py-1">
                  <button
                    onClick={() => {
                      onLoadChat(chat.id)
                      onCloseMobile()
                    }}
                    className="flex-1 rounded px-1.5 py-1 text-left hover:bg-muted/40"
                    title={chat.title || 'Untitled Chat'}
                  >
                    <p className="truncate text-xs">{chat.title || 'Untitled Chat'}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {new Date(chat.updated_at).toLocaleDateString()}
                    </p>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="mt-1 h-6 w-6 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      void onDeleteChat(chat.id)
                    }}
                    title="Delete chat"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2.5 border-t border-border/40 px-3 py-3">
        <p className="px-1 text-[11px] uppercase tracking-wide text-muted-foreground">More</p>

        <div className="rounded-md border border-border/50 bg-muted/20 p-2">
          <div className="flex items-center justify-between gap-2">
            {activeRepo ? (
              <Badge
                variant="outline"
                className="max-w-[200px] justify-start truncate border-border/60 bg-background/70 px-2 py-0.5 font-mono text-[10px]"
                title={activeRepo}
              >
                {activeRepo}
              </Badge>
            ) : (
              <span className="text-[11px] text-muted-foreground">No repo connected</span>
            )}
            <Button
              variant="ghost"
              size="icon-xs"
              className="h-6 w-6"
              onClick={() => setIsEditingRepo((value) => !value)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>

          {isEditingRepo && (
            <div className="mt-2 flex items-center gap-2">
              <Input
                value={repoDraft}
                onChange={(e) => setRepoDraft(e.target.value)}
                placeholder="owner/repo"
                className="h-8 border-border/50 bg-background/80 text-xs"
              />
              <Button
                size="xs"
                variant="outline"
                disabled={!repoDraft.trim()}
                onClick={() => {
                  onRepoReferenceChange(repoDraft.trim())
                  setIsEditingRepo(false)
                }}
              >
                Save
              </Button>
            </div>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 w-full justify-between text-xs">
              Quick actions
              <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
            <DropdownMenuLabel className="text-xs">Quick actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {actions.map((action) => (
              <DropdownMenuItem
                key={action.id}
                onClick={() => {
                  action.onClick()
                  onCloseMobile()
                }}
                className="gap-2 text-xs"
              >
                <action.icon className="h-3.5 w-3.5 text-primary" />
                <span>{action.title}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {showSyncStatus && (
          <div className="px-1 text-[10px] text-muted-foreground">
            Chat sync {isSavingChat ? 'saving...' : 'saved'}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Message Bubble ────────────────────────────────────────────

interface MessageBubbleProps {
  message: {
    id: string
    role: 'user' | 'assistant' | 'system'
    parts: Array<Record<string, unknown>>
  }
  isLoading: boolean
  showAgentWork: boolean
  onToggleAgentWork: () => void
  onEditPrompt: (prompt: string) => void
}

function MessageBubble({ message, isLoading, showAgentWork, onToggleAgentWork, onEditPrompt }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false)
  const [liveRemotionByVideoId, setLiveRemotionByVideoId] = useState<Record<string, RemotionLiveState>>({})
  const liveRemotionRef = useRef<Record<string, RemotionLiveState>>({})
  const isUser = message.role === 'user'

  // Build ordered render blocks from parts (interleave text + tools)
  const renderBlocks: Array<{ type: 'text'; content: string } | { type: 'tool'; part: Record<string, unknown> }> = []
  let currentText = ''

  for (const part of message.parts || []) {
    if (part.type === 'text') {
      const t = String(part.text || '')
      if (t) currentText += t
    } else if (
      part.type === 'dynamic-tool' ||
      (typeof part.type === 'string' && String(part.type).startsWith('tool-'))
    ) {
      // Flush accumulated text before the tool
      if (currentText.trim()) {
        renderBlocks.push({ type: 'text', content: currentText.trim() })
        currentText = ''
      }
      renderBlocks.push({ type: 'tool', part })
    }
    // Skip step-start and other non-renderable parts
  }

  // Flush remaining text
  if (currentText.trim()) {
    renderBlocks.push({ type: 'text', content: currentText.trim() })
  }

  const toolBlocks = renderBlocks.filter((block) => block.type === 'tool') as Array<{ type: 'tool'; part: Record<string, unknown> }>
  const textBlocks = renderBlocks.filter((block) => block.type === 'text') as Array<{ type: 'text'; content: string }>
  const remotionSeeds = useMemo(
    () =>
      toolBlocks.reduce<Record<string, RemotionLiveState>>((acc, block) => {
        const remotion = remotionStatusFromPart(block.part)
        if (remotion?.videoId) {
          acc[remotion.videoId] = {
            status: remotion.status,
            progress: remotion.progress,
            outputUrl: remotion.outputUrl,
          }
        }
        return acc
      }, {}),
    [toolBlocks]
  )

  const remotionSeedSignature = useMemo(
    () =>
      Object.entries(remotionSeeds)
        .map(([videoId, state]) => `${videoId}:${state.status}:${state.progress ?? ''}:${state.outputUrl ? '1' : '0'}`)
        .sort()
        .join('|'),
    [remotionSeeds]
  )

  useEffect(() => {
    setLiveRemotionByVideoId((prev) => {
      const next: Record<string, RemotionLiveState> = {}
      let changed = false

      for (const [videoId, seed] of Object.entries(remotionSeeds)) {
        const existing = prev[videoId]
        if (!existing) {
          next[videoId] = seed
          changed = true
          continue
        }

        const existingStatus = normalizeRemotionStatus(existing.status)
        const seedStatus = normalizeRemotionStatus(seed.status)
        if (existingStatus === 'completed' || existingStatus === 'failed') {
          next[videoId] = existing
          continue
        }

        next[videoId] = {
          status: seedStatus || existing.status,
          progress: typeof seed.progress === 'number' ? seed.progress : existing.progress,
          outputUrl: seed.outputUrl || existing.outputUrl,
          message: seed.message || existing.message,
          error: seed.error || existing.error,
        }

        if (
          next[videoId].status !== existing.status ||
          next[videoId].progress !== existing.progress ||
          next[videoId].outputUrl !== existing.outputUrl
        ) {
          changed = true
        }
      }

      if (Object.keys(prev).some((videoId) => !remotionSeeds[videoId])) {
        changed = true
      }

      return changed ? next : prev
    })
  }, [remotionSeedSignature, remotionSeeds])

  useEffect(() => {
    liveRemotionRef.current = liveRemotionByVideoId
  }, [liveRemotionByVideoId])

  useEffect(() => {
    const remotionIds = Object.keys(remotionSeeds)
    if (remotionIds.length === 0) return

    let cancelled = false

    const pollOnce = async () => {
      const currentLive = liveRemotionRef.current
      const pendingIds = remotionIds.filter((videoId) => {
        const currentStatus = normalizeRemotionStatus(currentLive[videoId]?.status || remotionSeeds[videoId]?.status)
        return currentStatus !== 'completed' && currentStatus !== 'failed'
      })

      if (pendingIds.length === 0) return

      const updates: Record<string, RemotionLiveState> = {}
      await Promise.all(
        pendingIds.map(async (videoId) => {
          try {
            const response = await fetch(`/api/videos/generate?id=${encodeURIComponent(videoId)}`)
            if (!response.ok) return

            const data = await response.json()
            const status = normalizeRemotionStatus(typeof data.status === 'string' ? data.status : undefined)
            updates[videoId] = {
              status,
              progress:
                typeof data.render_progress === 'number'
                  ? data.render_progress
                  : (typeof data.progress === 'number' ? data.progress : undefined),
              outputUrl:
                typeof data.output_url === 'string'
                  ? data.output_url
                  : (typeof data.outputUrl === 'string' ? data.outputUrl : undefined),
              message: typeof data.message === 'string' ? data.message : undefined,
              error:
                typeof data.error_message === 'string'
                  ? data.error_message
                  : (typeof data.error === 'string' ? data.error : undefined),
            }
          } catch {
            // Keep existing status on transient poll failures.
          }
        })
      )

      if (cancelled || Object.keys(updates).length === 0) return

      setLiveRemotionByVideoId((prev) => {
        const next = { ...prev }
        let changed = false

        for (const [videoId, update] of Object.entries(updates)) {
          const previous = next[videoId]
          const merged: RemotionLiveState = {
            ...previous,
            ...update,
            progress:
              typeof update.progress === 'number'
                ? update.progress
                : previous?.progress,
          }
          next[videoId] = merged

          if (
            !previous ||
            previous.status !== merged.status ||
            previous.progress !== merged.progress ||
            previous.outputUrl !== merged.outputUrl ||
            previous.error !== merged.error
          ) {
            changed = true
          }
        }

        return changed ? next : prev
      })
    }

    void pollOnce()
    const interval = window.setInterval(() => {
      void pollOnce()
    }, 4000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [remotionSeedSignature, remotionSeeds])

  const hasContent = renderBlocks.length > 0
  const rawText = textBlocks.map((block) => block.content).join('\n').trim()
  const fullText = isUser ? rawText : sanitizeWorkingNarration(rawText)
  const toolImageUrls = toolBlocks.flatMap((block) => extractImageUrlsFromToolPart(block.part))
  const hasTools = !isUser && toolBlocks.length > 0
  const parsedPost = !isUser ? parseMarketingPost(fullText) : null
  const activitySummary = hasTools ? buildAgentActivitySummary(toolBlocks.map((block) => block.part), liveRemotionByVideoId) : ''
  const stepLabel = `${toolBlocks.length} step${toolBlocks.length === 1 ? '' : 's'}`
  const remotionStatuses = toolBlocks
    .map((block) => remotionStatusFromPart(block.part, liveRemotionByVideoId))
    .filter((value): value is NonNullable<typeof value> => Boolean(value))
  const activeRemotion = remotionStatuses.find((status) => status.status === 'rendering')
  const hasActiveRender = Boolean(activeRemotion)
  const activeRenderLabel = hasActiveRender
    ? `Rendering video${typeof activeRemotion.progress === 'number' ? `... ${Math.round(activeRemotion.progress)}%` : '...'}`
    : ''

  const fallbackText = renderBlocks
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; content: string }).content)
    .join('\n')

  // Don't render completely empty messages
  if (!hasContent && !isLoading) return null

  const handleCopy = async () => {
    if (!fallbackText) return
    await navigator.clipboard.writeText(fallbackText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <span
        className={`mt-0.5 flex h-6 min-w-6 items-center justify-center rounded border text-[10px] font-semibold ${
          isUser ? 'border-primary/40 bg-primary/15 text-yellow-400' : 'border-border bg-muted text-primary'
        }`}
      >
        {isUser ? '$' : 'AI'}
      </span>

      <div className={`flex-1 max-w-[90%] ${isUser ? 'flex flex-col items-end' : ''} space-y-3`}>
        {fullText && (
          <div
            className={`group relative rounded-lg px-4 py-3 ${
              isUser ? 'border border-primary/30 bg-primary/20' : 'border border-border bg-muted'
            }`}
          >
            {!isUser && parsedPost && <PostCard content={fullText} imageUrls={toolImageUrls} onEdit={onEditPrompt} />}
            {isUser || !parsedPost ? <MessageContent content={fullText} /> : null}

            {!isUser && !isLoading && (
              <button
                onClick={handleCopy}
                className="absolute -right-8 top-2 hidden rounded p-1 opacity-0 transition-all hover:bg-muted sm:block group-hover:opacity-100"
              >
                {copied ? (
                  <Check size={12} className="text-primary" />
                ) : (
                  <Copy size={12} className="text-muted-foreground" />
                )}
              </button>
            )}
          </div>
        )}

        {hasTools && (
          <div className="overflow-hidden rounded-lg border border-border/60 bg-card/40">
            <div className="flex items-center justify-between gap-2 px-3 py-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {isLoading || hasActiveRender ? (
                  <Loader2 size={12} className="animate-spin text-primary" />
                ) : (
                  <Check size={12} className="text-primary" />
                )}
                <span>Agent activity</span>
                <span>({stepLabel})</span>
                {activitySummary && <span className="truncate text-[11px] text-muted-foreground">· {activitySummary}</span>}
                {hasActiveRender && !/rendering video/i.test(activitySummary) && (
                  <span className="truncate text-[11px] text-purple-300">· {activeRenderLabel}</span>
                )}
              </div>
              <Button variant="ghost" size="xs" className="h-6 px-2 text-[11px]" onClick={onToggleAgentWork}>
                {showAgentWork ? 'Hide' : 'Show'} work
              </Button>
            </div>
            {showAgentWork && (
              <div className="space-y-2 border-t border-border/60 p-2.5">
                {toolBlocks.map((block, i) => (
                  <ToolResult
                    key={String(block.part.toolCallId) || `tool-${i}`}
                    tool={block.part}
                    defaultExpanded={isLoading}
                    liveRemotionByVideoId={liveRemotionByVideoId}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Streaming indicator for assistant with tools running */}
        {isLoading && !isUser && !hasContent && (
          <div className="rounded-lg border border-border bg-muted px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" />
              <span className="font-mono">thinking...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────

interface EmptyStateProps {
  brandName?: string
  onPromptSelect: (prompt: string) => void
  onRunRepoCrawl: () => void
  onRunCampaign: () => void
  hasConnectedRepo: boolean
  recentChat?: PersistedChat | null
  onContinueChat?: () => void
}

function EmptyState({
  brandName,
  onPromptSelect,
  onRunRepoCrawl,
  onRunCampaign,
  hasConnectedRepo,
  recentChat,
  onContinueChat,
}: EmptyStateProps) {
  const primaryActionLabel = hasConnectedRepo ? 'Crawl connected repo' : 'Run full campaign'
  const primaryAction = hasConnectedRepo ? onRunRepoCrawl : onRunCampaign
  const PrimaryActionIcon = hasConnectedRepo ? Github : Zap
  const quickPrompts = suggestedPrompts.filter((prompt) => prompt.title !== 'Run full campaign').slice(0, 3)

  return (
    <div className="flex h-full flex-col items-center justify-center px-4">
      <div className="mb-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-primary/30 bg-primary/10">
          <Terminal size={24} className="text-primary" />
        </div>
      </div>

      <h1 className="mb-3 text-center text-2xl md:text-3xl">
        <span className="font-mono text-primary">$</span> studio
        {brandName && <span className="ml-2 text-lg font-normal text-muted-foreground">/ {brandName}</span>}
      </h1>
      <p className="mb-6 max-w-md text-center text-sm text-muted-foreground">
        One workspace for repo-aware social content, from post copy to visuals and video concepts.
      </p>

      <Button variant="outline" className="mb-6 h-9" onClick={primaryAction}>
        <PrimaryActionIcon className="h-4 w-4" />
        {primaryActionLabel}
      </Button>

      {recentChat && onContinueChat && (
        <button
          onClick={onContinueChat}
          className="mb-4 max-w-xl truncate rounded-md border border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          title={recentChat.title}
        >
          Continue last chat: {recentChat.title || 'Untitled Chat'}
        </button>
      )}

      <div className="grid w-full max-w-3xl grid-cols-1 gap-2 md:grid-cols-3">
        {quickPrompts.map((prompt) => (
          <button
            key={prompt.title}
            onClick={() => onPromptSelect(prompt.prompt)}
            className="group rounded-lg border border-border bg-card p-3 text-left transition-all hover:border-primary/50 hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded"
                style={{ backgroundColor: `color-mix(in srgb, ${prompt.color} 15%, transparent)` }}
              >
                <prompt.icon size={16} style={{ color: prompt.color }} />
              </div>
              <div className="min-w-0">
                <div className="text-sm transition-colors group-hover:text-primary">{prompt.title}</div>
                <div className="text-xs text-muted-foreground">{prompt.desc}</div>
                {recentChat && (
                  <div className="mt-1 truncate text-[10px] text-muted-foreground/90" title={recentChat.title}>
                    Recent example: {recentChat.title}
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
