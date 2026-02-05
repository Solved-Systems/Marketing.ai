'use client'

import { use, useState, useEffect, useRef, useCallback } from 'react'
import {
  Loader2,
  X,
  Trash2,
  Image as ImageIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ImageEditModal } from '@/components/content/ImageEditModal'
import { VideoEditModal } from '@/components/content/VideoEditModal'
import { GitHubActivityPanel } from '@/components/video/GitHubActivityPanel'
import { ChatMessage } from '@/components/video/ChatMessage'
import { ChatInput, type GenerationMode } from '@/components/video/ChatInput'
import { ChatHeader } from '@/components/video/ChatHeader'
import { ChatEmptyState } from '@/components/video/ChatEmptyState'
import { AnimationSettingsModal, type AnimationSettings } from '@/components/video/AnimationSettingsModal'
import type { Brand as GitHubBrand } from '@/types/video-creation'
import { cn } from '@/lib/utils'

// Image size options
const GROK_IMAGE_SIZES = [
  { value: '1024x1024', label: 'Square', aspectRatio: '1:1' },
  { value: '1536x1024', label: 'Landscape', aspectRatio: '3:2' },
  { value: '1024x1536', label: 'Portrait', aspectRatio: '2:3' },
  { value: '1792x1024', label: 'Wide', aspectRatio: '16:9' },
  { value: '1024x1792', label: 'Tall', aspectRatio: '9:16' },
]

const OPENAI_IMAGE_SIZES = [
  { value: '1024x1024', label: 'Square', aspectRatio: '1:1' },
  { value: '1792x1024', label: 'Landscape', aspectRatio: '16:9' },
  { value: '1024x1792', label: 'Portrait', aspectRatio: '9:16' },
]

// Remotion options
const REMOTION_TEMPLATES = [
  { value: 'feature', label: 'Feature Announcement' },
  { value: 'product', label: 'Product Demo' },
  { value: 'social', label: 'Social Teaser' },
  { value: 'release', label: 'Release Notes' },
]

const REMOTION_DURATIONS = [
  { value: '15 seconds', label: '15s' },
  { value: '30 seconds', label: '30s' },
  { value: '60 seconds', label: '60s' },
]

const REMOTION_STYLES = [
  { value: 'Modern', label: 'Modern' },
  { value: 'Minimal', label: 'Minimal' },
  { value: 'Bold', label: 'Bold' },
  { value: 'Playful', label: 'Playful' },
]

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
    aiAnalysis?: { summary?: string }
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
  parentImageUrl?: string
  timestamp?: string
  generationEngine?: string
  imageSize?: string
}

interface Chat {
  id: string
  title: string
  messages: Message[]
  updated_at: string
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

