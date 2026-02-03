'use client'

import { use, useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AIChatAssistant } from '@/components/ui/ai-chat-assistant'
import { VideoPreview } from '@/components/video/VideoPreview'
import { ArrowLeft, Video, Loader2, Sparkles, Play, Download, CheckCircle, AlertCircle, Wand2, Clapperboard, Bot } from 'lucide-react'
import { useCredits } from '@/hooks/use-credits'
import { VIDEO_TIERS, getVideoGenerationType, getCreditCost } from '@/lib/billing/models'
import type { ModelQuality } from '@/lib/billing/models'
import type { GenerationType } from '@/types/billing'

type VideoEngine = 'remotion' | 'grok'

interface VideoFormData {
  title: string
  description: string
  template: 'feature' | 'product' | 'social' | 'release' | ''
  duration: '15 seconds' | '30 seconds' | '60 seconds'
  style: 'Modern' | 'Minimal' | 'Bold' | 'Playful'
  callToAction: string
  features: string
}

interface GrokFormData {
  prompt: string
  duration: number
  aspectRatio: '16:9' | '4:3' | '1:1' | '9:16' | '3:4' | '3:2' | '2:3'
  resolution: '720p' | '480p'
  imageUrl: string
}

interface Brand {
  id: string
  name: string
  description: string | null
  tagline: string | null
  primary_color: string | null
  secondary_color: string | null
  accent_color: string | null
  website_url: string | null
  github_repo: string | null
}

const formFields = [
  { name: 'title', label: 'Video Title', type: 'text' as const, description: 'The main title for your video' },
  { name: 'description', label: 'Description', type: 'textarea' as const, description: 'What is this video about?' },
  { name: 'template', label: 'Template', type: 'select' as const, options: ['Feature Announcement', 'Product Demo', 'Social Teaser', 'Release Notes'], description: 'Video template style' },
  { name: 'duration', label: 'Duration', type: 'select' as const, options: ['15 seconds', '30 seconds', '60 seconds'], description: 'Target video length' },
  { name: 'style', label: 'Visual Style', type: 'select' as const, options: ['Modern', 'Minimal', 'Bold', 'Playful'], description: 'Visual aesthetic' },
  { name: 'callToAction', label: 'Call to Action', type: 'text' as const, description: 'What should viewers do?' },
  { name: 'features', label: 'Key Features', type: 'textarea' as const, description: 'List of features to highlight' },
]

const templates = [
  { value: 'feature', label: 'Feature Announcement', description: 'Highlight new features or updates' },
  { value: 'product', label: 'Product Demo', description: 'Showcase your product in action' },
  { value: 'social', label: 'Social Teaser', description: 'Short engaging content for social media' },
  { value: 'release', label: 'Release Notes', description: 'Announce version updates' },
]

const aspectRatios = [
  { value: '16:9', label: '16:9 (Landscape)', description: 'YouTube, presentations' },
  { value: '9:16', label: '9:16 (Portrait)', description: 'TikTok, Reels, Stories' },
  { value: '1:1', label: '1:1 (Square)', description: 'Instagram, social feeds' },
  { value: '4:3', label: '4:3 (Classic)', description: 'Traditional video' },
  { value: '3:4', label: '3:4 (Portrait)', description: 'Pinterest, some social' },
]

interface RenderStatus {
  status: 'pending' | 'rendering' | 'completed' | 'failed' | 'processing'
  progress: number
  output_url?: string
  error_message?: string
}

