'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Sparkles, Image as ImageIcon, Check, RefreshCw, Download } from 'lucide-react'
import type { Tables, Json } from '@/lib/database.types'

interface ImageGeneratorProps {
  brand: Tables<'brands'>
  products: Tables<'products'>[]
  selectedProductId?: string
}

interface GeneratedImages {
  images: string[]
  enhancedPrompt: string
  size: string
  style: string
  imageType: string
}

const IMAGE_TYPES = [
  { value: 'social', label: 'Social Post', description: 'Square format for social media' },
  { value: 'banner', label: 'Banner', description: 'Wide format for headers' },
  { value: 'ad', label: 'Ad Creative', description: 'Marketing advertisement' },
  { value: 'product', label: 'Product Shot', description: 'Product showcase' },
]

const IMAGE_SIZES = [
  { value: '1024x1024', label: '1:1 (1024x1024)', description: 'Square - Instagram, Facebook' },
  { value: '1792x1024', label: '16:9 (1792x1024)', description: 'Landscape - Twitter, LinkedIn' },
  { value: '1024x1792', label: '9:16 (1024x1792)', description: 'Portrait - Stories, Reels' },
]

const STYLES = [
  { value: 'modern', label: 'Modern', description: 'Clean, contemporary design' },
  { value: 'minimalist', label: 'Minimalist', description: 'Simple and elegant' },
  { value: 'bold', label: 'Bold', description: 'Vibrant and impactful' },
  { value: 'corporate', label: 'Corporate', description: 'Professional business style' },
]

export function ImageGenerator({ brand, products, selectedProductId }: ImageGeneratorProps) {
  const [prompt, setPrompt] = useState('')
  const [productId, setProductId] = useState(selectedProductId || '')
  const [imageType, setImageType] = useState('social')
  const [size, setSize] = useState('1024x1024')
  const [style, setStyle] = useState('modern')
  const [includeLogo, setIncludeLogo] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<GeneratedImages | null>(null)
  const [selectedImage, setSelectedImage] = useState<number | null>(null)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter a prompt',
      })
      return
    }

    setIsGenerating(true)
    setGeneratedImages(null)
    setSelectedImage(null)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          prompt,
          brandId: brand.id,
          productId: productId || undefined,
          imageType,
          size,
          style,
          includeLogo,
          count: 4,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate images')
      }

      setGeneratedImages(result.data)
      setSelectedImage(0) // Select first image by default

      toast({
        title: 'Images generated',
        description: `Generated ${result.data.images.length} image(s)`,
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate images',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveDraft = async () => {
    if (!generatedImages || selectedImage === null) return

    setIsSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'You must be logged in',
        })
        return
      }

      const { data: profile } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (!profile?.organization_id) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Organization not found',
        })
        return
      }

      const { error } = await supabase
        .from('content_drafts')
        .insert({
          organization_id: profile.organization_id,
          brand_id: brand.id,
          product_id: productId || null,
          content_type: 'image',
          title: `Generated ${imageType} image`,
          content: {
            imageUrl: generatedImages.images[selectedImage],
            allImages: generatedImages.images,
            enhancedPrompt: generatedImages.enhancedPrompt,
            size: generatedImages.size,
            style: generatedImages.style,
            imageType: generatedImages.imageType,
          } as unknown as Json,
          ai_prompt: prompt,
          status: 'draft',
          created_by: user.id,
        })

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message,
        })
        return
      }

      toast({
        title: 'Draft saved',
        description: 'Image saved as draft',
      })

      router.push(`/brands/${brand.id}`)
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDownload = async (imageUrl: string, index: number) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${brand.name}-${imageType}-${index + 1}.png`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to download image',
      })
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-sm">AI_IMAGE_CONFIG</CardTitle>
          <CardDescription>
            <span className="text-primary">{'//'}</span> Describe your image and let AI create it
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="product">Product (optional)</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger id="product">
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No product</SelectItem>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageType">Image Type</Label>
              <Select value={imageType} onValueChange={setImageType}>
                <SelectTrigger id="imageType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMAGE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="size">Size</Label>
              <Select value={size} onValueChange={setSize}>
                <SelectTrigger id="size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMAGE_SIZES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="style">Style</Label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger id="style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STYLES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt">AI Prompt *</Label>
            <Textarea
              id="prompt"
              placeholder="Describe what you want in your image. E.g., 'Marketing graphic showing AI automation concept with futuristic elements'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="includeLogo"
              checked={includeLogo}
              onChange={(e) => setIncludeLogo(e.target.checked)}
              className="rounded border-border"
            />
            <Label htmlFor="includeLogo" className="text-sm">
              Include brand colors in generation
            </Label>
          </div>

          <div className="flex items-center space-x-4">
            <Button
              variant="terminal"
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
            >
              {isGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {isGenerating ? 'GENERATING...' : 'GENERATE (4 images)'}
            </Button>
            {generatedImages && (
              <Button
                variant="outline"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {generatedImages && generatedImages.images.length > 0 && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="font-mono text-sm flex items-center">
              <Check className="mr-2 h-4 w-4 text-green-500" />
              GENERATED_IMAGES
            </CardTitle>
            <CardDescription>
              <span className="text-primary">{'//'}</span> Click to select, then save or download
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {generatedImages.images.map((imageUrl, index) => (
                <div
                  key={index}
                  className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                    selectedImage === index
                      ? 'border-primary shadow-[0_0_10px_hsl(var(--primary)/0.3)]'
                      : 'border-transparent hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedImage(index)}
                >
                  <img
                    src={imageUrl}
                    alt={`Generated image ${index + 1}`}
                    className="w-full aspect-square object-cover"
                  />
                  {selectedImage === index && (
                    <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute bottom-2 right-2 h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDownload(imageUrl, index)
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end space-x-4">
              <Button
                variant="terminal"
                onClick={handleSaveDraft}
                disabled={isSaving || selectedImage === null}
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ImageIcon className="mr-2 h-4 w-4" />
                )}
                SAVE SELECTED
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
