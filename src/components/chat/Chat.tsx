'use client'

import { useRef, useEffect, useState, useMemo } from 'react'
import { useChat } from '@ai-sdk/react'
import { TextStreamChatTransport } from 'ai'
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MessageContent } from './MessageContent'
import { ToolResult } from './ToolResult'

interface ChatProps {
  brandId?: string
  brandName?: string
}

interface ToolInvocation {
  toolName: string
  toolCallId: string
  state: 'call' | 'partial-call' | 'result'
  args?: Record<string, unknown>
  result?: unknown
}

const suggestedPrompts = [
  {
    icon: Image,
    title: 'Generate images',
    desc: 'Create marketing visuals',
    prompt: 'Create 4 marketing images for a modern SaaS product showing analytics dashboards with a professional aesthetic',
    color: 'hsl(var(--primary))',
  },
  {
    icon: Github,
    title: 'Analyze repo',
    desc: 'Marketing insights',
    prompt: 'Analyze the vercel/next.js repository and suggest marketing angles',
    color: 'hsl(var(--muted-foreground))',
  },
  {
    icon: Video,
    title: 'Create video',
    desc: 'Animated content',
    prompt: 'Generate a short promotional video with smooth motion and professional feel',
    color: 'hsl(142 76% 36%)',
  },
  {
    icon: Zap,
    title: 'Full campaign',
    desc: 'Images + video',
    prompt: 'Create a complete marketing campaign: generate hero images, then animate the best one into a video',
    color: 'hsl(38 92% 50%)',
  },
]

