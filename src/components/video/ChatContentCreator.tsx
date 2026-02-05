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
  RefreshCw,
  Check,
  Sparkles,
  Download,
} from 'lucide-react'
import type {
  ContentCreationState,
  ChatMessage,
  Brand,
  MarketingCopy,
  VideoModel,
} from '@/types/video-creation'
import { VIDEO_MODELS, DEFAULT_STYLE_PROMPT } from '@/types/video-creation'
import { useCredits } from '@/hooks/use-credits'
import { getVideoGenerationType, getCreditCost } from '@/lib/billing/models'
import type { ModelQuality } from '@/lib/billing/models'
import { InlineProgress } from '@/components/ui/generation-progress'

interface ChatContentCreatorProps {
  brandId: string
  brand: Brand | null
  state: ContentCreationState
  onStateChange: (state: ContentCreationState | ((prev: ContentCreationState) => ContentCreationState)) => void
}

export function ChatContentCreator({
  brandId,
  brand,
  state,
  onStateChange,
}: ChatContentCreatorProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [pendingImages, setPendingImages] = useState<string[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
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

  // Download image or video
  const handleDownload = useCallback(async (url: string, type: 'image' | 'video' = 'image') => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const extension = type === 'video' ? 'mp4' : 'png'
      const filename = `${brand?.name || 'content'}-${Date.now()}.${extension}`

      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }, [brand?.name])

  // Initialize with welcome message
  useEffect(() => {
    if (initialized || !brand) return
    setInitialized(true)

    // Load brand logos as available images
    const metadataLogos = brand.metadata?.availableLogos || []
    if (metadataLogos.length > 0) {
      onStateChange(prev => ({
        ...prev,
        uploadedImages: metadataLogos.map(l => l.downloadUrl),
        stylePrompt: brand.metadata?.stylePrompt || DEFAULT_STYLE_PROMPT,
      }))
    }

    addMessage({
      role: 'assistant',
      content: `Let's create content for **${brand.name}**!\n\n${metadataLogos.length > 0 ? `I found **${metadataLogos.length} logo(s)** from your brand assets.\n\n` : ''}**How it works:**\n1. Upload logos or reference images\n2. Describe what you want to create\n3. I'll generate a composite image\n4. You can iterate until it's perfect\n5. Then we'll animate and create copy\n\nDrag & drop images or describe what you'd like to create!`,
      action: 'upload_images',
    })
  }, [brand, initialized, addMessage, onStateChange])

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Poll for video status with progress tracking
  useEffect(() => {
    if (state.videoStatus !== 'generating' || !state.videoId) return

    const startTime = state.videoStartTime || Date.now()

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/videos/generate-grok?id=${state.videoId}`)
        if (response.ok) {
          const data = await response.json()

          // Update progress
          if (data.render_progress !== undefined) {
            onStateChange(prev => ({ ...prev, videoProgress: data.render_progress }))
          } else {
            // Estimate progress based on elapsed time
            const elapsed = (Date.now() - startTime) / 1000
            const estimatedProgress = Math.min(95, Math.round((elapsed / 80) * 100))
            onStateChange(prev => ({ ...prev, videoProgress: estimatedProgress }))
          }

          if (data.status === 'completed' && data.output_url) {
            onStateChange(prev => ({
              ...prev,
              videoUrl: data.output_url,
              videoStatus: 'complete',
              videoProgress: 100,
              phase: 'copy',
            }))
            clearInterval(pollInterval)
            handleGenerateCopy(data.output_url)
          } else if (data.status === 'failed') {
            onStateChange(prev => ({
              ...prev,
              videoStatus: 'failed',
              videoError: data.error_message || 'Animation failed',
            }))
            clearInterval(pollInterval)
            addMessage({
              role: 'assistant',
              content: `Animation failed: ${data.error_message || 'Unknown error'}. Would you like to try again?`,
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

  // Handle files selected
  const handleFilesSelected = async (files: File[]) => {
    const newImages: string[] = []

    for (const file of files) {
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

  // Upload image to server
  const uploadImage = async (dataUrl: string): Promise<string> => {
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

  // Generate composite image
  const generateCompositeImage = async (prompt: string, referenceImages: string[]) => {
    setIsLoading(true)
    addMessage({
      role: 'assistant',
      content: 'Generating your composite image...',
      action: 'generating_composite',
    })

    try {
      // Upload any pending images first
      const uploadedUrls: string[] = [...state.uploadedImages]
      for (const img of referenceImages) {
        if (img.startsWith('data:')) {
          const url = await uploadImage(img)
          uploadedUrls.push(url)
        } else {
          uploadedUrls.push(img)
        }
      }

      // Build the full prompt with style and reference images
      const stylePrompt = state.stylePrompt || brand?.metadata?.stylePrompt || DEFAULT_STYLE_PROMPT
      const fullPrompt = `${prompt}\n\n**Reference logos/images to include:**\n${uploadedUrls.map((url, i) => `- Image ${i + 1}: ${url}`).join('\n')}\n\n**Style Guidelines:**\n${stylePrompt}\n\n**Important:** Composite the provided logos/images INTO the generated scene. The logos should be clearly visible and integrated into the design.`

      // Generate image
      const imageResponse = await fetch('/api/images/generate-grok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: fullPrompt,
          n: 3, // Generate 3 options
          referenceImages: uploadedUrls,
        }),
      })

      const imageData = await imageResponse.json()
      if (!imageResponse.ok) throw new Error(imageData.error || 'Image generation failed')

      const generatedImages = imageData.images?.map((img: { url: string }) => img.url) || []

      // Update state
      setMessages(prev => prev.filter(m => m.action !== 'generating_composite'))
      onStateChange(prev => ({
        ...prev,
        uploadedImages: uploadedUrls,
        userPrompt: prompt,
        generatedImages,
        imageHistory: [...prev.imageHistory, { prompt, images: generatedImages }],
        phase: 'iterate',
      }))

      addMessage({
        role: 'assistant',
        content: `I've generated ${generatedImages.length} options. Click one to select it, or tell me what changes you'd like!\n\nYou can say things like:\n- "Keep the logos in frame"\n- "Make the background darker"\n- "Move the logo to the center"`,
        action: 'composite_ready',
        images: generatedImages,
      })

    } catch (error) {
      console.error('Image generation error:', error)
      setMessages(prev => prev.filter(m => m.action !== 'generating_composite'))
      addMessage({
        role: 'assistant',
        content: `Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Regenerate with feedback
  const regenerateWithFeedback = async (feedback: string) => {
    if (!state.userPrompt) return

    setIsLoading(true)
    addMessage({
      role: 'assistant',
      content: 'Regenerating with your feedback...',
      action: 'generating_composite',
    })

    try {
      const stylePrompt = state.stylePrompt || DEFAULT_STYLE_PROMPT
      const fullPrompt = `${state.userPrompt}\n\n**User Feedback:** ${feedback}\n\n**Reference logos/images to include:**\n${state.uploadedImages.map((url, i) => `- Image ${i + 1}: ${url}`).join('\n')}\n\n**Style Guidelines:**\n${stylePrompt}\n\n**Important:** Apply the user's feedback while keeping the logos clearly visible and integrated.`

      const imageResponse = await fetch('/api/images/generate-grok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: fullPrompt,
          n: 3,
          referenceImages: state.uploadedImages,
        }),
      })

      const imageData = await imageResponse.json()
      if (!imageResponse.ok) throw new Error(imageData.error || 'Image generation failed')

      const generatedImages = imageData.images?.map((img: { url: string }) => img.url) || []

      setMessages(prev => prev.filter(m => m.action !== 'generating_composite'))
      onStateChange(prev => ({
        ...prev,
        generatedImages,
        imageHistory: [...prev.imageHistory, { prompt: state.userPrompt!, images: generatedImages, feedback }],
      }))

      addMessage({
        role: 'assistant',
        content: `Here are ${generatedImages.length} new options with your changes applied. Select one or keep iterating!`,
        action: 'composite_ready',
        images: generatedImages,
      })

    } catch (error) {
      console.error('Regeneration error:', error)
      setMessages(prev => prev.filter(m => m.action !== 'generating_composite'))
      addMessage({
        role: 'assistant',
        content: `Regeneration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Select an image
  const handleSelectImage = (url: string) => {
    onStateChange(prev => ({
      ...prev,
      selectedImage: url,
    }))
    addMessage({
      role: 'user',
      content: 'Selected this image',
      images: [url],
    })
    addMessage({
      role: 'assistant',
      content: 'Great choice! Would you like to:\n\n1. **Animate it** - Turn this into a video with Grok Imagine\n2. **Keep iterating** - Make more changes to the image\n3. **Approve and continue** - Move on to generating marketing copy',
      action: 'approve_image',
    })
  }

  // Animate the selected image
  const handleAnimate = async () => {
    if (!state.selectedImage) {
      addMessage({
        role: 'assistant',
        content: 'Please select an image first.',
      })
      return
    }

    const quality: ModelQuality = 'default'
    const generationType = getVideoGenerationType(quality)

    if (!canAfford(generationType)) {
      addMessage({
        role: 'assistant',
        content: 'Insufficient credits. Please upgrade your plan to animate content.',
      })
      return
    }

    setIsLoading(true)
    addMessage({ role: 'user', content: 'Animate this image' })
    addMessage({
      role: 'assistant',
      content: 'Animating your image with Grok Imagine...',
      action: 'generating_video',
    })

    onStateChange(prev => ({
      ...prev,
      videoStatus: 'generating',
      phase: 'animate',
      videoStartTime: Date.now(),
      videoProgress: 0,
    }))

    try {
      const response = await fetch('/api/videos/generate-grok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId,
          prompt: 'Smooth camera pan with subtle particle effects and gentle lighting changes. Keep the logos stationary and in frame.',
          template: 'social',
          duration: state.videoSettings.duration,
          aspectRatio: state.videoSettings.aspectRatio,
          resolution: state.videoSettings.resolution,
          imageUrl: state.selectedImage,
          quality,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Animation failed')

      onStateChange(prev => ({
        ...prev,
        videoId: data.videoId,
        videoStatus: 'generating',
        videoStartTime: prev.videoStartTime || Date.now(),
      }))
      refreshCredits()

      setMessages(prev => prev.filter(m => m.action !== 'generating_video'))
      addMessage({
        role: 'assistant',
        content: 'Animation started! This typically takes 1-3 minutes. I\'ll notify you when it\'s ready.',
        action: 'generating_video',
      })
    } catch (error) {
      console.error('Animation error:', error)
      setMessages(prev => prev.filter(m => m.action !== 'generating_video'))
      onStateChange(prev => ({ ...prev, videoStatus: 'failed', videoError: String(error) }))
      addMessage({
        role: 'assistant',
        content: `Animation failed: ${error instanceof Error ? error.message : 'Unknown error'}. Would you like to try again?`,
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
      content: 'Content is ready! Now generating marketing copy...',
      action: 'generating_copy',
    })

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Generate marketing copy for this content' }],
          system: `You are a marketing copywriter. Generate social media copy for brand content.

Brand: ${brand?.name || 'Brand'}
Description: ${brand?.description || 'A professional brand'}
Tagline: ${brand?.tagline || ''}
Content description: ${state.userPrompt || 'Brand marketing content'}

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
        onStateChange(prev => ({
          ...prev,
          marketingCopy: parsed,
          videoUrl: videoUrl || prev.videoUrl,
          phase: 'complete',
        }))

        addMessage({
          role: 'assistant',
          content: `Your marketing copy is ready!\n\n**${parsed.headline}**\n\n${parsed.body}\n\n*${parsed.cta}*\n\n${parsed.hashtags.join(' ')}\n\nYou can edit any of these in the preview panel, download the content, or post to social media!`,
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

    // Add user message
    addMessage({
      role: 'user',
      content: userMessage || (userImages.length > 0 ? `Attached ${userImages.length} image(s)` : ''),
      images: userImages.length > 0 ? userImages : undefined,
    })

    // Handle based on phase
    if (state.phase === 'compose') {
      // First phase: generate composite image
      if (userMessage || userImages.length > 0) {
        await generateCompositeImage(userMessage || 'Create a marketing image with these logos', userImages)
      }
      return
    }

    if (state.phase === 'iterate') {
      // Iteration phase: handle commands or regenerate
      const lowerInput = userMessage.toLowerCase()

      if (lowerInput.includes('animate') || lowerInput.includes('video')) {
        await handleAnimate()
        return
      }

      if (lowerInput.includes('approve') || lowerInput.includes('continue') || lowerInput.includes('done')) {
        if (state.selectedImage) {
          await handleGenerateCopy()
        } else {
          addMessage({
            role: 'assistant',
            content: 'Please select an image first before continuing.',
          })
        }
        return
      }

      // Otherwise, treat as feedback for regeneration
      await regenerateWithFeedback(userMessage)
      return
    }

    // Default: AI chat
    setIsLoading(true)
    try {
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
            .concat([{ role: 'user' as const, content: userMessage }]),
          system: `You are helping create content for ${brand?.name || 'a brand'}. Current phase: ${state.phase}. Keep responses brief and helpful.`,
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

  const creditCost = getCreditCost(getVideoGenerationType('default'))

  return (
    <div
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
                      <div key={idx} className="relative group">
                        <button
                          type="button"
                          onClick={() => msg.action === 'composite_ready' && handleSelectImage(img)}
                          className={`relative ${msg.action === 'composite_ready' ? 'cursor-pointer hover:ring-2 hover:ring-primary' : ''} ${state.selectedImage === img ? 'ring-2 ring-primary' : ''}`}
                        >
                          <img
                            src={img}
                            alt={`Image ${idx + 1}`}
                            className="w-32 h-32 object-cover rounded border border-border"
                          />
                          {state.selectedImage === img && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center rounded">
                              <Check className="h-6 w-6 text-primary" />
                            </div>
                          )}
                        </button>
                        {/* Download button - appears on hover */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownload(img, 'image')
                          }}
                          className="absolute bottom-1 right-1 p-1.5 bg-black/70 hover:bg-black/90 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Download image"
                        >
                          <Download className="h-3.5 w-3.5 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>

              {/* Action Buttons */}
              {msg.action === 'approve_image' && state.selectedImage && (
                <div className="flex flex-wrap gap-2 mt-3 mr-8">
                  <Button
                    variant="terminal"
                    size="sm"
                    onClick={handleAnimate}
                    disabled={isLoading}
                  >
                    <Play className="h-4 w-4" />
                    Animate ({creditCost} credits)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => regenerateWithFeedback('Generate new variations')}
                    disabled={isLoading}
                  >
                    <RefreshCw className="h-4 w-4" />
                    More Options
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerateCopy()}
                    disabled={isLoading}
                  >
                    <Sparkles className="h-4 w-4" />
                    Skip to Copy
                  </Button>
                </div>
              )}

              {/* Loading indicator with progress */}
              {(msg.action === 'generating_composite' ||
                msg.action === 'generating_video' ||
                msg.action === 'generating_copy') && (
                <div className="mt-2 mr-8">
                  {msg.action === 'generating_video' && state.videoProgress !== undefined ? (
                    <InlineProgress
                      progress={state.videoProgress}
                      type="animation"
                      className="w-48"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  )}
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

      {/* Input */}
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
              state.phase === 'compose'
                ? 'Describe what you want to create...'
                : state.phase === 'iterate'
                  ? 'Describe changes or type "animate"...'
                  : 'Ask me anything...'
            }
            disabled={isLoading}
            className="font-mono text-sm"
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
            handleFilesSelected(files)
          }
          e.target.value = ''
        }}
      />
    </div>
  )
}
