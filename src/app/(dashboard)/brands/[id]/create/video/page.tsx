'use client'

import { use, useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  ExternalLink,
  Wand2,
  Film,
  Play,
  Zap,
  Pencil,
  Plus,
  History,
  Trash2,
  Save,
  Clapperboard,
  Settings2,
  Ratio,
  Clock,
  Gauge,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  GitPullRequest,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ImageEditModal } from '@/components/content/ImageEditModal'
import { VideoEditModal } from '@/components/content/VideoEditModal'
import { GitHubActivityPanel } from '@/components/video/GitHubActivityPanel'

type GenerationMode = 'grok-imagine' | 'openai' | 'remotion'

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

// Animation settings
const ANIMATION_DURATIONS = [
  { value: 3, label: '3s' },
  { value: 5, label: '5s' },
  { value: 8, label: '8s' },
  { value: 10, label: '10s' },
  { value: 15, label: '15s' },
]

const ANIMATION_ASPECT_RATIOS = [
  { value: '16:9', label: 'Widescreen' },
  { value: '9:16', label: 'Vertical' },
  { value: '1:1', label: 'Square' },
  { value: '4:3', label: 'Standard' },
]

const ANIMATION_RESOLUTIONS = [
  { value: '720p', label: 'HD (720p)' },
  { value: '480p', label: 'SD (480p)' },
]

const MOTION_INTENSITIES = [
  { value: 'subtle', label: 'Subtle', description: 'Minimal movement' },
  { value: 'moderate', label: 'Moderate', description: 'Natural motion' },
  { value: 'dynamic', label: 'Dynamic', description: 'Cinematic' },
]