  // Modal states
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingImageUrl, setEditingImageUrl] = useState<string | null>(null)
  const [videoEditModalOpen, setVideoEditModalOpen] = useState(false)
  const [editingVideoUrl, setEditingVideoUrl] = useState<string | null>(null)
  const [editingVideoOriginalImage, setEditingVideoOriginalImage] = useState<string | undefined>()

  // Settings
  const [imageSize, setImageSize] = useState('1024x1024')
  const [animationSettings, setAnimationSettings] = useState<AnimationSettings>({
    duration: 5,
    aspectRatio: '16:9',
    resolution: '720p',
    motionIntensity: 'moderate',
    prompt: '',
  })
  const [showAnimationSettings, setShowAnimationSettings] = useState(false)
  const [animatingMessageId, setAnimatingMessageId] = useState<string | null>(null)
  const [pendingAnimationImage, setPendingAnimationImage] = useState<string | null>(null)

  // Remotion options
  const [remotionTemplate, setRemotionTemplate] = useState('feature')
  const [remotionDuration, setRemotionDuration] = useState('30 seconds')
  const [remotionStyle, setRemotionStyle] = useState('Modern')

  // Chat persistence
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [chats, setChats] = useState<Chat[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // GitHub panel
  const [showGitHubPanel, setShowGitHubPanel] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const currentImageSizes = generationMode === 'openai' ? OPENAI_IMAGE_SIZES : GROK_IMAGE_SIZES

  // Fetch brand
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

  // Fetch chats
  useEffect(() => {
    async function fetchChats() {
      try {
        const response = await fetch(`/api/chats?brandId=${id}`)
        if (response.ok) {
          const data = await response.json()
          setChats(data.chats || [])
        }
      } catch (error) {
        console.error('Failed to fetch chats:', error)
      }
    }
    fetchChats()
  }, [id])

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Auto-save
  useEffect(() => {
    if (messages.length === 0) return

    setHasUnsavedChanges(true)

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveChat()
    }, 2000)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages])

  const saveChat = async () => {
    if (messages.length === 0) return

    setIsSaving(true)
    try {
      const cleanMessages = messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        images: msg.images,
        generatedImages: msg.generatedImages,
        generatedVideo: msg.generatedVideo,
        parentImageUrl: msg.parentImageUrl,
        timestamp: msg.timestamp || new Date().toISOString(),
        generationEngine: msg.generationEngine,
        imageSize: msg.imageSize,
      }))

      const firstUserMsg = messages.find(m => m.role === 'user')
      const title = firstUserMsg?.content?.slice(0, 50) || 'Untitled Chat'

      if (currentChatId) {
        const response = await fetch(`/api/chats/${currentChatId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: cleanMessages, title }),
        })
        if (response.ok) {
          setHasUnsavedChanges(false)
          setChats(prev => prev.map(c =>
            c.id === currentChatId
              ? { ...c, messages: cleanMessages, title, updated_at: new Date().toISOString() }
              : c
          ))
        }
      } else {
        const response = await fetch('/api/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brandId: id, messages: cleanMessages, title }),
        })
        if (response.ok) {
          const data = await response.json()
          setCurrentChatId(data.chat.id)
          setHasUnsavedChanges(false)
          setChats(prev => [data.chat, ...prev])
        }
      }
    } catch (error) {
      console.error('Failed to save chat:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const loadChat = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.chat.messages || [])
        setCurrentChatId(chatId)
        setShowHistory(false)
        setHasUnsavedChanges(false)
      }
    } catch (error) {
      console.error('Failed to load chat:', error)
    }
  }

  const startNewChat = () => {
    setMessages([])
    setCurrentChatId(null)
    setShowHistory(false)
    setHasUnsavedChanges(false)
  }

  const deleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const response = await fetch(`/api/chats/${chatId}`, { method: 'DELETE' })
      if (response.ok) {
        setChats(prev => prev.filter(c => c.id !== chatId))
        if (currentChatId === chatId) {
          startNewChat()
        }
      }
    } catch (error) {
      console.error('Failed to delete chat:', error)
    }
  }

  const saveToContentLibrary = async (
    type: 'image' | 'video',
    url: string,
    options: {
      prompt?: string
      engine?: string
      sourceUrl?: string
      aspectRatio?: string
      duration?: number
    } = {}
  ) => {
    try {
      await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: id,
          type,
          url,
          prompt: options.prompt,
          engine: options.engine,
          sourceUrl: options.sourceUrl,
          aspectRatio: options.aspectRatio,
          duration: options.duration,
          chatId: currentChatId,
        }),
      })
    } catch (error) {
      console.error('Failed to save to content library:', error)
    }
  }

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

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index))
  }

  const addBrandLogo = (url: string) => {
    if (!uploadedImages.includes(url)) {
      setUploadedImages(prev => [...prev, url])
    }
  }

  // Remotion video generation
  const handleRemotionSubmit = async () => {
    if (!brand || isLoading) return

    const templateLabel = REMOTION_TEMPLATES.find(t => t.value === remotionTemplate)?.label || remotionTemplate
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `Create a ${remotionDuration} ${templateLabel} video with ${remotionStyle} style`,
      timestamp: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    const assistantMessageId = (Date.now() + 1).toString()

    setMessages(prev => [...prev, {
      id: assistantMessageId,
      role: 'assistant',
      content: `**Rendering video**\n\n${templateLabel} • ${remotionDuration} • ${remotionStyle}`,
      isAnimating: true,
      timestamp: new Date().toISOString(),
    }])

    try {
      const response = await fetch('/api/videos/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: brand.id,
          title: `${brand.name} - ${templateLabel}`,
          description: brand.description || '',
          template: remotionTemplate,
          duration: remotionDuration,
          style: remotionStyle,
          callToAction: 'Learn More',
          features: brand.tagline || brand.description || 'Professional quality video',
        }),
      })

      const data = await response.json()

      if (!data.success || !data.videoId) {
        throw new Error(data.error || 'Failed to start render')
      }

      const videoId = data.videoId
      let attempts = 0
      const maxAttempts = 150

      const pollInterval = setInterval(async () => {
        attempts++
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval)
          setMessages(prev => prev.map(msg =>
            msg.id === assistantMessageId
              ? { ...msg, isAnimating: false, content: msg.content + '\n\nRender timed out' }
              : msg
          ))
          setIsLoading(false)
          return
        }

        try {
          const statusRes = await fetch(`/api/videos/generate?id=${videoId}`)
          const statusData = await statusRes.json()

          if (statusData.status === 'completed' && statusData.output_url) {
            clearInterval(pollInterval)
            setMessages(prev => prev.map(msg =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    isAnimating: false,
                    content: `**Video ready**\n\n${templateLabel} • ${remotionDuration} • ${remotionStyle}`,
                    generatedVideo: statusData.output_url,
                  }
                : msg
            ))
            saveToContentLibrary('video', statusData.output_url, {
              prompt: `${templateLabel} - ${remotionStyle}`,
              engine: 'remotion',
            })
            setIsLoading(false)
          } else if (statusData.status === 'failed') {
            clearInterval(pollInterval)
            setMessages(prev => prev.map(msg =>
              msg.id === assistantMessageId
                ? { ...msg, isAnimating: false, content: msg.content + `\n\nRender failed: ${statusData.error_message || 'Unknown error'}` }
                : msg
            ))
            setIsLoading(false)
          }
        } catch (pollError) {
          console.error('Poll error:', pollError)
        }
      }, 2000)

    } catch (error) {
      console.error('Remotion error:', error)
      setMessages(prev => prev.map(msg =>
        msg.id === assistantMessageId
          ? { ...msg, isAnimating: false, content: msg.content + `\n\nFailed: ${error instanceof Error ? error.message : 'Unknown error'}` }
          : msg
      ))
      setIsLoading(false)
    }
  }

  // Image generation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (generationMode === 'remotion') {
      handleRemotionSubmit()
      return
    }

    if ((!input.trim() && uploadedImages.length === 0) || isLoading) return

    const sizeLabel = currentImageSizes.find(s => s.value === imageSize)?.label || imageSize
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      images: uploadedImages.length > 0 ? [...uploadedImages] : undefined,
      timestamp: new Date().toISOString(),
    }

    const userPrompt = input.trim()
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setUploadedImages([])
    setIsLoading(true)

    const engineName = generationMode === 'grok-imagine' ? 'Grok' : 'DALL·E'
    const assistantMessageId = (Date.now() + 1).toString()

    setMessages(prev => [...prev, {
      id: assistantMessageId,
      role: 'assistant',
      content: `**Generating with ${engineName}**\n\n${sizeLabel} • "${userPrompt}"`,
      isGenerating: true,
      timestamp: new Date().toISOString(),
      generationEngine: generationMode,
      imageSize: imageSize,
    }])

    try {
      const brandContext = brand ? `Brand: ${brand.name}. ${brand.tagline || ''} ${brand.description || ''}. Colors: ${brand.primary_color}, ${brand.secondary_color}, ${brand.accent_color}.` : ''
      const fullPrompt = `${brandContext}\n\nCreate: ${userPrompt}`

      const endpoint = generationMode === 'grok-imagine'
        ? '/api/images/generate-grok'
        : '/api/images/generate-openai'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: fullPrompt,
          n: 1,
          size: imageSize,
          ...(generationMode === 'grok-imagine'
            ? { response_format: 'url' }
            : { quality: 'standard' }
          ),
        }),
      })

      const data = await response.json()

      if (data.success && data.images?.length > 0) {
        const imageUrls = data.images.map((img: { url: string }) => img.url)
        setMessages(prev => prev.map(msg =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: `**Generated with ${engineName}**\n\n${sizeLabel} • "${userPrompt}"`,
                generatedImages: imageUrls,
                isGenerating: false,
              }
            : msg
        ))
        for (const imageUrl of imageUrls) {
          saveToContentLibrary('image', imageUrl, {
            prompt: userPrompt,
            engine: generationMode,
          })
        }
      } else {
        setMessages(prev => prev.map(msg =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: `**Generation failed**\n\n${data.error || 'Unknown error occurred'}`,
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
              content: `**Generation failed**\n\n${error instanceof Error ? error.message : 'Network error'}`,
              isGenerating: false,
            }
          : msg
      ))
    }

    setIsLoading(false)
  }

  // Animation
  const openAnimationSettings = (messageId: string, imageUrl: string) => {
    setAnimatingMessageId(messageId)
    setPendingAnimationImage(imageUrl)
    setShowAnimationSettings(true)
  }

  const handleAnimate = async () => {
    if (!pendingAnimationImage || !animatingMessageId) return

    setShowAnimationSettings(false)

    setMessages(prev => prev.map(msg =>
      msg.id === animatingMessageId
        ? { ...msg, isAnimating: true }
        : msg
    ))

    try {
      const response = await fetch('/api/videos/animate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: pendingAnimationImage,
          prompt: animationSettings.prompt || 'Animate this image with smooth, cinematic motion.',
          duration: animationSettings.duration,
          aspectRatio: animationSettings.aspectRatio,
          resolution: animationSettings.resolution,
          motionIntensity: animationSettings.motionIntensity,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to start animation')
      }

      const requestId = data.requestId
      let attempts = 0
      const maxAttempts = 60

      const pollInterval = setInterval(async () => {
        attempts++
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval)
          setMessages(prev => prev.map(msg =>
            msg.id === animatingMessageId
              ? { ...msg, isAnimating: false, content: msg.content + '\n\nAnimation timed out' }
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
              msg.id === animatingMessageId
                ? { ...msg, isAnimating: false, generatedVideo: statusData.videoUrl, parentImageUrl: pendingAnimationImage || undefined }
                : msg
            ))
            saveToContentLibrary('video', statusData.videoUrl, {
              prompt: animationSettings.prompt,
              engine: 'grok-imagine',
              sourceUrl: pendingAnimationImage || undefined,
              aspectRatio: animationSettings.aspectRatio,
              duration: animationSettings.duration,
            })
            setPendingAnimationImage(null)
            setAnimatingMessageId(null)
          } else if (statusData.status === 'failed') {
            clearInterval(pollInterval)
            setMessages(prev => prev.map(msg =>
              msg.id === animatingMessageId
                ? { ...msg, isAnimating: false, content: msg.content + `\n\nAnimation failed: ${statusData.error}` }
                : msg
            ))
          }
        } catch (pollError) {
          console.error('Poll error:', pollError)
        }
      }, 5000)

    } catch (error) {
      console.error('Animation error:', error)
      setMessages(prev => prev.map(msg =>
        msg.id === animatingMessageId
          ? { ...msg, isAnimating: false, content: msg.content + `\n\nAnimation failed: ${error instanceof Error ? error.message : 'Unknown error'}` }
          : msg
      ))
    }
  }

  // Edit handlers
  const handleOpenEdit = (imageUrl: string) => {
    setEditingImageUrl(imageUrl)
    setEditModalOpen(true)
  }

  const handleOpenVideoEdit = (videoUrl: string, originalImageUrl?: string) => {
    setEditingVideoUrl(videoUrl)
    setEditingVideoOriginalImage(originalImageUrl)
    setVideoEditModalOpen(true)
  }

  const handleEditComplete = (editedImageUrl: string) => {
    const assistantMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: '**Edited Image**\n\nYour edited image is ready. You can edit it again or animate it.',
      generatedImages: [editedImageUrl],
      parentImageUrl: editingImageUrl || undefined,
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, assistantMessage])
    saveToContentLibrary('image', editedImageUrl, {
      prompt: 'Edited image',
      engine: 'grok-imagine',
      sourceUrl: editingImageUrl || undefined,
    })
    setEditingImageUrl(null)
  }

  const handleVideoEditComplete = (newVideoUrl: string) => {
    const assistantMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: '**Re-animated Video**\n\nYour new video is ready.',
      generatedVideo: newVideoUrl,
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, assistantMessage])
  }

  const handleQuickAction = (action: string) => {
    setInput(action)
  }

  const handleUsePost = (post: { headline: string; body: string; cta: string; hashtags: string[]; imagePrompt?: string }) => {
    const assistantMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `**Post from GitHub Activity**\n\n**${post.headline}**\n\n${post.body}\n\n*${post.cta}*\n\n${post.hashtags.join(' ')}${post.imagePrompt ? `\n\n---\n**Image suggestion:** "${post.imagePrompt}"` : ''}`,
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, assistantMessage])
    setShowGitHubPanel(false)
  }

  const handleGenerateImageFromPost = (prompt: string) => {
    setInput(prompt)
    setShowGitHubPanel(false)
  }

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
      className="h-[calc(100vh-3.5rem)] lg:h-screen flex flex-col overflow-hidden bg-background"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 bg-primary/5 border-2 border-dashed border-primary/50 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <ImageIcon className="h-8 w-8 text-primary" />
            </div>
            <p className="text-lg font-medium text-primary">Drop images here</p>
          </div>
        </div>
      )}

      {/* Animation Settings Modal */}
      <AnimationSettingsModal
        isOpen={showAnimationSettings}
        onClose={() => setShowAnimationSettings(false)}
        onAnimate={handleAnimate}
        settings={animationSettings}
        onSettingsChange={setAnimationSettings}
      />

      {/* Header */}
      <ChatHeader
        brandId={id}
        brand={brand}
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
        showHistory={showHistory}
        onToggleHistory={() => setShowHistory(!showHistory)}
        showGitHubPanel={showGitHubPanel}
        onToggleGitHubPanel={() => setShowGitHubPanel(!showGitHubPanel)}
        onNewChat={startNewChat}
        chatCount={chats.length}
      />

      {/* Main content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* History sidebar */}
        {showHistory && (
          <aside className="w-64 border-r border-border/30 flex flex-col bg-card/20">
            <div className="p-4 border-b border-border/30">
              <p className="text-xs font-mono text-muted-foreground/70 tracking-wider uppercase">
                History
              </p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {chats.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-sm text-muted-foreground/50">No saved chats</p>
                </div>
              ) : (
                <div className="py-2">
                  {chats.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => loadChat(chat.id)}
                      className={cn(
                        'w-full px-4 py-3 text-left hover:bg-muted/30 transition-colors group',
                        currentChatId === chat.id && 'bg-primary/10 border-l-2 border-primary'
                      )}
                    >
                      <p className="text-sm truncate">{chat.title}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-[10px] text-muted-foreground/50 font-mono">
                          {new Date(chat.updated_at).toLocaleDateString()}
                        </p>
                        <button
                          onClick={(e) => deleteChat(chat.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/20 rounded transition-all"
                        >
                          <Trash2 className="h-3 w-3 text-destructive/70" />
                        </button>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>
        )}

        {/* Chat area */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto" ref={scrollRef}>
            <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
              {messages.length === 0 ? (
                <ChatEmptyState
                  onQuickAction={handleQuickAction}
                  availableLogos={availableLogos}
                  uploadedImages={uploadedImages}
                  onAddLogo={addBrandLogo}
                />
              ) : (
                messages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    onEdit={handleOpenEdit}
                    onAnimate={openAnimationSettings}
                    onVideoEdit={handleOpenVideoEdit}
                    imageSizes={currentImageSizes}
                  />
                ))
              )}

              {/* Loading indicator */}
              {isLoading && messages.length > 0 && !messages[messages.length - 1]?.isGenerating && (
                <div className="flex justify-start">
                  <div className="bg-card/80 border border-border/50 rounded-xl px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Input area */}
          <div className="flex-shrink-0 border-t border-border/30 bg-card/30 backdrop-blur-sm">
            <div className="max-w-2xl mx-auto px-4 py-4">
              <ChatInput
                value={input}
                onChange={setInput}
                onSubmit={handleSubmit}
                isLoading={isLoading}
                uploadedImages={uploadedImages}
                onRemoveImage={removeImage}
                onFilesSelected={handleFiles}
                generationMode={generationMode}
                onModeChange={setGenerationMode}
                imageSize={imageSize}
                onImageSizeChange={setImageSize}
                imageSizes={currentImageSizes}
                remotionTemplate={remotionTemplate}
                onRemotionTemplateChange={setRemotionTemplate}
                remotionDuration={remotionDuration}
                onRemotionDurationChange={setRemotionDuration}
                remotionStyle={remotionStyle}
                onRemotionStyleChange={setRemotionStyle}
                remotionTemplates={REMOTION_TEMPLATES}
                remotionDurations={REMOTION_DURATIONS}
                remotionStyles={REMOTION_STYLES}
                hasBrand={!!brand}
              />
            </div>
          </div>
        </main>

        {/* GitHub panel */}
        {showGitHubPanel && brand?.github_repo && (
          <aside className="w-80 border-l border-border/30 flex flex-col bg-card/20">
            <div className="p-4 border-b border-border/30 flex items-center justify-between">
              <p className="text-xs font-mono text-muted-foreground/70 tracking-wider uppercase">
                GitHub Posts
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGitHubPanel(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <GitHubActivityPanel
                brand={brand as GitHubBrand}
                githubRepo={brand.github_repo}
                onGenerateImage={handleGenerateImageFromPost}
                onUsePost={handleUsePost}
              />
            </div>
          </aside>
        )}
      </div>

      {/* Modals */}
      {editingImageUrl && (
        <ImageEditModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false)
            setEditingImageUrl(null)
          }}
          imageUrl={editingImageUrl}
          onEditComplete={handleEditComplete}
        />
      )}

      {editingVideoUrl && (
        <VideoEditModal
          isOpen={videoEditModalOpen}
          onClose={() => {
            setVideoEditModalOpen(false)
            setEditingVideoUrl(null)
            setEditingVideoOriginalImage(undefined)
          }}
          videoUrl={editingVideoUrl}
          originalImageUrl={editingVideoOriginalImage}
          onVideoEdited={handleVideoEditComplete}
        />
      )}
    </div>
  )
}