export function Chat({ brandId, brandName }: ChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState('')

  // Create transport with memoization to avoid recreating on every render
  const transport = useMemo(
    () =>
      new TextStreamChatTransport({
        api: '/api/chat',
        body: { brandId },
      }),
    [brandId]
  )

  const { messages, sendMessage, status, error, regenerate, stop } = useChat({
    transport,
    onFinish: () => {
      scrollToBottom()
    },
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      setShowScrollButton(scrollHeight - scrollTop - clientHeight > 100)
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const message = input.trim()
    setInput('')

    await sendMessage({ text: message })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  const handlePromptSelect = (prompt: string) => {
    setInput(prompt)
    inputRef.current?.focus()
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden h-full">
      {/* Messages container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 md:px-8 py-6"
      >
        {isEmpty ? (
          <EmptyState
            brandName={brandName}
            onPromptSelect={handlePromptSelect}
          />
        ) : (
          <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message as any}
                isLatest={index === messages.length - 1}
                isLoading={isLoading && index === messages.length - 1}
              />
            ))}

            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex items-start gap-3 animate-fade-in">
                <span className="text-primary text-sm mt-0.5">▸</span>
                <div className="bg-muted rounded px-4 py-3">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Loader2 size={14} className="animate-spin" />
                    <span>processing</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-28 left-1/2 -translate-x-1/2 p-2 rounded bg-card border border-border shadow-lg hover:bg-muted transition-all"
        >
          <ChevronDown size={18} className="text-muted-foreground" />
        </button>
      )}

      {/* Input area */}
      <div className="border-t border-border bg-background/95 backdrop-blur px-4 md:px-8 py-4">
        <div className="max-w-3xl mx-auto">
          {error && (
            <div className="mb-3 p-3 rounded bg-destructive/20 border border-destructive/30 text-destructive text-sm flex items-center justify-between gap-2">
              <span>error: command failed</span>
              <button
                onClick={() => regenerate()}
                className="flex items-center gap-1 text-xs hover:text-destructive/80 transition-colors"
              >
                <RefreshCw size={12} />
                retry
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="relative">
            <div className="relative rounded-lg bg-muted border border-border overflow-hidden transition-all focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20">
              {/* Terminal prompt prefix */}
              <div className="absolute left-4 top-4 flex items-center pointer-events-none text-sm">
                <span className="text-primary font-mono">$</span>
              </div>

              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="describe what you want to create..."
                rows={1}
                className="w-full bg-transparent text-foreground placeholder:text-muted-foreground pl-10 pr-14 py-4 resize-none focus:outline-none text-sm min-h-[56px] max-h-[200px]"
                style={{
                  height: 'auto',
                  overflow: input.length > 200 ? 'auto' : 'hidden',
                }}
                disabled={isLoading}
              />

              <div className="absolute right-2 bottom-2 flex items-center gap-2">
                {isLoading ? (
                  <Button
                    type="button"
                    onClick={() => stop()}
                    size="icon"
                    variant="destructive"
                    className="h-10 w-10"
                  >
                    <div className="w-3 h-3 rounded-sm bg-white" />
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

            {/* Quick hints */}
            <div className="hidden sm:flex items-center justify-between mt-2 px-1 text-[10px] text-muted-foreground">
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
              </div>
              <span>enter to send</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

interface MessageBubbleProps {
  message: {
    id: string
    role: 'user' | 'assistant' | 'system' | 'data'
    content: string
    toolInvocations?: ToolInvocation[]
  }
  isLatest: boolean
  isLoading: boolean
}

function MessageBubble({ message, isLatest, isLoading }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Prompt indicator */}
      <span className={`text-sm mt-0.5 flex-shrink-0 font-mono ${
        isUser ? 'text-yellow-500' : 'text-primary'
      }`}>
        {isUser ? '$' : '▸'}
      </span>

      {/* Message content */}
      <div className={`flex-1 max-w-[85%] ${isUser ? 'flex flex-col items-end' : ''}`}>
        <div
          className={`group relative rounded-lg px-4 py-3 ${
            isUser
              ? 'bg-primary/20 border border-primary/30'
              : 'bg-muted border border-border'
          }`}
        >
          <MessageContent content={message.content} />

          {/* Tool invocations */}
          {message.toolInvocations && message.toolInvocations.length > 0 && (
            <div className="mt-4 space-y-3">
              {message.toolInvocations.map((tool) => (
                <ToolResult key={tool.toolCallId} tool={tool} />
              ))}
            </div>
          )}

          {/* Copy button (assistant only) */}
          {!isUser && !isLoading && (
            <button
              onClick={handleCopy}
              className="hidden sm:block absolute -right-8 top-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
            >
              {copied ? (
                <Check size={12} className="text-primary" />
              ) : (
                <Copy size={12} className="text-muted-foreground" />
              )}
            </button>
          )}
        </div>

        {/* Timestamp */}
        <span className="text-[10px] text-muted-foreground mt-1 px-1">
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}

interface EmptyStateProps {
  brandName?: string
  onPromptSelect: (prompt: string) => void
}

function EmptyState({ brandName, onPromptSelect }: EmptyStateProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-8">
        <div className="w-16 h-16 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
          <Terminal size={28} className="text-primary" />
        </div>
      </div>

      {/* Title */}
      <h1 className="text-2xl md:text-3xl text-center mb-3">
        <span className="text-primary font-mono">$</span> mrkt
        {brandName && <span className="text-muted-foreground font-normal text-lg ml-2">/ {brandName}</span>}
      </h1>
      <p className="text-muted-foreground text-center max-w-md mb-10">
        AI-powered marketing content generation.
        <br />
        Images, videos, repo analysis.
      </p>

      {/* Suggested prompts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl">
        {suggestedPrompts.map((prompt) => (
          <button
            key={prompt.title}
            onClick={() => onPromptSelect(prompt.prompt)}
            className="group p-3 rounded-lg bg-card border border-border hover:border-primary/50 hover:bg-muted/50 transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `color-mix(in srgb, ${prompt.color} 15%, transparent)` }}
              >
                <prompt.icon size={16} style={{ color: prompt.color }} />
              </div>
              <div className="min-w-0">
                <div className="text-sm group-hover:text-primary transition-colors">
                  {prompt.title}
                </div>
                <div className="text-xs text-muted-foreground">
                  {prompt.desc}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Capabilities */}
      <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl w-full">
        {[
          { icon: Image, name: 'Images', desc: 'Grok & OpenAI', color: 'hsl(var(--primary))' },
          { icon: Zap, name: 'Creative', desc: 'AI generation', color: 'hsl(38 92% 50%)' },
          { icon: Video, name: 'Videos', desc: 'Grok Imagine', color: 'hsl(142 76% 36%)' },
          { icon: Github, name: 'Repos', desc: 'Analysis', color: 'hsl(var(--muted-foreground))' },
        ].map((cap) => (
          <div
            key={cap.name}
            className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-card border border-border text-center"
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
