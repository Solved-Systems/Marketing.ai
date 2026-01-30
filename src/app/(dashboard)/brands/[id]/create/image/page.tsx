'use client'

import { use, useState } from 'react'
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
import { ModelSelector } from '@/components/billing/model-selector'
import { CreditUsage } from '@/components/billing/credit-usage'
import { useCredits } from '@/hooks/use-credits'
import { getImageGenerationType, getCreditCost, type ModelQuality } from '@/lib/billing/models'
import { ArrowLeft, Image, Loader2, Sparkles, Download, AlertCircle } from 'lucide-react'

interface ImageFormData {
  prompt: string
  imageType: string
  size: string
  style: string
  includeLogo: boolean
  overlayText: string
  quality: ModelQuality
}

const formFields = [
  { name: 'prompt', label: 'Image Prompt', type: 'textarea' as const, description: 'Describe the image you want to generate' },
  { name: 'imageType', label: 'Image Type', type: 'select' as const, options: ['Social Post', 'Banner', 'Ad Creative', 'Product Shot'], description: 'Type of marketing image' },
  { name: 'size', label: 'Image Size', type: 'select' as const, options: ['1080x1080 (Square)', '1200x628 (Landscape)', '1080x1920 (Story)'], description: 'Output dimensions' },
  { name: 'style', label: 'Visual Style', type: 'select' as const, options: ['Modern', 'Minimalist', 'Bold', 'Corporate', 'Playful'], description: 'Aesthetic style' },
  { name: 'overlayText', label: 'Overlay Text', type: 'text' as const, description: 'Text to overlay on the image' },
]

const imageTypes = [
  { value: 'social', label: 'Social Post', description: 'Perfect for social media feeds' },
  { value: 'banner', label: 'Banner', description: 'Website headers and banners' },
  { value: 'ad', label: 'Ad Creative', description: 'Advertising graphics' },
  { value: 'product', label: 'Product Shot', description: 'Product-focused imagery' },
]

const sizes = [
  { value: '1024x1024', label: '1080x1080', description: 'Square - Instagram, Facebook' },
  { value: '1792x1024', label: '1200x628', description: 'Landscape - Twitter, LinkedIn' },
  { value: '1024x1792', label: '1080x1920', description: 'Story - Instagram, TikTok' },
]

