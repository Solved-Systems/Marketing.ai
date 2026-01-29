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
import { ArrowLeft, Image, Loader2, Sparkles, Download } from 'lucide-react'

interface ImageFormData {
  prompt: string
  imageType: string
  size: string
  style: string
  includeLogo: boolean
  overlayText: string
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
  const [formData, setFormData] = useState<ImageFormData>({
    prompt: '',
    imageType: 'social',
    size: '1024x1024',
    style: 'Modern',
    includeLogo: true,
    overlayText: '',
  })

  const handleFieldUpdate = (fieldName: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value,
    }))
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
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
    } catch (error) {
      console.error('Error generating image:', error)
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

      <div className="space-y-6">
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
                disabled={isGenerating || !formData.prompt}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Images
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