// Remotion template options
const REMOTION_TEMPLATES = [
  { value: 'feature', label: 'Feature Announcement', description: 'Highlight new features' },
  { value: 'product', label: 'Product Demo', description: 'Showcase your product' },
  { value: 'social', label: 'Social Teaser', description: 'Square format for social' },
  { value: 'release', label: 'Release Notes', description: 'Changelog style' },
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

// Animation settings interface
interface AnimationSettings {
  duration: number
  aspectRatio: string
  resolution: string
  motionIntensity: string
  prompt: string
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
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingImageUrl, setEditingImageUrl] = useState<string | null>(null)

  // Video edit modal state
  const [videoEditModalOpen, setVideoEditModalOpen] = useState(false)
  const [editingVideoUrl, setEditingVideoUrl] = useState<string | null>(null)
  const [editingVideoOriginalImage, setEditingVideoOriginalImage] = useState<string | undefined>()

  // Image generation settings
  const [imageSize, setImageSize] = useState('1024x1024')
  const [showImageSettings, setShowImageSettings] = useState(false)

  // Animation settings
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

  // Remotion video options
  const [remotionTemplate, setRemotionTemplate] = useState('feature')
  const [remotionDuration, setRemotionDuration] = useState('30 seconds')
  const [remotionStyle, setRemotionStyle] = useState('Modern')

  // Chat persistence state
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [chats, setChats] = useState<Chat[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // GitHub activity panel
  const [showGitHubPanel, setShowGitHubPanel] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Get current image sizes based on mode
  const currentImageSizes = generationMode === 'openai' ? OPENAI_IMAGE_SIZES : GROK_IMAGE_SIZES

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

  // Fetch chat history
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

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Auto-save chat when messages change (debounced)
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
  }, [messages])

  // Save chat to database
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

  // Load a chat
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

  // Start a new chat
  const startNewChat = () => {
    setMessages([])
    setCurrentChatId(null)
    setShowHistory(false)
    setHasUnsavedChanges(false)
  }

  // Delete a chat
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

  // Handle Remotion video generation
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
      content: `🎬 **Rendering with Remotion...**\n\nTemplate: ${templateLabel}\nDuration: ${remotionDuration}\nStyle: ${remotionStyle}`,
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
              ? { ...msg, isAnimating: false, content: msg.content + '\n\n❌ Render timed out' }
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
                    content: `✨ **Rendered with Remotion**\n\nTemplate: ${templateLabel}\nDuration: ${remotionDuration}\nStyle: ${remotionStyle}`,
                    generatedVideo: statusData.output_url,
                  }
                : msg
            ))
            setIsLoading(false)
          } else if (statusData.status === 'failed') {
            clearInterval(pollInterval)
            setMessages(prev => prev.map(msg =>
              msg.id === assistantMessageId
                ? { ...msg, isAnimating: false, content: msg.content + `\n\n❌ Render failed: ${statusData.error_message || 'Unknown error'}` }
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
          ? { ...msg, isAnimating: false, content: msg.content + `\n\n❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}` }
          : msg
      ))
      setIsLoading(false)
    }
  }

  // Handle submit (for image generation modes)
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

    const engineName = generationMode === 'grok-imagine' ? 'Grok Imagine' : 'OpenAI DALL-E'
    const assistantMessageId = (Date.now() + 1).toString()

    setMessages(prev => [...prev, {
      id: assistantMessageId,
      role: 'assistant',
      content: `🎨 **Generating with ${engineName}...**\n\nSize: ${sizeLabel}\n"${userPrompt}"`,
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
        setMessages(prev => prev.map(msg =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: `✨ **Generated with ${engineName}**\n\nSize: ${sizeLabel}\n"${userPrompt}"`,
                generatedImages: data.images.map((img: { url: string }) => img.url),
                isGenerating: false,
              }
            : msg
        ))
      } else {
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

  // Open animation settings panel for an image
  const openAnimationSettings = (messageId: string, imageUrl: string) => {
    setAnimatingMessageId(messageId)
    setPendingAnimationImage(imageUrl)
    setShowAnimationSettings(true)
  }

  // Handle animating an image to video with settings
  const handleAnimate = async () => {
    if (!pendingAnimationImage || !animatingMessageId) return

    setShowAnimationSettings(false)

    // Update message to show animating state
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
          prompt: animationSettings.prompt || 'Animate this image with smooth, cinematic motion. Add subtle movement and life to the scene.',
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
              msg.id === animatingMessageId
                ? { ...msg, isAnimating: false, generatedVideo: statusData.videoUrl, parentImageUrl: pendingAnimationImage || undefined }
                : msg
            ))
            setPendingAnimationImage(null)
            setAnimatingMessageId(null)
          } else if (statusData.status === 'failed') {
            clearInterval(pollInterval)
            setMessages(prev => prev.map(msg =>
              msg.id === animatingMessageId
                ? { ...msg, isAnimating: false, content: msg.content + `\n\n❌ Animation failed: ${statusData.error}` }
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
          ? { ...msg, isAnimating: false, content: msg.content + `\n\n❌ Animation failed: ${error instanceof Error ? error.message : 'Unknown error'}` }
          : msg
      ))
    }
  }

  // Handle opening edit modal
  const handleOpenEdit = (imageUrl: string) => {
    setEditingImageUrl(imageUrl)
    setEditModalOpen(true)
  }

  // Handle opening video edit modal
  const handleOpenVideoEdit = (videoUrl: string, originalImageUrl?: string) => {
    setEditingVideoUrl(videoUrl)
    setEditingVideoOriginalImage(originalImageUrl)
    setVideoEditModalOpen(true)
  }

  // Handle edit completion - add edited image as new message
  const handleEditComplete = (editedImageUrl: string) => {
    const assistantMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: '✏️ **Edited Image**\n\nHere\'s your edited image. You can edit it again or animate it to create a video.',
      generatedImages: [editedImageUrl],
      parentImageUrl: editingImageUrl || undefined,
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, assistantMessage])
    setEditingImageUrl(null)
  }

  // Handle video edit completion
  const handleVideoEditComplete = (newVideoUrl: string) => {
    const assistantMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: '🎬 **Re-animated Video**\n\nHere\'s your new video. You can edit it again or download it.',
      generatedVideo: newVideoUrl,
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, assistantMessage])
  }

  // Quick action handlers
  const handleQuickAction = (action: string) => {
    setInput(action)
  }

  // Handle using a generated post from GitHub activity
  const handleUsePost = (post: { headline: string; body: string; cta: string; hashtags: string[]; imagePrompt?: string }) => {
    const fullPost = `${post.headline}\n\n${post.body}\n\n${post.cta}\n\n${post.hashtags.join(' ')}`

    // Add the post as an assistant message
    const assistantMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `📝 **Generated Post from GitHub Activity**\n\n**${post.headline}**\n\n${post.body}\n\n*${post.cta}*\n\n${post.hashtags.join(' ')}${post.imagePrompt ? `\n\n---\n💡 **Image suggestion:** "${post.imagePrompt}"` : ''}`,
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, assistantMessage])
    setShowGitHubPanel(false)
  }

  // Handle generating an image from post suggestion
  const handleGenerateImageFromPost = (prompt: string) => {
    setInput(prompt)
    setShowGitHubPanel(false)
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
      className="h-[calc(100vh-3.5rem)] lg:h-screen flex flex-col overflow-hidden"
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

      {/* Animation Settings Panel */}
      {showAnimationSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Film className="h-5 w-5 text-primary" />
                Animation Settings
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowAnimationSettings(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-mono text-muted-foreground">motion_prompt (optional)</label>
                <Input
                  value={animationSettings.prompt}
                  onChange={(e) => setAnimationSettings(prev => ({ ...prev, prompt: e.target.value }))}
                  placeholder="Describe the motion you want..."
                  className="font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> duration
                  </label>
                  <Select value={String(animationSettings.duration)} onValueChange={(v) => setAnimationSettings(prev => ({ ...prev, duration: parseInt(v) }))}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ANIMATION_DURATIONS.map(d => (
                        <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                    <Ratio className="h-3 w-3" /> aspect_ratio
                  </label>
                  <Select value={animationSettings.aspectRatio} onValueChange={(v) => setAnimationSettings(prev => ({ ...prev, aspectRatio: v }))}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ANIMATION_ASPECT_RATIOS.map(ar => (
                        <SelectItem key={ar.value} value={ar.value}>{ar.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-muted-foreground">resolution</label>
                  <Select value={animationSettings.resolution} onValueChange={(v) => setAnimationSettings(prev => ({ ...prev, resolution: v }))}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ANIMATION_RESOLUTIONS.map(r => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                    <Gauge className="h-3 w-3" /> motion
                  </label>
                  <Select value={animationSettings.motionIntensity} onValueChange={(v) => setAnimationSettings(prev => ({ ...prev, motionIntensity: v }))}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MOTION_INTENSITIES.map(m => (
                        <SelectItem key={m.value} value={m.value}>
                          <span>{m.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowAnimationSettings(false)} className="flex-1">
                Cancel
              </Button>
              <Button variant="terminal" onClick={handleAnimate} className="flex-1">
                <Wand2 className="h-4 w-4 mr-2" />
                Animate
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-4 md:px-8 md:pt-6 flex-shrink-0 border-b border-border/50">
        <div className="flex items-center justify-between mb-3">
          <Link
            href={`/brands/${id}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Brand
          </Link>

          {/* Chat controls */}
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <span className="text-xs text-muted-foreground">
                {isSaving ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Saving...
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Save className="h-3 w-3" />
                    Unsaved
                  </span>
                )}
              </span>
            )}
            {brand?.github_repo && (
              <Button
                variant={showGitHubPanel ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setShowGitHubPanel(!showGitHubPanel)}
                className="gap-1"
              >
                <GitPullRequest className="h-4 w-4" />
                Posts
                {showGitHubPanel ? (
                  <PanelRightClose className="h-3.5 w-3.5" />
                ) : (
                  <PanelRightOpen className="h-3.5 w-3.5" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="gap-1"
            >
              <History className="h-4 w-4" />
              History
              {chats.length > 0 && (
                <span className="text-xs bg-muted px-1.5 rounded">{chats.length}</span>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={startNewChat}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              New
            </Button>
          </div>
        </div>

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

      {/* Main content area with optional sidebar */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Chat history sidebar */}
        {showHistory && (
          <div className="w-64 border-r border-border/50 flex flex-col bg-card/30">
            <div className="p-3 border-b border-border/50">
              <p className="text-xs font-mono text-muted-foreground">chat_history</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {chats.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No saved chats yet
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {chats.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => loadChat(chat.id)}
                      className={`w-full p-3 text-left hover:bg-muted/50 transition-colors group ${
                        currentChatId === chat.id ? 'bg-primary/10' : ''
                      }`}
                    >
                      <p className="text-sm truncate">{chat.title}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-muted-foreground">
                          {new Date(chat.updated_at).toLocaleDateString()}
                        </p>
                        <button
                          onClick={(e) => deleteChat(chat.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/20 rounded transition-all"
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </button>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col min-h-0 overflow-hidden mt-4 border border-border/50 rounded-t-lg bg-card/30 ${showGitHubPanel ? 'ml-4 md:ml-8' : 'mx-4 md:mx-8'}`}>
          <div className="flex-1 overflow-y-auto" ref={scrollRef}>
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
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-shimmer" />
                          <div className="absolute inset-0 overflow-hidden">
                            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-scan" />
                          </div>
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                            <div className="relative">
                              <Wand2 className="h-8 w-8 text-primary animate-pulse" />
                              <div className="absolute inset-0 h-8 w-8 bg-primary/20 rounded-full animate-ping" />
                            </div>
                            <p className="text-xs text-muted-foreground font-mono">generating...</p>
                          </div>
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
                                    variant="outline"
                                    onClick={() => handleOpenEdit(img)}
                                    className="gap-1 bg-background/80 backdrop-blur-sm"
                                  >
                                    <Pencil className="h-4 w-4" />
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => openAnimationSettings(msg.id, img)}
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
                                {/* Show generation engine badge */}
                                {msg.generationEngine && (
                                  <div className="absolute top-2 left-2 px-2 py-1 bg-background/80 backdrop-blur-sm rounded text-xs font-mono">
                                    {msg.generationEngine === 'grok-imagine' ? 'Grok' : 'DALL-E'}
                                    {msg.imageSize && ` • ${currentImageSizes.find(s => s.value === msg.imageSize)?.aspectRatio || msg.imageSize}`}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Generated video */}
                    {msg.generatedVideo && (
                      <div className="mt-4 relative group">
                        <video
                          src={msg.generatedVideo}
                          controls
                          autoPlay
                          muted
                          loop
                          className="w-full max-w-md rounded-lg"
                        />
                        <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenVideoEdit(msg.generatedVideo!, msg.parentImageUrl)}
                            className="gap-1 bg-background/80 backdrop-blur-sm"
                          >
                            <Settings2 className="h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              const link = document.createElement('a')
                              link.href = msg.generatedVideo!
                              link.download = `video-${Date.now()}.mp4`
                              link.click()
                            }}
                            className="bg-background/80 backdrop-blur-sm"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
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

                  {/* Workflow hint */}
                  <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg max-w-lg">
                    <p className="text-sm text-center">
                      <span className="font-semibold text-primary">Workflow tip:</span> Generate an image with any engine, then click <span className="font-mono bg-muted px-1 rounded">Animate</span> to turn it into a video with Grok Imagine.
                    </p>
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
          </div>
        </div>

        {/* GitHub Activity Panel - Right sidebar */}
        {showGitHubPanel && brand?.github_repo && (
          <div className="w-80 flex-shrink-0 mr-4 md:mr-8 mt-4 border border-border/50 rounded-lg bg-card/30 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-border/50 flex items-center justify-between">
              <p className="text-xs font-mono text-muted-foreground">github_posts</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGitHubPanel(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <GitHubActivityPanel
                brand={brand as any}
                githubRepo={brand.github_repo}
                onGenerateImage={handleGenerateImageFromPost}
                onUsePost={handleUsePost}
              />
            </div>
          </div>
        )}
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className={`flex-shrink-0 mb-4 p-4 border border-t-0 border-border/50 rounded-b-lg bg-card/50 ${showGitHubPanel ? 'ml-4 md:ml-8 mr-[21rem] md:mr-[22rem]' : 'mx-4 md:mx-8'}`}>
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
              Grok
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
              DALL-E
            </button>
            <button
              type="button"
              onClick={() => setGenerationMode('remotion')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                generationMode === 'remotion'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Clapperboard className="h-3.5 w-3.5" />
              Remotion
            </button>
          </div>

          {/* Image Settings (for Grok & OpenAI) */}
          {generationMode !== 'remotion' && (
            <div className="mb-3">
              <button
                type="button"
                onClick={() => setShowImageSettings(!showImageSettings)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
              >
                <Settings2 className="h-3.5 w-3.5" />
                Image Settings
                {showImageSettings ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              {showImageSettings && (
                <div className="mt-2 p-3 bg-muted/30 rounded-lg border border-border/50">
                  <div className="flex items-center gap-3 justify-center">
                    <label className="text-xs font-mono text-muted-foreground">size:</label>
                    <div className="flex gap-1">
                      {currentImageSizes.map(s => (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => setImageSize(s.value)}
                          className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
                            imageSize === s.value
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          {s.aspectRatio}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Remotion Template Selection */}
          {generationMode === 'remotion' && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              <Select value={remotionTemplate} onValueChange={setRemotionTemplate}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Template" />
                </SelectTrigger>
                <SelectContent>
                  {REMOTION_TEMPLATES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={remotionDuration} onValueChange={setRemotionDuration}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Duration" />
                </SelectTrigger>
                <SelectContent>
                  {REMOTION_DURATIONS.map(d => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={remotionStyle} onValueChange={setRemotionStyle}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Style" />
                </SelectTrigger>
                <SelectContent>
                  {REMOTION_STYLES.map(s => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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

          {generationMode === 'remotion' ? (
            /* Remotion Generate Button */
            <Button
              onClick={handleRemotionSubmit}
              variant="terminal"
              className="w-full gap-2"
              disabled={isLoading || !brand}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Rendering...
                </>
              ) : (
                <>
                  <Clapperboard className="h-5 w-5" />
                  Generate Video
                </>
              )}
            </Button>
          ) : (
            /* Image Generation Input */
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
          )}

          <p className="text-xs text-muted-foreground text-center mt-2">
            {generationMode === 'remotion'
              ? 'Renders a branded video using AWS Lambda'
              : `Generate images with ${generationMode === 'grok-imagine' ? 'Grok' : 'DALL-E'} • Click Animate to create videos with Grok`
            }
          </p>
        </div>
      </div>

      {/* Image Edit Modal */}
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

      {/* Video Edit Modal */}
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
