'use client'

import { useState, useRef, useEffect, useCallback, DragEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'
import {
  Send,
  Loader2,
  Upload,
  Image as ImageIcon,
  Play,
  X,
  Paperclip,
} from 'lucide-react'
import type {
  VideoCreationState,
  ChatMessage,
  Brand,
  LogoAnalysis,
  MarketingCopy,
  VideoModel,
} from '@/types/video-creation'
import { VIDEO_MODELS } from '@/types/video-creation'
import { useCredits } from '@/hooks/use-credits'
import { getVideoGenerationType, getCreditCost } from '@/lib/billing/models'
import type { ModelQuality } from '@/lib/billing/models'

interface ChatVideoCreatorProps {
  brandId: string
  brand: Brand | null
  state: VideoCreationState
  onStateChange: (state: VideoCreationState | ((prev: VideoCreationState) => VideoCreationState)) => void
}

export function ChatVideoCreator({
  brandId,
  brand,
  state,
  onStateChange,
}: ChatVideoCreatorProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [pendingImages, setPendingImages] = useState<string[]>([]) // Images to send with next message
  const [isDragOver, setIsDragOver] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [availableLogos, setAvailableLogos] = useState<{ path: string; downloadUrl: string }[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const { remaining: credits, canAfford, refetch: refreshCredits } = useCredits()

  // Helper to add messages
  const addMessage = useCallback((msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMsg: ChatMessage = {
      ...msg,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, newMsg])
    return newMsg.id
  }, [])

  // Initialize with welcome message - wait for brand to load
  useEffect(() => {
    if (initialized || !brand) return
    setInitialized(true)

    const hasLogo = brand.logo_url
    const hasColors = brand.primary_color && brand.secondary_color

    // Load available logos from metadata if present
    const metadataLogos = brand.metadata?.availableLogos || []
    if (metadataLogos.length > 0) {
      setAvailableLogos(metadataLogos)
    }

    if (hasLogo && hasColors) {
      // Brand has logo and colors - skip logo phase and use them
      const logoAnalysis: LogoAnalysis = {
        colors: {
          primary: brand.primary_color!,
          secondary: brand.secondary_color!,
          accent: brand.accent_color || brand.primary_color!,
          dominant: [brand.primary_color!, brand.secondary_color!, brand.accent_color || brand.primary_color!],
        },
        style: brand.metadata?.aiAnalysis?.sources?.colors || 'Brand colors from repository',
        composition: 'Pre-configured brand identity',
        suggestions: ['Use brand colors for consistency'],
      }

      // Update state with existing brand assets
      onStateChange((prev: VideoCreationState) => ({
        ...prev,
        logoUrl: brand.logo_url,
        logoAnalysis,
        phase: 'background',
      }))

      const logoCount = metadataLogos.length
      const logoNote = logoCount > 1 ? `\n\nYou have **${logoCount} logos** available - you can select a different one from the preview panel.` : ''

      addMessage({
        role: 'assistant',
        content: `Let's create a video for **${brand.name}**!\n\nI found your brand logo and colors. Let me generate some background options.${logoNote}`,
        action: 'suggest_background',
      })

      // Auto-generate backgrounds with brand colors
      setTimeout(() => generateBackgrounds(logoAnalysis), 500)
    } else if (hasLogo) {
      // Has logo but no colors - analyze it
      const logoCount = metadataLogos.length
      const logoNote = logoCount > 1 ? `\n\nI found **${logoCount} logos** in your brand - you can select a different one from the preview panel.` : ''

      addMessage({
        role: 'assistant',
        content: `Let's create a video for **${brand.name}**!\n\nI found your brand logo. Would you like me to analyze it for colors, or upload a different one?${logoNote}`,
        action: 'use_brand_logo',
      })
    } else {
      // No logo - ask for upload
      addMessage({
        role: 'assistant',
        content: `Let's create a video for **${brand.name}**!\n\nFirst, upload a logo to get started. I'll analyze it to suggest colors and style.\n\nYou can drag & drop an image here or click the button below.`,
        action: 'upload_logo',
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand, initialized])

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Poll for video status
  useEffect(() => {
    if (state.videoStatus !== 'generating' || !state.videoId) return

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/videos/generate-grok?id=${state.videoId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.status === 'completed' && data.output_url) {
            onStateChange((prev: VideoCreationState) => ({
              ...prev,
              videoUrl: data.output_url,
              videoStatus: 'complete',
            }))
            clearInterval(pollInterval)
            handleGenerateCopy(data.output_url)
          } else if (data.status === 'failed') {
            onStateChange((prev: VideoCreationState) => ({
              ...prev,
              videoStatus: 'failed',
              videoError: data.error_message || 'Video generation failed',
            }))
            clearInterval(pollInterval)
            addMessage({
              role: 'assistant',
              content: `Video generation failed: ${data.error_message || 'Unknown error'}. Would you like to try again?`,
            })
          }
        }
      } catch (error) {
        console.error('Poll error:', error)
      }
    }, 3000)

    return () => clearInterval(pollInterval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.videoStatus, state.videoId])

  // Drag and drop handlers
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    if (files.length > 0) {
      await handleFilesSelected(files)
    }
  }

  // Handle files selected (from input or drag/drop)
  const handleFilesSelected = async (files: File[]) => {
    const newImages: string[] = []

    for (const file of files) {
      // Create preview immediately
      const reader = new FileReader()
      const dataUrl = await new Promise<string>((resolve) => {
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.readAsDataURL(file)
      })
      newImages.push(dataUrl)
    }

    setPendingImages(prev => [...prev, ...newImages])
  }

  // Remove a pending image
  const removePendingImage = (index: number) => {
    setPendingImages(prev => prev.filter((_, i) => i !== index))
  }

  // Upload image to server and get URL
  const uploadImage = async (dataUrl: string): Promise<string> => {
    // Convert data URL to blob
    const response = await fetch(dataUrl)
    const blob = await response.blob()
    const file = new File([blob], 'image.png', { type: blob.type })

    const formData = new FormData()
    formData.append('file', file)

    const uploadResponse = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })

    const data = await uploadResponse.json()
    if (!uploadResponse.ok) throw new Error(data.error || 'Upload failed')
    return data.url
  }

  // Handle logo upload (single image for logo phase)
  const handleLogoUpload = async (file: File) => {
    setIsUploading(true)
    addMessage({ role: 'user', content: `Uploading ${file.name}...` })

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Upload failed')

      onStateChange((prev: VideoCreationState) => ({ ...prev, logoUrl: data.url }))
      addMessage({
        role: 'assistant',
        content: 'Logo uploaded! Analyzing colors and style...',
        action: 'analyzing_logo',
      })

      await analyzeLogo(data.url)
    } catch (error) {
      addMessage({
        role: 'assistant',
        content: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
      })
    } finally {
      setIsUploading(false)
    }
  }

  // Handle using existing brand logo
  const handleUseBrandLogo = async () => {
    if (!brand?.logo_url) return

    addMessage({ role: 'user', content: 'Use brand logo' })
    onStateChange((prev: VideoCreationState) => ({ ...prev, logoUrl: brand.logo_url }))

    // If we have brand colors, skip analysis
    if (brand.primary_color && brand.secondary_color) {
      const logoAnalysis: LogoAnalysis = {
        colors: {
          primary: brand.primary_color,
          secondary: brand.secondary_color,
          accent: brand.accent_color || brand.primary_color,
          dominant: [brand.primary_color, brand.secondary_color, brand.accent_color || brand.primary_color],
        },
        style: 'Brand colors from repository',
        composition: 'Pre-configured brand identity',
        suggestions: ['Use brand colors for consistency'],
      }

      onStateChange((prev: VideoCreationState) => ({
        ...prev,
        logoUrl: brand.logo_url,
        logoAnalysis,
        phase: 'background',
      }))

      addMessage({
        role: 'assistant',
        content: `Using your brand logo and colors!\n\n**Colors:** ${brand.primary_color}, ${brand.secondary_color}${brand.accent_color ? `, ${brand.accent_color}` : ''}\n\nGenerating background options...`,
        action: 'suggest_background',
      })

      await generateBackgrounds(logoAnalysis)
    } else {
      addMessage({
        role: 'assistant',
        content: 'Using your brand logo! Analyzing colors and style...',
        action: 'analyzing_logo',
      })

      await analyzeLogo(brand.logo_url)
    }
  }

  // Analyze logo with AI
  const analyzeLogo = async (logoUrl: string) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: 'Analyze this logo image for a video marketing project.',
              images: [logoUrl],
            },
          ],
          system: `You are a brand analyst. Analyze the logo image provided and extract:
1. Dominant colors (provide hex codes)
2. Visual style (modern, classic, playful, minimal, bold, etc.)
3. Composition notes (shapes, typography style, etc.)
4. Suggestions for video background themes

Respond with ONLY a JSON block:
\`\`\`json
{
  "colors": {
    "primary": "#hex",
    "secondary": "#hex",
    "accent": "#hex",
    "dominant": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"]
  },
  "style": "description of visual style",
  "composition": "brief composition notes",
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]
}
\`\`\``,
        }),
      })

      const data = await response.json()
      const content = data.content || ''

      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]) as LogoAnalysis
        onStateChange((prev: VideoCreationState) => ({
          ...prev,
          logoUrl,
          logoAnalysis: parsed,
          phase: 'background',
        }))

        setMessages(prev => prev.filter(m => m.action !== 'analyzing_logo'))
        addMessage({
          role: 'assistant',
          content: `I've analyzed your logo:\n\n**Style:** ${parsed.style}\n**Colors:** ${parsed.colors.dominant.slice(0, 3).join(', ')}\n\nNow let's create a background. I'll generate some options based on your brand.`,
          action: 'suggest_background',
        })

        await generateBackgrounds(parsed)
      } else {
        throw new Error('Could not parse analysis')
      }
    } catch (error) {
      console.error('Logo analysis error:', error)
      setMessages(prev => prev.filter(m => m.action !== 'analyzing_logo'))
      addMessage({
        role: 'assistant',
        content: `I had trouble analyzing the logo. Let me generate some background options anyway.`,
      })
      await generateBackgrounds(null)
    } finally {
      setIsLoading(false)
    }
  }

  // Generate background images
  const generateBackgrounds = async (analysis: LogoAnalysis | null) => {
    setIsLoading(true)
    addMessage({
      role: 'assistant',
      content: 'Generating background options...',
      action: 'generating_backgrounds',
    })

    try {
      const colors = analysis?.colors || {
        primary: brand?.primary_color || '#6366f1',
        secondary: brand?.secondary_color || '#1a1a1a',
        accent: brand?.accent_color || '#22c55e',
        dominant: [brand?.primary_color || '#6366f1'],
      }
      const style = analysis?.style || 'modern and professional'

      const promptResponse = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Generate background image prompt' }],
          system: `You are creating a prompt for AI image generation for a marketing video background.

Brand: ${brand?.name || 'Brand'}
Description: ${brand?.description || 'A professional brand'}
Colors: ${JSON.stringify(colors)}
Style: ${style}

Generate a detailed, professional image prompt for a video background that:
1. Uses abstract or subtle patterns that won't distract from the main content
2. Incorporates the brand colors naturally
3. Feels ${style}
4. Works well as a looping video background

Return ONLY the prompt text, no JSON or formatting. Keep it under 200 characters.`,
        }),
      })

      const promptData = await promptResponse.json()
      const backgroundPrompt = promptData.content?.trim() || 'Abstract gradient background with subtle geometric patterns'

      onStateChange((prev: VideoCreationState) => ({ ...prev, backgroundPrompt }))

      const imageResponse = await fetch('/api/images/generate-grok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: backgroundPrompt,
          n: 4,
        }),
      })

      const imageData = await imageResponse.json()
      if (!imageResponse.ok) throw new Error(imageData.error || 'Image generation failed')

      const backgroundImages = imageData.images?.map((img: { url: string }) => img.url) || []

      setMessages(prev => prev.filter(m => m.action !== 'generating_backgrounds'))
      onStateChange((prev: VideoCreationState) => ({
        ...prev,
        backgroundImages,
        phase: 'background',
      }))

      addMessage({
        role: 'assistant',
        content: `I've generated ${backgroundImages.length} background options. Select one in the preview panel, or describe what you'd like instead.`,
        action: 'select_background',
      })
    } catch (error) {
      console.error('Background generation error:', error)
      setMessages(prev => prev.filter(m => m.action !== 'generating_backgrounds'))
      addMessage({
        role: 'assistant',
        content: `Background generation failed: ${error instanceof Error ? error.message : 'Unknown error'}. You can describe what kind of background you want, and I'll try again.`,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Respond to background selection from preview panel
  useEffect(() => {
    if (state.phase === 'video' && state.selectedBackground && !messages.some(m => m.action === 'configure_video')) {
      addMessage({ role: 'user', content: 'Selected background' })
      addMessage({
        role: 'assistant',
        content: `Great choice! Now let's configure your video settings.\n\n**Duration:** ${state.videoSettings.duration} seconds\n**Aspect Ratio:** ${state.videoSettings.aspectRatio}\n**Resolution:** ${state.videoSettings.resolution}\n\nYou can adjust these settings or click "Generate Video" when ready.`,
        action: 'configure_video',
      })
    }
  }, [state.phase, state.selectedBackground, state.videoSettings, addMessage, messages])

  // Handle video generation
  const handleGenerateVideo = async () => {
    if (!state.selectedBackground) {
      addMessage({
        role: 'assistant',
        content: 'Please select a background image first.',
      })
      return
    }

    const quality: ModelQuality = 'default'
    const generationType = getVideoGenerationType(quality)

    if (!canAfford(generationType)) {
      addMessage({
        role: 'assistant',
        content: 'Insufficient credits. Please upgrade your plan to generate videos.',
      })
      return
    }

    setIsLoading(true)
    addMessage({ role: 'user', content: 'Generate video' })
    addMessage({
      role: 'assistant',
      content: 'Generating your video with Grok Imagine AI...',
      action: 'generating_video',
    })

    onStateChange((prev: VideoCreationState) => ({ ...prev, videoStatus: 'generating' }))

    try {
      const promptResponse = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Generate video prompt' }],
          system: `Create a cinematic video generation prompt for a marketing video.

Brand: ${brand?.name || 'Brand'}
Description: ${brand?.description || 'A professional brand'}
Logo Style: ${state.logoAnalysis?.style || 'modern'}
Background: Selected custom background image

Generate a prompt that creates smooth, subtle motion for the background image. The video should:
1. Have gentle, looping motion (zoom, pan, particle effects)
2. Feel professional and on-brand
3. Work well with logo overlay
4. Last ${state.videoSettings.duration} seconds

Return ONLY the prompt text, no formatting. Keep it under 200 characters.`,
        }),
      })

      const promptData = await promptResponse.json()
      const videoPrompt = promptData.content?.trim() || 'Smooth camera pan with subtle particle effects and gentle lighting changes'

      const response = await fetch('/api/videos/generate-grok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId,
          prompt: videoPrompt,
          template: 'social',
          duration: state.videoSettings.duration,
          aspectRatio: state.videoSettings.aspectRatio,
          resolution: state.videoSettings.resolution,
          imageUrl: state.selectedBackground,
          quality,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Video generation failed')

      onStateChange((prev: VideoCreationState) => ({
        ...prev,
        videoId: data.videoId,
        videoPrompt,
        videoStatus: 'generating',
      }))
      refreshCredits()

      setMessages(prev => prev.filter(m => m.action !== 'generating_video'))
      addMessage({
        role: 'assistant',
        content: 'Video generation started! This typically takes 1-3 minutes. I\'ll notify you when it\'s ready.',
        action: 'generating_video',
      })
    } catch (error) {
      console.error('Video generation error:', error)
      setMessages(prev => prev.filter(m => m.action !== 'generating_video'))
      onStateChange((prev: VideoCreationState) => ({ ...prev, videoStatus: 'failed', videoError: String(error) }))
      addMessage({
        role: 'assistant',
        content: `Video generation failed: ${error instanceof Error ? error.message : 'Unknown error'}. Would you like to try again?`,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Generate marketing copy
  const handleGenerateCopy = async (videoUrl?: string) => {
    setIsLoading(true)
    addMessage({
      role: 'assistant',
      content: 'Video is ready! Now generating marketing copy...',
      action: 'generating_copy',
    })

    onStateChange((prev: VideoCreationState) => ({ ...prev, phase: 'copy' }))

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Generate marketing copy for this video' }],
          system: `You are a marketing copywriter. Generate social media copy for a brand video.

Brand: ${brand?.name || 'Brand'}
Description: ${brand?.description || 'A professional brand'}
Tagline: ${brand?.tagline || ''}

Generate compelling marketing copy that:
1. Has a catchy headline (max 60 chars)
2. Has engaging body copy (2-3 sentences)
3. Has a clear call to action
4. Has 5 relevant hashtags

Respond with ONLY a JSON block:
\`\`\`json
{
  "headline": "Catchy headline here",
  "body": "Engaging body copy that captures attention and drives action.",
  "cta": "Learn More",
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"]
}
\`\`\``,
        }),
      })

      const data = await response.json()
      const content = data.content || ''

      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]) as MarketingCopy

        setMessages(prev => prev.filter(m => m.action !== 'generating_copy'))
        onStateChange((prev: VideoCreationState) => ({
          ...prev,
          marketingCopy: parsed,
          videoUrl: videoUrl || prev.videoUrl,
          phase: 'complete',
        }))

        addMessage({
          role: 'assistant',
          content: `Your marketing copy is ready!\n\n**${parsed.headline}**\n\n${parsed.body}\n\n*${parsed.cta}*\n\n${parsed.hashtags.join(' ')}\n\nYou can edit any of these in the preview panel, or ask me to regenerate.`,
          action: 'complete',
        })
      } else {
        throw new Error('Could not parse copy')
      }
    } catch (error) {
      console.error('Copy generation error:', error)
      setMessages(prev => prev.filter(m => m.action !== 'generating_copy'))
      addMessage({
        role: 'assistant',
        content: 'Copy generation had an issue. You can ask me to try again or write your own.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle user input submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!input.trim() && pendingImages.length === 0) || isLoading) return

    const userMessage = input.trim()
    const userImages = [...pendingImages]
    setInput('')
    setPendingImages([])

    // Add user message with images
    addMessage({
      role: 'user',
      content: userMessage || (userImages.length > 0 ? `Attached ${userImages.length} image(s)` : ''),
      images: userImages.length > 0 ? userImages : undefined,
    })

    // If in logo phase and images attached, treat as logo upload
    if (state.phase === 'logo' && userImages.length > 0) {
      setIsUploading(true)
      try {
        const uploadedUrl = await uploadImage(userImages[0])
        onStateChange((prev: VideoCreationState) => ({ ...prev, logoUrl: uploadedUrl }))
        addMessage({
          role: 'assistant',
          content: 'Logo received! Analyzing colors and style...',
          action: 'analyzing_logo',
        })
        await analyzeLogo(uploadedUrl)
      } catch (error) {
        addMessage({
          role: 'assistant',
          content: `Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`,
        })
      } finally {
        setIsUploading(false)
      }
      return
    }

    // Simple command parsing
    const lowerInput = userMessage.toLowerCase()

    if (state.phase === 'background' && (lowerInput.includes('regenerate') || lowerInput.includes('different'))) {
      await generateBackgrounds(state.logoAnalysis)
      return
    }

    if (state.phase === 'video' && (lowerInput.includes('generate') || lowerInput.includes('create video'))) {
      await handleGenerateVideo()
      return
    }

    if (state.phase === 'copy' && (lowerInput.includes('regenerate') || lowerInput.includes('new copy'))) {
      await handleGenerateCopy()
      return
    }

    // General AI chat with images if provided
    setIsLoading(true)
    try {
      const messagePayload = userImages.length > 0
        ? { role: 'user' as const, content: userMessage, images: userImages }
        : { role: 'user' as const, content: userMessage }

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages
            .filter(m => m.role !== 'system')
            .slice(-10)
            .map(m => ({
              role: m.role,
              content: m.content,
              ...(m.images && { images: m.images }),
            }))
            .concat([messagePayload]),
          system: `You are helping create a video for ${brand?.name || 'a brand'}. Current phase: ${state.phase}.

Keep responses brief and helpful. If they want to change settings or regenerate content, confirm and explain what will happen.`,
        }),
      })

      const data = await response.json()
      addMessage({ role: 'assistant', content: data.content || 'How can I help?' })
    } catch {
      addMessage({
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Update video settings
  const updateSettings = (key: string, value: number | string) => {
    onStateChange((prev: VideoCreationState) => ({
      ...prev,
      videoSettings: { ...prev.videoSettings, [key]: value },
    }))
  }

  // Update video model
  const updateModel = (model: VideoModel) => {
    onStateChange((prev: VideoCreationState) => ({
      ...prev,
      videoModel: model,
    }))
  }

  const creditCost = getCreditCost(getVideoGenerationType('default'))

  return (
    <div
      ref={dropZoneRef}
      className={`flex flex-col h-full relative ${isDragOver ? 'ring-2 ring-primary ring-inset' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-primary/10 z-10 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <Upload className="h-12 w-12 text-primary mx-auto mb-2" />
            <p className="text-sm font-medium">Drop images here</p>
          </div>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((msg) => (
            <div key={msg.id}>
              <div
                className={`text-sm p-3 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-primary/20 ml-8'
                    : 'bg-muted mr-8'
                }`}
              >
                {/* Image attachments */}
                {msg.images && msg.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {msg.images.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`Attachment ${idx + 1}`}
                        className="w-20 h-20 object-cover rounded border border-border"
                      />
                    ))}
                  </div>
                )}
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>

              {/* Action Buttons */}
              {msg.action === 'upload_logo' && messages.length <= 2 && (
                <div className="flex flex-wrap gap-2 mt-3 mr-8">
                  <Button
                    variant="terminal"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    Upload Logo
                  </Button>
                </div>
              )}

              {msg.action === 'use_brand_logo' && !state.logoUrl && (
                <div className="flex flex-wrap gap-2 mt-3 mr-8">
                  <Button
                    variant="terminal"
                    size="sm"
                    onClick={handleUseBrandLogo}
                  >
                    <ImageIcon className="h-4 w-4" />
                    Use Brand Logo
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Upload className="h-4 w-4" />
                    Upload Different
                  </Button>
                </div>
              )}

              {msg.action === 'configure_video' && state.phase === 'video' && (
                <div className="mt-3 mr-8 space-y-4 p-3 bg-card/50 rounded-lg terminal-border">
                  {/* Video Model */}
                  <div className="space-y-2">
                    <Label className="text-xs font-mono">model</Label>
                    <div className="grid grid-cols-2 gap-1">
                      {VIDEO_MODELS.map((model) => (
                        <button
                          key={model.value}
                          type="button"
                          onClick={() => updateModel(model.value)}
                          className={`p-2 text-xs rounded terminal-border transition-all text-left ${
                            state.videoModel === model.value
                              ? 'bg-primary/20 border-primary'
                              : 'bg-card/30 hover:bg-card/50'
                          }`}
                        >
                          <span className="font-medium">{model.label}</span>
                          <span className="block text-[10px] text-muted-foreground">{model.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="space-y-2">
                    <Label className="text-xs font-mono">duration: {state.videoSettings.duration}s</Label>
                    <input
                      type="range"
                      min={1}
                      max={15}
                      value={state.videoSettings.duration}
                      onChange={(e) => updateSettings('duration', parseInt(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>

                  {/* Aspect Ratio */}
                  <div className="space-y-2">
                    <Label className="text-xs font-mono">aspect_ratio</Label>
                    <div className="grid grid-cols-3 gap-1">
                      {(['16:9', '9:16', '1:1'] as const).map((ar) => (
                        <button
                          key={ar}
                          type="button"
                          onClick={() => updateSettings('aspectRatio', ar)}
                          className={`p-2 text-xs rounded terminal-border transition-all ${
                            state.videoSettings.aspectRatio === ar
                              ? 'bg-primary/20 border-primary'
                              : 'bg-card/30 hover:bg-card/50'
                          }`}
                        >
                          {ar}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Generate Button */}
                  <Button
                    variant="terminal"
                    className="w-full"
                    onClick={handleGenerateVideo}
                    disabled={isLoading || state.videoStatus === 'generating'}
                  >
                    {isLoading || state.videoStatus === 'generating' ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Generate Video ({creditCost} credits)
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Loading indicator */}
              {(msg.action === 'analyzing_logo' ||
                msg.action === 'generating_backgrounds' ||
                msg.action === 'generating_video' ||
                msg.action === 'generating_copy') && (
                <div className="flex items-center gap-2 mt-2 mr-8 text-sm text-primary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              )}
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.action === undefined && (
            <div className="bg-muted text-sm p-3 rounded-lg mr-8">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Pending Images Preview */}
      {pendingImages.length > 0 && (
        <div className="px-3 py-2 border-t border-border/50 bg-muted/30">
          <div className="flex gap-2 flex-wrap">
            {pendingImages.map((img, idx) => (
              <div key={idx} className="relative group">
                <img
                  src={img}
                  alt={`Pending ${idx + 1}`}
                  className="w-16 h-16 object-cover rounded border border-border"
                />
                <button
                  type="button"
                  onClick={() => removePendingImage(idx)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input with terminal cursor */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-border/50">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex-shrink-0"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              pendingImages.length > 0
                ? 'Add a message or send images...'
                : state.phase === 'logo'
                  ? 'Drop an image or describe your brand...'
                  : state.phase === 'background'
                    ? 'Describe the background you want...'
                    : state.phase === 'video'
                      ? 'Ask about video settings...'
                      : 'Ask me anything...'
            }
            disabled={isLoading}
            className="font-mono text-sm terminal-cursor"
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || (!input.trim() && pendingImages.length === 0)}
            variant="terminal"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {credits !== null && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Credits: {credits} • Drag & drop images anywhere
          </p>
        )}
      </form>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
        multiple
        onChange={(e) => {
          const files = Array.from(e.target.files || [])
          if (files.length > 0) {
            if (state.phase === 'logo' && files.length === 1) {
              handleLogoUpload(files[0])
            } else {
              handleFilesSelected(files)
            }
          }
          e.target.value = '' // Reset for re-selection
        }}
      />
    </div>
  )
}