export default function CreateVideoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [engine, setEngine] = useState<VideoEngine>('remotion')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'success' | 'error' | 'rendering'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [brand, setBrand] = useState<Brand | null>(null)
  const [quality, setQuality] = useState<ModelQuality>('default')
  const [videoId, setVideoId] = useState<string | null>(null)
  const [renderProgress, setRenderProgress] = useState(0)
  const [outputUrl, setOutputUrl] = useState<string | null>(null)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const { remaining: credits, refetch: refreshCredits, canAfford: checkCanAfford } = useCredits()

  // Remotion form data
  const [formData, setFormData] = useState<VideoFormData>({
    title: '',
    description: '',
    template: '',
    duration: '30 seconds',
    style: 'Modern',
    callToAction: '',
    features: '',
  })

  // Grok Imagine form data
  const [grokFormData, setGrokFormData] = useState<GrokFormData>({
    prompt: '',
    duration: 5,
    aspectRatio: '16:9',
    resolution: '720p',
    imageUrl: '',
  })

  // Fetch brand data for colors
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

  // Poll for render status
  useEffect(() => {
    if (!videoId || generationStatus !== 'rendering') return

    const endpoint = engine === 'grok' ? '/api/videos/generate-grok' : '/api/videos/generate'

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${endpoint}?id=${videoId}`)
        if (response.ok) {
          const data: RenderStatus = await response.json()
          setRenderProgress(data.progress || 0)

          if (data.status === 'completed' && data.output_url) {
            setOutputUrl(data.output_url)
            setGenerationStatus('success')
            clearInterval(pollInterval)
          } else if (data.status === 'failed') {
            setErrorMessage(data.error_message || 'Render failed')
            setGenerationStatus('error')
            clearInterval(pollInterval)
          }
        }
      } catch (error) {
        console.error('Failed to poll render status:', error)
      }
    }, 3000) // Poll every 3 seconds

    return () => clearInterval(pollInterval)
  }, [videoId, generationStatus, engine])

  const handleFieldUpdate = (fieldName: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value,
    }))
    // Show preview when user has entered title and selected template
    if (fieldName === 'title' || fieldName === 'template') {
      const newData = { ...formData, [fieldName]: value }
      if (newData.title && newData.template) {
        setShowPreview(true)
      }
    }
  }

  const handleGrokFieldUpdate = (fieldName: string, value: unknown) => {
    setGrokFormData(prev => ({
      ...prev,
      [fieldName]: value,
    }))
  }

  const handleGenerateWithAI = async () => {
    if (!formData.template) {
      setErrorMessage('Please select a template first')
      setGenerationStatus('error')
      return
    }

    if (!brand) {
      setErrorMessage('Brand data not loaded')
      setGenerationStatus('error')
      return
    }

    setIsGeneratingAI(true)
    setErrorMessage('')

    const templateLabels: Record<string, string> = {
      feature: 'Feature Announcement',
      product: 'Product Demo',
      social: 'Social Teaser',
      release: 'Release Notes',
    }

    const prompt = `Generate video content for a "${templateLabels[formData.template]}" marketing video.

Brand Information:
- Name: ${brand.name}
- Description: ${brand.description || 'Not provided'}
- Tagline: ${brand.tagline || 'Not provided'}
- Website: ${brand.website_url || 'Not provided'}

Video Settings:
- Template: ${templateLabels[formData.template]}
- Duration: ${formData.duration}
- Style: ${formData.style}

Generate compelling marketing content that fits this template. Return your response as a JSON object with these exact fields:
{
  "title": "A catchy, impactful video title (max 50 characters)",
  "description": "A brief description of what the video communicates (1-2 sentences)",
  "features": "3-5 key features or points to highlight, one per line",
  "callToAction": "A clear call to action (e.g., 'Get Started Free', 'Learn More')"
}

Only return the JSON object, no other text.`

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          system: 'You are a marketing expert that creates compelling video content. Always respond with valid JSON only.',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate content')
      }

      const data = await response.json()

      // Parse the JSON response
      let parsed
      try {
        // Try to extract JSON from the response
        const jsonMatch = data.content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0])
        } else {
          throw new Error('No JSON found in response')
        }
      } catch {
        console.error('Failed to parse AI response:', data.content)
        throw new Error('Failed to parse AI response')
      }

      // Update form fields
      if (parsed.title) handleFieldUpdate('title', parsed.title)
      if (parsed.description) handleFieldUpdate('description', parsed.description)
      if (parsed.features) handleFieldUpdate('features', parsed.features)
      if (parsed.callToAction) handleFieldUpdate('callToAction', parsed.callToAction)

      setShowPreview(true)
    } catch (error) {
      console.error('AI generation error:', error)
      setErrorMessage(error instanceof Error ? error.message : 'Failed to generate with AI')
      setGenerationStatus('error')
    } finally {
      setIsGeneratingAI(false)
    }
  }

  const handleGenerate = async () => {
    if (engine === 'remotion') {
      if (!formData.title || !formData.template) {
        setErrorMessage('Please fill in the title and select a template')
        setGenerationStatus('error')
        return
      }
    } else {
      if (!grokFormData.prompt) {
        setErrorMessage('Please enter a prompt describing your video')
        setGenerationStatus('error')
        return
      }
    }

    setIsGenerating(true)
    setGenerationStatus('idle')
    setErrorMessage('')
    setRenderProgress(0)
    setOutputUrl(null)

    try {
      const endpoint = engine === 'grok' ? '/api/videos/generate-grok' : '/api/videos/generate'
      const body = engine === 'grok' 
        ? {
            brandId: id,
            prompt: grokFormData.prompt,
            duration: grokFormData.duration,
            aspectRatio: grokFormData.aspectRatio,
            resolution: grokFormData.resolution,
            imageUrl: grokFormData.imageUrl || undefined,
            quality,
          }
        : {
            brandId: id,
            title: formData.title,
            description: formData.description,
            template: formData.template,
            duration: formData.duration,
            style: formData.style,
            callToAction: formData.callToAction,
            features: formData.features,
            quality,
          }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate video')
      }

      // Set video ID and start polling for render status
      setVideoId(data.videoId)
      setGenerationStatus('rendering')
      setShowPreview(true)
      refreshCredits()
    } catch (error) {
      console.error('Error generating video:', error)
      setErrorMessage(error instanceof Error ? error.message : 'Failed to generate video')
      setGenerationStatus('error')
    } finally {
      setIsGenerating(false)
    }
  }

  const generationType = getVideoGenerationType(quality) as GenerationType
  const creditCost = getCreditCost(generationType)
  const canAfford = checkCanAfford(generationType)

  // Parse features into array for preview
  const featuresArray = formData.features
    .split('\n')
    .map(f => f.trim())
    .filter(f => f.length > 0)

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/brands/${id}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Brand
        </Link>
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono mb-2">
          <span>$</span>
          <span className="text-primary">./brands/{id}/create/video</span>
        </div>
        <h1 className="text-3xl font-bold">Create AI Video</h1>
        <p className="text-muted-foreground mt-2">
          Generate a marketing video with {engine === 'remotion' ? 'Remotion templates' : 'Grok Imagine AI'}
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left column: Form */}
        <div className="space-y-6">
          {/* Engine Selection */}
          <Card className="terminal-border bg-card/50">
            <CardHeader>
              <CardTitle className="font-mono text-sm flex items-center gap-2">
                <Clapperboard className="h-4 w-4 text-primary" />
                select_engine
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setEngine('remotion')}
                  className={`p-4 rounded text-left terminal-border transition-all ${
                    engine === 'remotion'
                      ? 'bg-primary/20 border-primary'
                      : 'bg-card/30 hover:bg-card/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Video className="h-4 w-4" />
                    <p className="font-semibold">Remotion</p>
                  </div>
                  <p className="text-sm text-muted-foreground">Template-based videos with your brand colors</p>
                </button>
                <button
                  type="button"
                  onClick={() => setEngine('grok')}
                  className={`p-4 rounded text-left terminal-border transition-all ${
                    engine === 'grok'
                      ? 'bg-primary/20 border-primary'
                      : 'bg-card/30 hover:bg-card/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Bot className="h-4 w-4" />
                    <p className="font-semibold">Grok Imagine</p>
                  </div>
                  <p className="text-sm text-muted-foreground">AI-generated cinematic videos from prompts</p>
                </button>
              </div>
            </CardContent>
          </Card>

          {engine === 'remotion' ? (
            <>
              {/* Template Selection */}
              <Card className="terminal-border bg-card/50">
                <CardHeader>
                  <CardTitle className="font-mono text-sm flex items-center gap-2">
                    <Video className="h-4 w-4 text-primary" />
                    select_template
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {templates.map((template) => (
                      <button
                        key={template.value}
                        type="button"
                        onClick={() => handleFieldUpdate('template', template.value)}
                        className={`p-4 rounded text-left terminal-border transition-all ${
                          formData.template === template.value
                            ? 'bg-primary/20 border-primary'
                            : 'bg-card/30 hover:bg-card/50'
                        }`}
                      >
                        <p className="font-semibold">{template.label}</p>
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Video Details */}
              <Card className="terminal-border bg-card/50">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="font-mono text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    video_config
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateWithAI}
                    disabled={isGeneratingAI || !formData.template}
                    className="h-8"
                  >
                    {isGeneratingAI ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-3 w-3 mr-1" />
                        Auto-fill with AI
                      </>
                    )}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title" className="font-mono text-sm">
                      title <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleFieldUpdate('title', e.target.value)}
                      placeholder="Enter video title"
                      className="font-mono"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description" className="font-mono text-sm">
                      description
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleFieldUpdate('description', e.target.value)}
                      placeholder="Describe what this video should communicate..."
                      className="font-mono min-h-[80px]"
                    />
                  </div>

                  {/* Duration & Style */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-mono text-sm">duration</Label>
                      <Select
                        value={formData.duration}
                        onValueChange={(value) => handleFieldUpdate('duration', value)}
                      >
                        <SelectTrigger className="font-mono">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15 seconds">15 seconds</SelectItem>
                          <SelectItem value="30 seconds">30 seconds</SelectItem>
                          <SelectItem value="60 seconds">60 seconds</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-mono text-sm">style</Label>
                      <Select
                        value={formData.style}
                        onValueChange={(value) => handleFieldUpdate('style', value as VideoFormData['style'])}
                      >
                        <SelectTrigger className="font-mono">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Modern">Modern</SelectItem>
                          <SelectItem value="Minimal">Minimal</SelectItem>
                          <SelectItem value="Bold">Bold</SelectItem>
                          <SelectItem value="Playful">Playful</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-2">
                    <Label htmlFor="features" className="font-mono text-sm">
                      key_features
                    </Label>
                    <Textarea
                      id="features"
                      value={formData.features}
                      onChange={(e) => handleFieldUpdate('features', e.target.value)}
                      placeholder="List the key features to highlight (one per line)..."
                      className="font-mono min-h-[80px]"
                    />
                  </div>

                  {/* Call to Action */}
                  <div className="space-y-2">
                    <Label htmlFor="callToAction" className="font-mono text-sm">
                      call_to_action
                    </Label>
                    <Input
                      id="callToAction"
                      value={formData.callToAction}
                      onChange={(e) => handleFieldUpdate('callToAction', e.target.value)}
                      placeholder="e.g., Try it free, Learn more, Get started"
                      className="font-mono"
                    />
                  </div>

                  {/* Quality Selection */}
                  <div className="space-y-2">
                    <Label className="font-mono text-sm">quality</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {VIDEO_TIERS.map((tier) => (
                        <button
                          key={tier.quality}
                          type="button"
                          onClick={() => setQuality(tier.quality)}
                          className={`p-3 rounded text-left terminal-border transition-all ${
                            quality === tier.quality
                              ? 'bg-primary/20 border-primary'
                              : 'bg-card/30 hover:bg-card/50'
                          }`}
                        >
                          <p className="font-semibold text-sm">{tier.label}</p>
                          <p className="text-xs text-muted-foreground">{tier.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            /* Grok Imagine Form */
            <Card className="terminal-border bg-card/50">
              <CardHeader>
                <CardTitle className="font-mono text-sm flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary" />
                  grok_imagine_config
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Prompt */}
                <div className="space-y-2">
                  <Label htmlFor="grok-prompt" className="font-mono text-sm">
                    prompt <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="grok-prompt"
                    value={grokFormData.prompt}
                    onChange={(e) => handleGrokFieldUpdate('prompt', e.target.value)}
                    placeholder="Describe the video you want to generate... e.g., 'A modern tech product floating in space with glowing particles'"
                    className="font-mono min-h-[120px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Be descriptive! Include details about style, mood, motion, and visual elements.
                  </p>
                </div>

                {/* Duration Slider */}
                <div className="space-y-2">
                  <Label className="font-mono text-sm">
                    duration: {grokFormData.duration} seconds
                  </Label>
                  <input
                    type="range"
                    min={1}
                    max={15}
                    value={grokFormData.duration}
                    onChange={(e) => handleGrokFieldUpdate('duration', parseInt(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1s</span>
                    <span>15s</span>
                  </div>
                </div>

                {/* Aspect Ratio */}
                <div className="space-y-2">
                  <Label className="font-mono text-sm">aspect_ratio</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {aspectRatios.map((ar) => (
                      <button
                        key={ar.value}
                        type="button"
                        onClick={() => handleGrokFieldUpdate('aspectRatio', ar.value)}
                        className={`p-2 rounded text-center terminal-border transition-all ${
                          grokFormData.aspectRatio === ar.value
                            ? 'bg-primary/20 border-primary'
                            : 'bg-card/30 hover:bg-card/50'
                        }`}
                      >
                        <p className="font-semibold text-sm">{ar.value}</p>
                        <p className="text-xs text-muted-foreground">{ar.label.split(' ')[0]}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Resolution */}
                <div className="space-y-2">
                  <Label className="font-mono text-sm">resolution</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleGrokFieldUpdate('resolution', '720p')}
                      className={`p-3 rounded text-left terminal-border transition-all ${
                        grokFormData.resolution === '720p'
                          ? 'bg-primary/20 border-primary'
                          : 'bg-card/30 hover:bg-card/50'
                      }`}
                    >
                      <p className="font-semibold text-sm">720p HD</p>
                      <p className="text-xs text-muted-foreground">Best quality</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGrokFieldUpdate('resolution', '480p')}
                      className={`p-3 rounded text-left terminal-border transition-all ${
                        grokFormData.resolution === '480p'
                          ? 'bg-primary/20 border-primary'
                          : 'bg-card/30 hover:bg-card/50'
                      }`}
                    >
                      <p className="font-semibold text-sm">480p SD</p>
                      <p className="text-xs text-muted-foreground">Faster generation</p>
                    </button>
                  </div>
                </div>

                {/* Optional: Image URL */}
                <div className="space-y-2">
                  <Label htmlFor="grok-image" className="font-mono text-sm">
                    source_image <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="grok-image"
                    value={grokFormData.imageUrl}
                    onChange={(e) => handleGrokFieldUpdate('imageUrl', e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Provide an image URL to generate a video based on that image
                  </p>
                </div>

                {/* Quality Selection */}
                <div className="space-y-2">
                  <Label className="font-mono text-sm">quality</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {VIDEO_TIERS.map((tier) => (
                      <button
                        key={tier.quality}
                        type="button"
                        onClick={() => setQuality(tier.quality)}
                        className={`p-3 rounded text-left terminal-border transition-all ${
                          quality === tier.quality
                            ? 'bg-primary/20 border-primary'
                            : 'bg-card/30 hover:bg-card/50'
                        }`}
                      >
                        <p className="font-semibold text-sm">{tier.label}</p>
                        <p className="text-xs text-muted-foreground">{tier.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status and Generate Button - shared between both engines */}
          <Card className="terminal-border bg-card/50">
            <CardContent className="pt-6 space-y-4">
              {/* Status Messages */}
              {generationStatus === 'error' && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded terminal-border border-destructive/30">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{errorMessage}</span>
                </div>
              )}
              {generationStatus === 'rendering' && (
                <div className="space-y-2 p-3 bg-primary/10 rounded terminal-border border-primary/30">
                  <div className="flex items-center gap-2 text-primary">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-medium">
                      {engine === 'grok' ? 'Generating with Grok Imagine...' : `Rendering video... ${renderProgress}%`}
                    </span>
                  </div>
                  {engine === 'remotion' && (
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${renderProgress}%` }}
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {engine === 'grok' 
                      ? 'AI video generation may take 1-3 minutes. Please wait...'
                      : 'This may take a few minutes. You can preview the video while rendering.'}
                  </p>
                </div>
              )}
              {generationStatus === 'success' && (
                <div className="flex items-center gap-2 p-3 bg-green-500/10 text-green-500 rounded terminal-border border-green-500/30">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Video generated successfully! Download available on the right.</span>
                </div>
              )}

              {/* Generate Button */}
              <div className="flex items-center justify-between gap-4 pt-4 border-t border-border/50">
                <div className="text-sm text-muted-foreground">
                  Cost: <span className="text-primary font-semibold">{creditCost} credits</span>
                  {credits !== null && (
                    <span className="ml-2">
                      (Balance: {credits})
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Link href={`/brands/${id}`}>
                    <Button type="button" variant="ghost">
                      Cancel
                    </Button>
                  </Link>
                  <Button
                    onClick={handleGenerate}
                    variant="terminal"
                    disabled={
                      isGenerating || 
                      !canAfford ||
                      (engine === 'remotion' && (!formData.title || !formData.template)) ||
                      (engine === 'grok' && !grokFormData.prompt)
                    }
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Generate Video
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Preview */}
        <div className="space-y-6">
          <Card className="terminal-border bg-card/50">
            <CardHeader>
              <CardTitle className="font-mono text-sm flex items-center gap-2">
                <Video className="h-4 w-4 text-primary" />
                {engine === 'remotion' ? 'live_preview' : 'output'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {engine === 'remotion' && showPreview && formData.template ? (
                <VideoPreview
                  template={formData.template as 'feature' | 'product' | 'social' | 'release'}
                  duration={formData.duration}
                  title={formData.title}
                  description={formData.description}
                  features={featuresArray}
                  callToAction={formData.callToAction}
                  primaryColor={brand?.primary_color || '#6366f1'}
                  secondaryColor={brand?.secondary_color || '#8b5cf6'}
                  accentColor={brand?.accent_color || '#22c55e'}
                  brandName={brand?.name || 'Brand'}
                  style={formData.style}
                />
              ) : engine === 'grok' && !outputUrl ? (
                <div className="aspect-video bg-muted/30 rounded-lg flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Grok Imagine AI</p>
                    <p className="text-sm">Video will appear here after generation</p>
                  </div>
                </div>
              ) : !showPreview ? (
                <div className="aspect-video bg-muted/30 rounded-lg flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a template and enter a title</p>
                    <p className="text-sm">to see a live preview</p>
                  </div>
                </div>
              ) : null}

              {generationStatus === 'rendering' && (
                <div className="mt-4 p-3 bg-muted/30 rounded-lg text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                  <p className="text-sm text-muted-foreground">
                    {engine === 'grok' ? 'Generating...' : `Rendering: ${renderProgress}%`}
                  </p>
                </div>
              )}
              {generationStatus === 'success' && outputUrl && (
                <div className="mt-4 space-y-4">
                  {engine === 'grok' && (
                    <video 
                      src={outputUrl} 
                      controls 
                      className="w-full rounded-lg"
                      autoPlay
                      muted
                    />
                  )}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(outputUrl, '_blank')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download MP4
                  </Button>
                </div>
              )}
              {generationStatus === 'success' && !outputUrl && (
                <div className="mt-4 p-3 bg-muted/30 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">
                    Video created! MP4 render in progress...
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="terminal-border bg-card/50">
            <CardHeader>
              <CardTitle className="font-mono text-sm">tips</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              {engine === 'remotion' ? (
                <>
                  <p>• Your brand colors will be applied automatically</p>
                  <p>• Use short, punchy titles for better impact</p>
                  <p>• List 3-5 key features for best results</p>
                  <p>• Social teasers use square format (1:1)</p>
                </>
              ) : (
                <>
                  <p>• Be specific about visual style (cinematic, minimal, vibrant)</p>
                  <p>• Describe motion and camera movement</p>
                  <p>• Include mood and atmosphere details</p>
                  <p>• Use 9:16 for TikTok/Reels, 16:9 for YouTube</p>
                  <p>• Shorter videos (3-5s) generate faster</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Chat Assistant - only for Remotion */}
      {engine === 'remotion' && (
        <AIChatAssistant
          formFields={formFields}
          onFieldUpdate={handleFieldUpdate}
          context="This is a video creation form for AI-generated marketing videos. Help the user describe their video concept, choose a template, and fill in the details. The video will be generated with the brand's colors and style automatically applied."
          placeholder="Describe the video you want to create..."
        />
      )}
    </div>
  )
}