export default function CreateImagePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const { remaining, used, total, periodEnd, canAfford, refetch } = useCredits()

  const [formData, setFormData] = useState<ImageFormData>({
    prompt: '',
    imageType: 'social',
    size: '1024x1024',
    style: 'Modern',
    includeLogo: true,
    overlayText: '',
    quality: 'default',
  })

  const generationType = getImageGenerationType(formData.quality)
  const creditCost = getCreditCost(generationType)
  const hasCredits = canAfford(generationType)

  const handleFieldUpdate = (fieldName: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value,
    }))
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      // Deduct credits first
      const creditResponse = await fetch('/api/billing/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: generationType,
          metadata: {
            imageType: formData.imageType,
            size: formData.size,
            style: formData.style,
          },
        }),
      })

      if (!creditResponse.ok) {
        const data = await creditResponse.json()
        throw new Error(data.error || 'Failed to deduct credits')
      }

      // Refresh credit balance
      refetch()

      // TODO: Call AI image generation API
      console.log('Generating image:', formData)
      await new Promise(resolve => setTimeout(resolve, 3000))

      // Mock generated images
      setGeneratedImages([
        'https://via.placeholder.com/512x512/ff8c00/1a1a1a?text=Generated+1',
        'https://via.placeholder.com/512x512/ff8c00/1a1a1a?text=Generated+2',
        'https://via.placeholder.com/512x512/ff8c00/1a1a1a?text=Generated+3',
        'https://via.placeholder.com/512x512/ff8c00/1a1a1a?text=Generated+4',
      ])
    } catch (err) {
      console.error('Error generating image:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate image')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl">
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
          <span className="text-primary">./brands/{id}/create/image</span>
        </div>
        <h1 className="text-3xl font-bold">Generate AI Image</h1>
        <p className="text-muted-foreground mt-2">
          Create marketing images with AI
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Form - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Image Type Selection */}
          <Card className="terminal-border bg-card/50">
            <CardHeader>
              <CardTitle className="font-mono text-sm flex items-center gap-2">
                <Image className="h-4 w-4 text-primary" />
                select_type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {imageTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleFieldUpdate('imageType', type.value)}
                    className={`p-4 rounded text-left terminal-border transition-all ${
                      formData.imageType === type.value
                        ? 'bg-primary/20 border-primary'
                        : 'bg-card/30 hover:bg-card/50'
                    }`}
                  >
                    <p className="font-semibold">{type.label}</p>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Image Details */}
          <Card className="terminal-border bg-card/50">
            <CardHeader>
              <CardTitle className="font-mono text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                image_config
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Prompt */}
              <div className="space-y-2">
                <Label htmlFor="prompt" className="font-mono text-sm">
                  prompt <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="prompt"
                  value={formData.prompt}
                  onChange={(e) => handleFieldUpdate('prompt', e.target.value)}
                  placeholder="Describe the image you want to generate... e.g., 'A modern tech workspace with floating UI elements, clean minimalist style, professional lighting'"
                  className="font-mono min-h-[120px]"
                />
                <p className="text-xs text-muted-foreground">
                  Be specific about the scene, style, colors, and mood you want.
                </p>
              </div>

              {/* Size & Style */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-mono text-sm">size</Label>
                  <Select
                    value={formData.size}
                    onValueChange={(value) => handleFieldUpdate('size', value)}
                  >
                    <SelectTrigger className="font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sizes.map((size) => (
                        <SelectItem key={size.value} value={size.value}>
                          <span>{size.label}</span>
                          <span className="text-muted-foreground text-xs ml-2">
                            {size.description}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-mono text-sm">style</Label>
                  <Select
                    value={formData.style}
                    onValueChange={(value) => handleFieldUpdate('style', value)}
                  >
                    <SelectTrigger className="font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Modern">Modern</SelectItem>
                      <SelectItem value="Minimalist">Minimalist</SelectItem>
                      <SelectItem value="Bold">Bold</SelectItem>
                      <SelectItem value="Corporate">Corporate</SelectItem>
                      <SelectItem value="Playful">Playful</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Overlay Text */}
              <div className="space-y-2">
                <Label htmlFor="overlayText" className="font-mono text-sm">
                  overlay_text <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="overlayText"
                  value={formData.overlayText}
                  onChange={(e) => handleFieldUpdate('overlayText', e.target.value)}
                  placeholder="Text to add to the image"
                  className="font-mono"
                />
              </div>

              {/* Generate Button */}
              <div className="flex items-center justify-end gap-4 pt-4 border-t border-border/50">
                <Link href={`/brands/${id}`}>
                  <Button type="button" variant="ghost">
                    Cancel
                  </Button>
                </Link>
                <Button
                  onClick={handleGenerate}
                  variant="terminal"
                  disabled={isGenerating || !formData.prompt || !hasCredits}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : !hasCredits ? (
                    'Insufficient Credits'
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate ({creditCost} credits)
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Generated Images */}
          {generatedImages.length > 0 && (
            <Card className="terminal-border bg-card/50">
              <CardHeader>
                <CardTitle className="font-mono text-sm">generated_images</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {generatedImages.map((url, i) => (
                    <div
                      key={i}
                      className="relative group rounded overflow-hidden terminal-border"
                    >
                      <img
                        src={url}
                        alt={`Generated ${i + 1}`}
                        className="w-full aspect-square object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button variant="terminal" size="sm">
                          <Download className="h-4 w-4" />
                          Save
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-6">
          {/* Credit Balance */}
          <CreditUsage
            remaining={remaining}
            used={used}
            total={total}
            periodEnd={periodEnd}
          />

          {/* Model Quality Selector */}
          <Card className="terminal-border bg-card/50">
            <CardHeader>
              <CardTitle className="font-mono text-sm">model_quality</CardTitle>
            </CardHeader>
            <CardContent>
              <ModelSelector
                type="image"
                value={formData.quality}
                onChange={(quality) => handleFieldUpdate('quality', quality)}
                creditsRemaining={remaining}
                disabled={isGenerating}
              />
            </CardContent>
          </Card>

          {/* No Credits Warning */}
          {!hasCredits && remaining > 0 && (
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <p className="text-sm text-yellow-400">
                Not enough credits for selected quality. Try a lower tier.
              </p>
            </div>
          )}

          {remaining === 0 && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
              <p className="text-sm text-destructive mb-2">
                You&apos;ve used all your credits for this period.
              </p>
              <Link href="/settings/billing">
                <Button variant="outline" size="sm" className="w-full">
                  Upgrade Plan
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* AI Chat Assistant */}
      <AIChatAssistant
        formFields={formFields}
        onFieldUpdate={handleFieldUpdate}
        context="This is an AI image generation form for marketing graphics. Help the user describe the image they want, choose appropriate type and size, and craft an effective prompt. Brand colors and style will be automatically applied."
        placeholder="Describe the image you want to create..."
      />
    </div>
  )
}
