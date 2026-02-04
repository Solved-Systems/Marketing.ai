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
} from 'lucide-react'

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

          // Set initial welcome message
          const logoCount = data.metadata?.availableLogos?.length || 0
          setMessages([{
            id: '1',
            role: 'assistant',
            content: `Let's create content for **${data.name}**!\n\n${logoCount > 0 ? `I found **${logoCount} logo(s)** from your brand assets.\n\n` : ''}**How it works:**\n1. Upload logos or reference images\n2. Describe what you want to create\n3. I'll generate a composite image\n4. You can iterate until it's perfect\n5. Then we'll animate and create copy\n\nDrag & drop images or describe what you'd like to create!`,
          }])
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

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setUploadedImages([])
    setIsLoading(true)

    // TODO: Implement actual AI generation
    // For now, simulate a response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I received your request${userMessage.images ? ` with ${userMessage.images.length} image(s)` : ''}. ${userMessage.content ? `You want to "${userMessage.content}".` : ''}\n\nThis is where I would generate content based on your request. The AI generation endpoint needs to be connected.`,
      }])
      setIsLoading(false)
    }, 1500)
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
      className="h-[calc(100vh-1rem)] md:h-[calc(100vh-2rem)] flex flex-col"
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
      <div className="flex-1 flex flex-col min-h-0 p-4 md:px-8">
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="max-w-3xl mx-auto space-y-6 pb-4">
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

                  {/* Generated images */}
                  {msg.generatedImages && msg.generatedImages.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {msg.generatedImages.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <img
                            src={img}
                            alt={`Generated ${idx + 1}`}
                            className="w-full aspect-video object-cover rounded-lg border border-border"
                          />
                          <Button
                            size="sm"
                            variant="secondary"
                            className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
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

            {/* Quick Actions - Show only when no user messages yet */}
            {messages.length === 1 && !isLoading && (
              <div className="flex flex-col items-center py-8">
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
        <div className="max-w-3xl mx-auto w-full pt-4 border-t border-border/50">
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
  )
}
