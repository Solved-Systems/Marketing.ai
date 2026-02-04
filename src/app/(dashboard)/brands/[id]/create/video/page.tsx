'use client'

import { use, useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ArrowLeft,
  Sparkles,
  Image as ImageIcon,
  Video,
  MessageSquare,
  Send,
  Loader2,
  Paperclip,
  X,
  Github,
  Check,
  Download,
  RefreshCw,
  ExternalLink,
  Wand2,
  Film,
  Play,
  Zap,
} from 'lucide-react'

type GenerationMode = 'grok-imagine' | 'openai'

interface Brand {
  id: string
  name: string
  tagline: string | null
  description: string | null
  logo_url: string | null
  primary_color: string
  secondary_color: string
  accent_color: string
  github_repo: string | null
  metadata?: {
    availableLogos?: { path: string; downloadUrl: string }[]
    detectedFonts?: string[]
    aiAnalysis?: {
      summary?: string
    }
  }
}

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  images?: string[]
  generatedImages?: string[]
  generatedVideo?: string
  isGenerating?: boolean
  isAnimating?: boolean
  animationRequestId?: string
}

export default function CreateContentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [brand, setBrand] = useState<Brand | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [generationMode, setGenerationMode] = useState<GenerationMode>('grok-imagine')
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch brand data
  useEffect(() => {
    async function fetchBrand() {
      try {
        const response = await fetch(`/api/brands/${id}`)
        if (response.ok) {
          const data = await response.json()
          setBrand(data)
        }
      } catch (error) {
        console.error('Failed to fetch brand:', error)
      }
    }
    fetchBrand()
  }, [id])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Handle file upload
  const handleFiles = useCallback((files: FileList | File[]) => {
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          setUploadedImages(prev => [...prev, e.target?.result as string])
        }
        reader.readAsDataURL(file)
      }
    })
  }, [])

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files)
    }
  }, [handleFiles])

  // Remove uploaded image
  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index))
  }

  // Add brand logo to uploads
  const addBrandLogo = (url: string) => {
    if (!uploadedImages.includes(url)) {
      setUploadedImages(prev => [...prev, url])
    }
  }

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!input.trim() && uploadedImages.length === 0) || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      images: uploadedImages.length > 0 ? [...uploadedImages] : undefined,
    }

    const userPrompt = input.trim()
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setUploadedImages([])
    setIsLoading(true)

    const engineName = generationMode === 'grok-imagine' ? 'Grok Imagine' : 'OpenAI'
    const assistantMessageId = (Date.now() + 1).toString()

    // Add generating message with loading state
    setMessages(prev => [...prev, {
      id: assistantMessageId,
      role: 'assistant',
      content: `🎨 **Generating with ${engineName}...**\n\n"${userPrompt}"`,
      isGenerating: true,
    }])

    try {
      // Build the prompt with brand context
      const brandContext = brand ? `Brand: ${brand.name}. ${brand.tagline || ''} ${brand.description || ''}. Colors: ${brand.primary_color}, ${brand.secondary_color}, ${brand.accent_color}.` : ''
      const fullPrompt = `${brandContext}\n\nCreate: ${userPrompt}`

      // Choose API endpoint based on engine
      const endpoint = generationMode === 'grok-imagine'
        ? '/api/images/generate-grok'
        : '/api/images/generate-openai'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: fullPrompt,
          n: 1,
          ...(generationMode === 'grok-imagine'
            ? { response_format: 'url' }
            : { model: 'gpt-image-1', size: '1024x1024' }
          ),
        }),
      })

      const data = await response.json()

      if (data.success && data.images?.length > 0) {
        // Update message with generated image
        setMessages(prev => prev.map(msg =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: `✨ **Generated with ${engineName}**\n\n"${userPrompt}"`,
                generatedImages: data.images.map((img: { url: string }) => img.url),
                isGenerating: false,
              }
            : msg
        ))
      } else {
        // Error state
        setMessages(prev => prev.map(msg =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: `❌ **Generation failed**\n\n${data.error || 'Unknown error occurred'}`,
                isGenerating: false,
              }
            : msg
        ))
      }
    } catch (error) {
      console.error('Generation error:', error)
      setMessages(prev => prev.map(msg =>
        msg.id === assistantMessageId
          ? {
              ...msg,
              content: `❌ **Generation failed**\n\n${error instanceof Error ? error.message : 'Network error'}`,
              isGenerating: false,
            }
          : msg
      ))
    }

    setIsLoading(false)
  }

  // Handle animating an image to video
  const handleAnimate = async (messageId: string, imageUrl: string) => {
    // Update message to show animating state
    setMessages(prev => prev.map(msg =>
      msg.id === messageId
        ? { ...msg, isAnimating: true }
        : msg
    ))

    try {
      // Start animation
      const response = await fetch('/api/videos/animate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          prompt: 'Animate this image with smooth, cinematic motion. Add subtle movement and life to the scene.',
          duration: 5,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to start animation')
      }

      // Poll for completion
      const requestId = data.requestId
      let attempts = 0
      const maxAttempts = 60 // 5 minutes max

      const pollInterval = setInterval(async () => {
        attempts++
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval)
          setMessages(prev => prev.map(msg =>
            msg.id === messageId
              ? { ...msg, isAnimating: false, content: msg.content + '\n\n❌ Animation timed out' }
              : msg
          ))
          return
        }

        try {
          const statusRes = await fetch(`/api/videos/animate?requestId=${requestId}`)
          const statusData = await statusRes.json()

          if (statusData.videoUrl) {
            clearInterval(pollInterval)
            setMessages(prev => prev.map(msg =>
              msg.id === messageId
                ? { ...msg, isAnimating: false, generatedVideo: statusData.videoUrl }
                : msg
            ))
          } else if (statusData.status === 'failed') {
            clearInterval(pollInterval)
            setMessages(prev => prev.map(msg =>
              msg.id === messageId
                ? { ...msg, isAnimating: false, content: msg.content + `\n\n❌ Animation failed: ${statusData.error}` }
                : msg
            ))
          }
        } catch (pollError) {
          console.error('Poll error:', pollError)
        }
      }, 5000) // Poll every 5 seconds

    } catch (error) {
      console.error('Animation error:', error)
      setMessages(prev => prev.map(msg =>
        msg.id === messageId
          ? { ...msg, isAnimating: false, content: msg.content + `\n\n❌ Animation failed: ${error instanceof Error ? error.message : 'Unknown error'}` }
          : msg
      ))
    }
  }

  // Quick action handlers
  const handleQuickAction = (action: string) => {
    setInput(action)
  }

  // Convert GitHub URLs to proxy
  const getProxyUrl = (url: string, path: string) => {
    if (url.startsWith('/api/github/file')) return url
    if (url.startsWith('data:')) return url
    if (brand?.github_repo && (url.includes('raw.githubusercontent.com') || url.includes('github.com'))) {
      return `/api/github/file?repo=${encodeURIComponent(brand.github_repo)}&path=${encodeURIComponent(path)}`
    }
    return url
  }

  const availableLogos = (brand?.metadata?.availableLogos || []).map(logo => ({
    ...logo,
    downloadUrl: getProxyUrl(logo.downloadUrl, logo.path)
  }))

  return (
    <div
      className="h-[calc(100vh-3.5rem)] lg:h-screen flex flex-col"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 bg-primary/10 border-2 border-dashed border-primary z-50 flex items-center justify-center">
          <div className="text-center">
            <ImageIcon className="h-16 w-16 text-primary mx-auto mb-4" />
            <p className="text-xl font-semibold text-primary">Drop images here</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-4 md:px-8 md:pt-6 flex-shrink-0 border-b border-border/50">
        <Link
          href={`/brands/${id}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Brand
        </Link>

        {/* Repo Badge */}
        {brand?.github_repo && (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full border border-border/50">
              <Github className="h-4 w-4 text-primary" />
              <span className="font-mono text-sm text-primary">{brand.github_repo}</span>
              <Check className="h-4 w-4 text-green-500" />
            </div>
            <a
              href={`https://github.com/${brand.github_repo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        )}

        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-primary" />
          Create Content
          {brand && (
            <span className="text-muted-foreground font-normal text-base">
              for {brand.name}
            </span>
          )}
        </h1>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden mx-4 md:mx-8 my-4 border border-border/50 rounded-lg bg-card/30">
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="max-w-3xl mx-auto space-y-6 p-4">
            {messages.map((msg) => (
              <div key={msg.id} className={msg.role === 'user' ? 'flex justify-end' : ''}>
                <div
                  className={`${
                    msg.role === 'user'
                      ? 'bg-primary/20 ml-12 max-w-[80%]'
                      : 'bg-muted/50 mr-12'
                  } p-4 rounded-lg`}
                >
                  {/* User images */}
                  {msg.images && msg.images.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {msg.images.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt={`Uploaded ${idx + 1}`}
                          className="w-16 h-16 object-contain rounded border border-border bg-white/10"
                        />
                      ))}
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

                  {/* Generation loading skeleton */}
                  {msg.isGenerating && (
                    <div className="mt-4">
                      <div className="relative aspect-square max-w-md rounded-lg border border-border overflow-hidden bg-gradient-to-br from-primary/5 to-primary/10">
                        {/* Animated gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-shimmer" />
                        {/* Scan line effect */}
                        <div className="absolute inset-0 overflow-hidden">
                          <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-scan" />
                        </div>
                        {/* Center content */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                          <div className="relative">
                            <Wand2 className="h-8 w-8 text-primary animate-pulse" />
                            <div className="absolute inset-0 h-8 w-8 bg-primary/20 rounded-full animate-ping" />
                          </div>
                          <p className="text-xs text-muted-foreground font-mono">generating...</p>
                        </div>
                        {/* Corner accents */}
                        <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-primary/30" />
                        <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-primary/30" />
                        <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-primary/30" />
                        <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-primary/30" />
                      </div>
                    </div>
                  )}

                  {/* Generated images */}
                  {msg.generatedImages && msg.generatedImages.length > 0 && !msg.generatedVideo && (
                    <div className="mt-4 grid grid-cols-1 gap-2">
                      {msg.generatedImages.map((img, idx) => (
                        <div key={idx} className="relative group">
                          {msg.isAnimating ? (
                            <div className="relative">
                              <img
                                src={img}
                                alt={`Generated ${idx + 1}`}
                                className="w-full max-w-md rounded-lg border border-border opacity-50"
                              />
                              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 max-w-md">
                                <div className="relative">
                                  <Film className="h-8 w-8 text-primary animate-pulse" />
                                  <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                                </div>
                                <p className="text-xs text-primary font-mono">animating to video...</p>
                              </div>
                            </div>
                          ) : (
                            <>
                              <img
                                src={img}
                                alt={`Generated ${idx + 1}`}
                                className="w-full max-w-md rounded-lg border border-border animate-fade-in"
                                style={{ animationDelay: `${idx * 150}ms` }}
                              />
                              <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleAnimate(msg.id, img)}
                                  className="gap-1"
                                >
                                  <Play className="h-4 w-4" />
                                  Animate
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => {
                                    const link = document.createElement('a')
                                    link.href = img
                                    link.download = `generated-${Date.now()}.png`
                                    link.click()
                                  }}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Generated video */}
                  {msg.generatedVideo && (
                    <div className="mt-4">
                      <video
                        src={msg.generatedVideo}
                        controls
                        autoPlay
                        muted
                        loop
                        className="w-full rounded-lg"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="bg-muted/50 p-4 rounded-lg mr-12">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            )}

            {/* Quick Actions - Show when no messages */}
            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full py-8">
                <p className="text-sm text-muted-foreground mb-4">Quick start:</p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleQuickAction('Create a promotional image for social media')}
                    className="gap-2"
                  >
                    <ImageIcon className="h-4 w-4 text-primary" />
                    Create Image
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleQuickAction('Write a social media post announcing a new feature')}
                    className="gap-2"
                  >
                    <MessageSquare className="h-4 w-4 text-primary" />
                    Create Post
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleQuickAction('Create an animated video ad for the product')}
                    className="gap-2"
                  >
                    <Video className="h-4 w-4 text-primary" />
                    Create Video
                  </Button>
                </div>

                {/* Brand Logos */}
                {availableLogos.length > 0 && (
                  <div className="mt-8 w-full max-w-md">
                    <p className="text-xs text-muted-foreground font-mono mb-2 text-center">
                      brand_assets ({availableLogos.length})
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {availableLogos.slice(0, 8).map((logo) => (
                        <button
                          key={logo.path}
                          onClick={() => addBrandLogo(logo.downloadUrl)}
                          className={`p-1 rounded border-2 transition-colors ${
                            uploadedImages.includes(logo.downloadUrl)
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/50'
                          }`}
                          title={`Add ${logo.path}`}
                        >
                          <img
                            src={logo.downloadUrl}
                            alt={logo.path}
                            className="w-10 h-10 object-contain bg-white/10 rounded"
                          />
                        </button>
                      ))}
                      {availableLogos.length > 8 && (
                        <div className="w-12 h-12 rounded border-2 border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">
                          +{availableLogos.length - 8}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="flex-shrink-0 p-4 border-t border-border/50">
          <div className="max-w-3xl mx-auto w-full">
          {/* Generation Mode Toggle */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-xs text-muted-foreground font-mono mr-2">engine:</span>
            <button
              type="button"
              onClick={() => setGenerationMode('grok-imagine')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                generationMode === 'grok-imagine'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Wand2 className="h-3.5 w-3.5" />
              Grok Imagine
            </button>
            <button
              type="button"
              onClick={() => setGenerationMode('openai')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                generationMode === 'openai'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Zap className="h-3.5 w-3.5" />
              OpenAI
            </button>
          </div>

          {/* Uploaded Images Preview */}
          {uploadedImages.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {uploadedImages.map((img, idx) => (
                <div key={idx} className="relative group">
                  <img
                    src={img}
                    alt={`Upload ${idx + 1}`}
                    className="w-14 h-14 object-contain rounded border border-border bg-white/10"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0"
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe what you want to create..."
              disabled={isLoading}
              className="flex-1 font-mono"
            />
            <Button
              type="submit"
              variant="terminal"
              size="icon"
              disabled={isLoading || (!input.trim() && uploadedImages.length === 0)}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-2">
            Drag & drop images anywhere
          </p>
          </div>
        </div>
      </div>
    </div>
  )
}
