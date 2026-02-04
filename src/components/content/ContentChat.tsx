'use client'

import { useState, useRef, useEffect, useCallback, DragEvent } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Send,
  Loader2,
  Upload,
  X,
  Paperclip,
  Video,
  Image as ImageIcon,
  MessageSquare,
  Download,
  Sparkles,
} from 'lucide-react'
import type { Brand, BrandMetadata } from '@/types/video-creation'
import type {
  ContentChatMessage,
  ContentCreationState,
  GeneratedContent,
  ContentType,
} from '@/types/content-creation'
import { useCredits } from '@/hooks/use-credits'
import { getCreditCost, getVideoGenerationType } from '@/lib/billing/models'

interface ContentChatProps {
  brand: Brand
}

// Helper prompt suggestions
const CONTENT_PROMPTS = [
  { icon: Video, label: 'Create a video', type: 'video' as ContentType, color: 'text-blue-400' },
  { icon: ImageIcon, label: 'Generate an image', type: 'image' as ContentType, color: 'text-green-400' },
  { icon: MessageSquare, label: 'Write a post', type: 'post' as ContentType, color: 'text-purple-400' },
]

export function ContentChat({ brand }: ContentChatProps) {
  const [messages, setMessages] = useState<ContentChatMessage[]>([])
  const [input, setInput] = useState('')
  const [state, setState] = useState<ContentCreationState>({
    isGenerating: false,
    currentAction: 'idle',
    generatedItems: [],
  })
  const [pendingImages, setPendingImages] = useState<string[]>([])
  const [isDragOver, setIsDragOver] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { remaining: credits, canAfford, refetch: refreshCredits } = useCredits()

  // Add message helper
  const addMessage = useCallback((msg: Omit<ContentChatMessage, 'id' | 'timestamp'>) => {
    const newMsg: ContentChatMessage = {
      ...msg,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, newMsg])
    return newMsg.id
  }, [])

  // Update last message
  const updateLastMessage = useCallback((updates: Partial<ContentChatMessage>) => {
    setMessages(prev => {
      const newMessages = [...prev]
      const lastIdx = newMessages.length - 1
      if (lastIdx >= 0) {
        newMessages[lastIdx] = { ...newMessages[lastIdx], ...updates }
      }
      return newMessages
    })
  }, [])

  // Scroll to bottom
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
            const videoContent: GeneratedContent = {
              id: state.videoId!,
              type: 'video',
              url: data.output_url,
              createdAt: new Date(),
            }

            setState(prev => ({
              ...prev,
              videoStatus: 'complete',
              isGenerating: false,
              currentAction: 'idle',
              generatedItems: [...prev.generatedItems, videoContent],
              lastGeneratedType: 'video',
            }))

            updateLastMessage({
              content: 'Your video is ready!',
              generatedContent: videoContent,
              action: 'complete',
            })

            clearInterval(pollInterval)

            setTimeout(() => {
              addMessage({
                role: 'assistant',
                content: 'Would you like me to write a caption for this video? Or generate another piece of content?',
              })
            }, 500)
          } else if (data.status === 'failed') {
            setState(prev => ({
              ...prev,
              videoStatus: 'failed',
              isGenerating: false,
              currentAction: 'idle',
            }))
            updateLastMessage({
              content: `Video generation failed: ${data.error_message || 'Unknown error'}. Would you like to try again?`,
              action: 'complete',
            })
            clearInterval(pollInterval)
          }
        }
      } catch (error) {
        console.error('Poll error:', error)
      }
    }, 3000)

    return () => clearInterval(pollInterval)
  }, [state.videoStatus, state.videoId, addMessage, updateLastMessage])

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

  const removePendingImage = (index: number) => {
    setPendingImages(prev => prev.filter((_, i) => i !== index))
  }

  // Upload image
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

  // Generate image
  const generateImage = async (prompt: string) => {
    setState(prev => ({ ...prev, isGenerating: true, currentAction: 'generating_image' }))

    addMessage({
      role: 'assistant',
      content: 'Generating your image...',
      action: 'generating_image',
    })

    try {
      const enhancedPrompt = `${prompt}. Brand: ${brand.name}. Style: professional, modern. Colors: ${brand.primary_color}, ${brand.secondary_color}.`

      const response = await fetch('/api/images/generate-grok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: enhancedPrompt,
          n: 1,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Image generation failed')

      const imageUrl = data.images?.[0]?.url
      if (!imageUrl) throw new Error('No image returned')

      const imageContent: GeneratedContent = {
        id: `img-${Date.now()}`,
        type: 'image',
        url: imageUrl,
        createdAt: new Date(),
      }

      setState(prev => ({
        ...prev,
        isGenerating: false,
        currentAction: 'idle',
        generatedItems: [...prev.generatedItems, imageContent],
        lastGeneratedType: 'image',
      }))

      updateLastMessage({
        content: 'Here\'s your generated image!',
        generatedContent: imageContent,
        action: 'complete',
      })

      refreshCredits()

      setTimeout(() => {
        addMessage({
          role: 'assistant',
          content: 'Would you like me to write a caption for this image? Or create a video from it?',
        })
      }, 500)
    } catch (error) {
      setState(prev => ({ ...prev, isGenerating: false, currentAction: 'idle' }))
      updateLastMessage({
        content: `Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        action: 'complete',
      })
    }
  }

  // Generate video
  const generateVideo = async (prompt: string, imageUrl?: string) => {
    const generationType = getVideoGenerationType('default')
    if (!canAfford(generationType)) {
      addMessage({
        role: 'assistant',
        content: 'Insufficient credits for video generation. Please upgrade your plan.',
      })
      return
    }

    setState(prev => ({ ...prev, isGenerating: true, currentAction: 'generating_video', videoStatus: 'generating' }))

    addMessage({
      role: 'assistant',
      content: 'Starting video generation... This typically takes 1-3 minutes.',
      action: 'generating_video',
    })

    try {
      let backgroundUrl = imageUrl
      if (!backgroundUrl) {
        const bgPrompt = `Abstract professional background for ${brand.name}. ${prompt}. Colors: ${brand.primary_color}, ${brand.secondary_color}. Subtle, not distracting.`

        const bgResponse = await fetch('/api/images/generate-grok', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: bgPrompt, n: 1 }),
        })

        const bgData = await bgResponse.json()
        backgroundUrl = bgData.images?.[0]?.url
      }

      const videoPrompt = `Smooth, subtle motion for marketing video. ${prompt}. Professional, on-brand feel.`

      const response = await fetch('/api/videos/generate-grok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: brand.id,
          prompt: videoPrompt,
          template: 'social',
          duration: 5,
          aspectRatio: '16:9',
          resolution: '720p',
          imageUrl: backgroundUrl,
          quality: 'default',
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Video generation failed')

      setState(prev => ({
        ...prev,
        videoId: data.videoId,
        videoStatus: 'generating',
      }))

      refreshCredits()

      updateLastMessage({
        content: 'Video generation started! I\'ll notify you when it\'s ready...',
        action: 'generating_video',
      })
    } catch (error) {
      setState(prev => ({
        ...prev,
        isGenerating: false,
        currentAction: 'idle',
        videoStatus: 'failed',
      }))
      updateLastMessage({
        content: `Video generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        action: 'complete',
      })
    }
  }

  // Generate post/caption
  const generatePost = async (topic: string, forContent?: GeneratedContent) => {
    setState(prev => ({ ...prev, isGenerating: true, currentAction: 'generating_post' }))

    addMessage({
      role: 'assistant',
      content: forContent ? 'Writing a caption for your content...' : 'Generating your social post...',
      action: 'generating_post',
    })

    try {
      const context = forContent
        ? `This is a caption for a ${forContent.type} about: ${topic}`
        : `This is a standalone social media post about: ${topic}`

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: topic }],
          system: `You are a social media copywriter for ${brand.name}.
${brand.description ? `Brand description: ${brand.description}` : ''}
${brand.tagline ? `Tagline: ${brand.tagline}` : ''}

${context}

Write an engaging social media post that:
1. Captures attention immediately
2. Reflects the brand voice
3. Includes a clear call to action
4. Uses 3-5 relevant hashtags

Respond with ONLY a JSON block:
\`\`\`json
{
  "text": "The post content here...",
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"]
}
\`\`\``,
        }),
      })

      const data = await response.json()
      const content = data.content || ''

      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1])

        const postContent: GeneratedContent = {
          id: `post-${Date.now()}`,
          type: 'post',
          text: parsed.text,
          hashtags: parsed.hashtags,
          createdAt: new Date(),
        }

        if (forContent) {
          setState(prev => ({
            ...prev,
            isGenerating: false,
            currentAction: 'idle',
            generatedItems: prev.generatedItems.map(item =>
              item.id === forContent.id
                ? { ...item, caption: parsed.text, hashtags: parsed.hashtags }
                : item
            ),
            lastGeneratedType: 'post',
          }))
        } else {
          setState(prev => ({
            ...prev,
            isGenerating: false,
            currentAction: 'idle',
            generatedItems: [...prev.generatedItems, postContent],
            lastGeneratedType: 'post',
          }))
        }

        updateLastMessage({
          content: `**${parsed.text}**\n\n${parsed.hashtags.join(' ')}`,
          generatedContent: postContent,
          action: 'complete',
        })

        setTimeout(() => {
          if (forContent) {
            addMessage({
              role: 'assistant',
              content: 'Caption added! Would you like me to create more content, or regenerate this caption?',
            })
          } else {
            addMessage({
              role: 'assistant',
              content: 'Would you like me to create an image or video to go with this post?',
            })
          }
        }, 500)
      } else {
        throw new Error('Could not parse response')
      }
    } catch (error) {
      setState(prev => ({ ...prev, isGenerating: false, currentAction: 'idle' }))
      updateLastMessage({
        content: `Failed to generate post: ${error instanceof Error ? error.message : 'Unknown error'}`,
        action: 'complete',
      })
    }
  }

  // Handle quick action button click - directly trigger generation
  const handleQuickAction = async (type: ContentType) => {
    const prompts: Record<ContentType, string> = {
      video: `Create a professional promotional video showcasing ${brand.name}`,
      image: `Create a professional marketing image for ${brand.name}`,
      post: `Write an engaging social media post about ${brand.name}`,
    }

    // Add user message
    addMessage({
      role: 'user',
      content: prompts[type],
    })

    // Trigger generation
    switch (type) {
      case 'video':
        await generateVideo(prompts[type])
        break
      case 'image':
        await generateImage(prompts[type])
        break
      case 'post':
        await generatePost(prompts[type])
        break
    }
  }

  // Parse user intent
  const parseIntent = (text: string): { type: ContentType | 'caption' | 'chat'; topic: string } => {
    const lower = text.toLowerCase()

    if ((lower.includes('caption') || lower.includes('write a caption')) && state.lastGeneratedType) {
      return { type: 'caption', topic: text }
    }

    if (lower.includes('video') || lower.includes('animate') || lower.includes('motion')) {
      return { type: 'video', topic: text }
    }

    if (lower.includes('image') || lower.includes('picture') || lower.includes('photo') || lower.includes('graphic') || lower.includes('generate an')) {
      return { type: 'image', topic: text }
    }

    if (lower.includes('post') || lower.includes('caption') || lower.includes('write') || lower.includes('copy') || lower.includes('text')) {
      return { type: 'post', topic: text }
    }

    return { type: 'chat', topic: text }
  }

  // Handle submit
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if ((!input.trim() && pendingImages.length === 0) || state.isGenerating) return

    const userMessage = input.trim()
    const userImages = [...pendingImages]
    setInput('')
    setPendingImages([])

    addMessage({
      role: 'user',
      content: userMessage || `Attached ${userImages.length} image(s)`,
      images: userImages.length > 0 ? userImages : undefined,
    })

    if (userImages.length > 0 && !userMessage) {
      addMessage({
        role: 'assistant',
        content: 'Nice image! What would you like me to do with it?\n\n- **Create a video** from this image\n- **Write a caption** for it\n- **Generate similar images**',
      })
      return
    }

    if (userImages.length > 0 && userMessage) {
      const intent = parseIntent(userMessage)
      if (intent.type === 'video') {
        try {
          const uploadedUrl = await uploadImage(userImages[0])
          await generateVideo(intent.topic, uploadedUrl)
        } catch (error) {
          addMessage({
            role: 'assistant',
            content: `Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`,
          })
        }
        return
      }
    }

    const intent = parseIntent(userMessage)

    switch (intent.type) {
      case 'video':
        await generateVideo(intent.topic)
        break
      case 'image':
        await generateImage(intent.topic)
        break
      case 'post':
        await generatePost(intent.topic)
        break
      case 'caption':
        const lastContent = state.generatedItems[state.generatedItems.length - 1]
        if (lastContent && (lastContent.type === 'video' || lastContent.type === 'image')) {
          await generatePost(intent.topic, lastContent)
        } else {
          await generatePost(intent.topic)
        }
        break
      default:
        setState(prev => ({ ...prev, isGenerating: true }))
        try {
          const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: messages
                .filter(m => m.role !== 'system')
                .slice(-10)
                .map(m => ({ role: m.role, content: m.content }))
                .concat([{ role: 'user', content: userMessage }]),
              system: `You are a helpful content creation assistant for ${brand.name}.
You can help create videos, images, and social posts.
If the user wants to create content, ask clarifying questions about what they want.
Keep responses brief and helpful.`,
            }),
          })

          const data = await response.json()
          addMessage({ role: 'assistant', content: data.content || 'How can I help you create content?' })
        } catch {
          addMessage({ role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' })
        } finally {
          setState(prev => ({ ...prev, isGenerating: false }))
        }
    }
  }

  // Handle textarea key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px'
    }
  }, [input])

  const videoCost = getCreditCost(getVideoGenerationType('default'))
  const hasMessages = messages.length > 0

  return (
    <div
      className={`flex flex-col h-full min-h-0 relative ${isDragOver ? 'ring-2 ring-primary ring-inset' : ''}`}
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

      {/* Main content area */}
      {!hasMessages ? (
        /* Welcome state - centered content */
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-4 sm:p-6 overflow-auto">
          <div className="text-center max-w-md w-full">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <Sparkles className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
            </div>
            <h2 className="text-lg sm:text-xl font-semibold mb-2">What would you like to create?</h2>
            <p className="text-muted-foreground text-sm mb-6 sm:mb-8">
              Choose an option below or describe what you need
            </p>

            {/* Quick action buttons */}
            <div className="flex flex-col gap-2 sm:gap-3 justify-center mb-6 sm:mb-8">
              {CONTENT_PROMPTS.map((prompt) => (
                <button
                  key={prompt.type}
                  type="button"
                  onClick={() => handleQuickAction(prompt.type)}
                  disabled={state.isGenerating}
                  className="flex items-center justify-center gap-3 px-4 py-3 rounded-lg border border-border bg-card hover:bg-muted active:bg-muted/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                >
                  <prompt.icon className={`h-5 w-5 ${prompt.color}`} />
                  <span className="font-medium">{prompt.label}</span>
                </button>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              Credits: {credits ?? '...'} • Video: {videoCost} credits
            </p>
          </div>
        </div>
      ) : (
        /* Messages */
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4 max-w-2xl mx-auto pb-4">
            {messages.map((msg) => (
              <div key={msg.id}>
                <div
                  className={`text-sm p-4 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-primary/20 ml-8'
                      : 'bg-muted mr-8'
                  }`}
                >
                  {/* Image attachments */}
                  {msg.images && msg.images.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {msg.images.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt={`Attachment ${idx + 1}`}
                          className="w-24 h-24 object-cover rounded border border-border"
                        />
                      ))}
                    </div>
                  )}

                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {/* Generated content display */}
                  {msg.generatedContent && (
                    <div className="mt-4 p-3 bg-card rounded-lg border border-border">
                      {msg.generatedContent.type === 'image' && msg.generatedContent.url && (
                        <div className="space-y-3">
                          <img
                            src={msg.generatedContent.url}
                            alt="Generated"
                            className="w-full max-w-md rounded-lg"
                          />
                          <a
                            href={msg.generatedContent.url}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-xs text-primary hover:underline"
                          >
                            <Download className="h-3 w-3" />
                            Download Image
                          </a>
                        </div>
                      )}

                      {msg.generatedContent.type === 'video' && msg.generatedContent.url && (
                        <div className="space-y-3">
                          <video
                            src={msg.generatedContent.url}
                            controls
                            className="w-full max-w-md rounded-lg"
                          />
                          <a
                            href={msg.generatedContent.url}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-xs text-primary hover:underline"
                          >
                            <Download className="h-3 w-3" />
                            Download Video
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Loading indicator */}
                  {(msg.action === 'generating_image' ||
                    msg.action === 'generating_video' ||
                    msg.action === 'generating_post' ||
                    msg.action === 'generating_caption') && (
                    <div className="flex items-center gap-2 mt-3 text-sm text-primary">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Working on it...</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {state.isGenerating && messages[messages.length - 1]?.action === undefined && (
              <div className="bg-muted text-sm p-4 rounded-lg mr-8 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Thinking...</span>
              </div>
            )}
          </div>
        </ScrollArea>
      )}

      {/* Pending Images */}
      {pendingImages.length > 0 && (
        <div className="px-4 py-3 border-t border-border bg-muted/30">
          <div className="flex gap-2 flex-wrap max-w-2xl mx-auto">
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
                  className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-sm"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input area - always visible, safe for mobile */}
      <div className="flex-shrink-0 border-t border-border bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
          <div className="flex gap-2 items-end">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={state.isGenerating}
              className="flex-shrink-0 p-2.5 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50"
            >
              <Paperclip className="h-5 w-5 text-muted-foreground" />
            </button>

            <div className="flex-1 min-w-0">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe what you want to create..."
                disabled={state.isGenerating}
                rows={1}
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-base leading-normal focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 placeholder:text-muted-foreground"
                style={{ minHeight: '44px', maxHeight: '120px', fontSize: '16px' }}
              />
            </div>

            <Button
              type="submit"
              size="icon"
              disabled={state.isGenerating || (!input.trim() && pendingImages.length === 0)}
              variant="terminal"
              className="flex-shrink-0 h-11 w-11"
            >
              {state.isGenerating ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-2 text-center hidden sm:block">
            Press Enter to send • Shift+Enter for new line • Drag & drop images
          </p>
        </form>
      </div>

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
