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
  PenSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { MessageContent } from './MessageContent'
import { ToolResult } from './ToolResult'

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
  const [showScrollButton, setShowScrollButton] = useState(false)

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
    void sendQuickPrompt('Build a 7-day social campaign plan for this brand with daily post hooks, one image prompt per day, and one motion-video concept at the end of the week.')
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
      onRepoAnalyze={runRepoCrawlAction}
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
          <Button variant="ghost" size="icon-sm" onClick={startNewChat}>
            <Plus className="h-4 w-4" />
          </Button>
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
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{isSavingChat ? 'Saving…' : 'Saved'}</span>
            <Button variant="outline" size="sm" onClick={startNewChat}>
              <PenSquare className="h-3.5 w-3.5" />
              New chat
            </Button>
          </div>
        </div>

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-5 md:px-6 md:py-6">
          {isEmpty ? (
            <EmptyState
              brandName={brandContext?.name || brandName}
              onPromptSelect={handlePromptSelect}
              onRunRepoCrawl={runRepoCrawlAction}
              hasConnectedRepo={Boolean(brandContext?.github_repo || repoReference.trim())}
            />
          ) : (
            <div className="mx-auto max-w-4xl space-y-4 sm:space-y-6">
              {messages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={message as unknown as MessageBubbleProps['message']}
                  isLoading={isStreaming && index === messages.length - 1}
                />
              ))}

              {isStreaming && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex items-start gap-3 animate-fade-in">
                  <span className="mt-0.5 text-sm font-mono text-primary">▸</span>
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
                <span className="text-xs font-mono">error: {error.message || 'command failed'}</span>
                <button
                  onClick={() => regenerate()}
                  className="flex items-center gap-1 text-xs transition-colors hover:text-destructive/80"
                >
                  <RefreshCw size={12} /> retry
                </button>
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

              <div className="mt-2 hidden items-center justify-between px-1 text-[10px] text-muted-foreground sm:flex">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <span className="text-primary">./</span>images
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-green-500">./</span>videos
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-muted-foreground">./</span>repos
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-yellow-500">./</span>posts
                  </span>
                </div>
                <span>enter to send • shift+enter for new line</span>
              </div>
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
  onRepoAnalyze: () => void
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
  onRepoAnalyze,
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
  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="border-b border-border/40 px-4 pb-4 pt-5">
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
          className="mt-4 h-9 w-full justify-start border-border/60 bg-transparent font-medium hover:bg-muted/70"
          onClick={() => {
            onNewChat()
            onCloseMobile()
          }}
        >
          <Plus className="h-4 w-4" />
          New chat
        </Button>
      </div>

      <div className="space-y-3 border-b border-border/40 px-3 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={chatSearch}
            onChange={(e) => onChatSearchChange(e.target.value)}
            placeholder="Search chats"
            className="h-9 border-border/50 bg-muted/30 pl-9 text-sm"
          />
        </div>

        <div className="rounded-md border border-border/50 bg-muted/20 p-2.5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Repo Reference</p>
            {connectedRepo && (
              <span className="truncate text-[10px] text-primary" title={connectedRepo}>
                connected
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={repoReference}
              onChange={(e) => onRepoReferenceChange(e.target.value)}
              placeholder="owner/repo"
              className="h-8 border-border/50 bg-background/70 text-xs"
            />
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-8 w-8 border border-border/50"
              onClick={onRepoAnalyze}
            >
              <FolderCode className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={action.onClick}
              className="flex w-full items-start gap-2.5 rounded-md border border-transparent px-2.5 py-2 text-left transition-all hover:border-border/50 hover:bg-muted/40"
            >
              <action.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{action.title}</p>
                <p className="line-clamp-2 text-[11px] text-muted-foreground">{action.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-1 pt-3">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Your chats</p>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
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
                <button
                  onClick={() => {
                    onLoadChat(chat.id)
                    onCloseMobile()
                  }}
                  className="w-full px-2.5 py-2 text-left"
                >
                  <p className="truncate text-sm">{chat.title || 'Untitled Chat'}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {new Date(chat.updated_at).toLocaleDateString()}
                  </p>
                </button>
                <div className="-mt-7 mr-1 flex justify-end opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      void onDeleteChat(chat.id)
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-border/40 px-4 py-3">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Chat sync</span>
          <span>{isSavingChat ? 'saving...' : 'saved'}</span>
        </div>
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
}

function MessageBubble({ message, isLoading }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false)
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

  const hasContent = renderBlocks.length > 0
  const fullText = renderBlocks
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; content: string }).content)
    .join('\n')

  // Don't render completely empty messages
  if (!hasContent && !isLoading) return null

  const handleCopy = async () => {
    if (!fullText) return
    await navigator.clipboard.writeText(fullText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <span className={`mt-0.5 flex-shrink-0 text-sm font-mono ${isUser ? 'text-yellow-500' : 'text-primary'}`}>
        {isUser ? '$' : '▸'}
      </span>

      <div className={`flex-1 max-w-[90%] ${isUser ? 'flex flex-col items-end' : ''} space-y-3`}>
        {renderBlocks.map((block, i) => {
          if (block.type === 'text') {
            return (
              <div
                key={`text-${i}`}
                className={`group relative rounded-lg px-4 py-3 ${
                  isUser ? 'border border-primary/30 bg-primary/20' : 'border border-border bg-muted'
                }`}
              >
                <MessageContent content={block.content} />

                {!isUser && !isLoading && i === renderBlocks.length - 1 && (
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
            )
          }

          return <ToolResult key={String(block.part.toolCallId) || `tool-${i}`} tool={block.part} />
        })}

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
  hasConnectedRepo: boolean
}

function EmptyState({ brandName, onPromptSelect, onRunRepoCrawl, hasConnectedRepo }: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4">
      <div className="mb-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-primary/30 bg-primary/10">
          <Terminal size={28} className="text-primary" />
        </div>
      </div>

      <h1 className="mb-3 text-center text-2xl md:text-3xl">
        <span className="font-mono text-primary">$</span> studio
        {brandName && <span className="ml-2 text-lg font-normal text-muted-foreground">/ {brandName}</span>}
      </h1>
      <p className="mb-8 max-w-md text-center text-muted-foreground">
        One workspace for repo-aware social content.
        <br />
        Generate post copy, images, and motion-ready video ideas in sequence.
      </p>

      {hasConnectedRepo && (
        <Button variant="outline" className="mb-6" onClick={onRunRepoCrawl}>
          <Github className="h-4 w-4" />
          Crawl Connected Repo
        </Button>
      )}

      <div className="grid w-full max-w-3xl grid-cols-1 gap-2 sm:grid-cols-2">
        {suggestedPrompts.map((prompt) => (
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
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-10 grid w-full max-w-2xl grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { icon: Image, name: 'Images', desc: 'OpenAI + Grok', color: 'hsl(var(--primary))' },
          { icon: Zap, name: 'Creative', desc: 'Prompt chains', color: 'hsl(38 92% 50%)' },
          { icon: Video, name: 'Videos', desc: 'Grok + Remotion', color: 'hsl(142 76% 36%)' },
          { icon: Github, name: 'Repos', desc: 'Code-aware copy', color: 'hsl(var(--muted-foreground))' },
        ].map((cap) => (
          <div
            key={cap.name}
            className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-card p-3 text-center"
          >
            <cap.icon size={18} style={{ color: cap.color }} />
            <span className="text-xs">{cap.name}</span>
            <span className="text-[10px] text-muted-foreground">{cap.desc}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
