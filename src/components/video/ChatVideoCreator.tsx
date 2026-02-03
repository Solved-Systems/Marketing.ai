'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
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
} from 'lucide-react'
import type {
  VideoCreationState,
  ChatMessage,
  Brand,
  LogoAnalysis,
  MarketingCopy,
} from '@/types/video-creation'
import { useCredits } from '@/hooks/use-credits'
import { getVideoGenerationType, getCreditCost } from '@/lib/billing/models'
import type { ModelQuality } from '@/lib/billing/models'

interface ChatVideoCreatorProps {
  brandId: string
  brand: Brand | null
  state: VideoCreationState
  onStateChange: (state: VideoCreationState) => void
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

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const hasLogo = brand?.logo_url
      addMessage({
        role: 'assistant',
        content: hasLogo
          ? `Let's create a video for **${brand?.name}**!\n\nI see you have a brand logo. Would you like to use it, or upload a different one?`
          : `Let's create a video for **${brand?.name || 'your brand'}**!\n\nFirst, upload a logo to get started. I'll analyze it to suggest colors and style.`,
        action: hasLogo ? 'use_brand_logo' : 'upload_logo',
      })
    }
  }, [brand, addMessage, messages.length])

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
            onStateChange({
              ...state,
              videoUrl: data.output_url,
              videoStatus: 'complete',
            })
            clearInterval(pollInterval)
            // Move to copy phase
            handleGenerateCopy(data.output_url)
          } else if (data.status === 'failed') {
            onStateChange({
              ...state,
              videoStatus: 'failed',
              videoError: data.error_message || 'Video generation failed',
            })
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

  // Handle logo upload
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

      onStateChange({ ...state, logoUrl: data.url })
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
    onStateChange({ ...state, logoUrl: brand.logo_url })
    addMessage({
      role: 'assistant',
      content: 'Using your brand logo! Analyzing colors and style...',
      action: 'analyzing_logo',
    })

    await analyzeLogo(brand.logo_url)
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

      // Parse JSON
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]) as LogoAnalysis
        onStateChange({
          ...state,
          logoUrl,
          logoAnalysis: parsed,
          phase: 'background',
        })

        // Remove the analyzing message and add result
        setMessages(prev => prev.filter(m => m.action !== 'analyzing_logo'))
        addMessage({
          role: 'assistant',
          content: `I've analyzed your logo:\n\n**Style:** ${parsed.style}\n**Colors:** ${parsed.colors.dominant.slice(0, 3).join(', ')}\n\nNow let's create a background. I'll generate some options based on your brand.`,
          action: 'suggest_background',
        })

        // Auto-generate backgrounds
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
      // Generate backgrounds with default colors
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
      // First, generate a prompt with AI
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

      onStateChange({ ...state, backgroundPrompt })

      // Generate images
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

      // Remove generating message and show results
      setMessages(prev => prev.filter(m => m.action !== 'generating_backgrounds'))
      onStateChange({
        ...state,
        backgroundImages,
        phase: 'background',
      })

      addMessage({
        role: 'assistant',
        content: `I've generated ${backgroundImages.length} background options. Select one to continue, or describe what you'd like instead.`,
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

    onStateChange({ ...state, videoStatus: 'generating' })

    try {
      // Generate video prompt
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

      // Generate video
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

      onStateChange({
        ...state,
        videoId: data.videoId,
        videoPrompt,
        videoStatus: 'generating',
      })
      refreshCredits()

      // Remove generating message and show status
      setMessages(prev => prev.filter(m => m.action !== 'generating_video'))
      addMessage({
        role: 'assistant',
        content: 'Video generation started! This typically takes 1-3 minutes. I\'ll notify you when it\'s ready.',
        action: 'generating_video',
      })
    } catch (error) {
      console.error('Video generation error:', error)
      setMessages(prev => prev.filter(m => m.action !== 'generating_video'))
      onStateChange({ ...state, videoStatus: 'failed', videoError: String(error) })
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

    onStateChange({ ...state, phase: 'copy' })

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
        onStateChange({
          ...state,
          marketingCopy: parsed,
          videoUrl: videoUrl || state.videoUrl,
          phase: 'complete',
        })

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

  // Handle user input
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    addMessage({ role: 'user', content: userMessage })

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

    // General AI chat for other queries
    setIsLoading(true)
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
    onStateChange({
      ...state,
      videoSettings: { ...state.videoSettings, [key]: value },
    })
  }

  const creditCost = getCreditCost(getVideoGenerationType('default'))

  return (
    <div className="flex flex-col h-full">
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

              {msg.action === 'use_brand_logo' && messages.length <= 2 && (
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

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-border/50">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              state.phase === 'logo'
                ? 'Describe your brand or ask for help...'
                : state.phase === 'background'
                  ? 'Describe the background you want...'
                  : state.phase === 'video'
                    ? 'Ask about video settings...'
                    : 'Ask me anything...'
            }
            disabled={isLoading}
            className="font-mono text-sm"
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim()}
            variant="terminal"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {credits !== null && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Credits: {credits}
          </p>
        )}
      </form>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleLogoUpload(file)
        }}
      />
    </div>
  )
}
