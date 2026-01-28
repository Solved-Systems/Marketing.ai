'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Loader2, Sparkles, Video, Check, RefreshCw } from 'lucide-react'
import type { Tables, Json } from '@/lib/database.types'

interface VideoGeneratorProps {
  brand: Tables<'brands'>
  products: Tables<'products'>[]
  templates: Tables<'video_templates'>[]
  selectedProductId?: string
}

interface GeneratedContent {
  templateId: string
  inputProps: Record<string, unknown>
  reasoning: string
}

export function VideoGenerator({ brand, products, templates, selectedProductId }: VideoGeneratorProps) {
  const [prompt, setPrompt] = useState('')
  const [productId, setProductId] = useState(selectedProductId || '')
  const [templateId, setTemplateId] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null)
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
    setGeneratedContent(null)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          prompt,
          brandId: brand.id,
          productId: productId || undefined,
          templateId: templateId || undefined,
          contentType: 'video',
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate content')
      }

      setGeneratedContent(result.data)

      toast({
        title: 'Content generated',
        description: 'Review the generated video content below',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate content',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveDraft = async () => {
    if (!generatedContent) return

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

      const inputProps = generatedContent.inputProps as Record<string, unknown>
      const title = (inputProps.title as string) || (inputProps.productName as string) || (inputProps.headline as string) || 'Untitled Video'

      const { error } = await supabase
        .from('content_drafts')
        .insert({
          organization_id: profile.organization_id,
          brand_id: brand.id,
          product_id: productId || null,
          content_type: 'video',
          title,
          content: {
            templateId: generatedContent.templateId,
            inputProps: generatedContent.inputProps,
            reasoning: generatedContent.reasoning,
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
        description: 'Video content saved as draft',
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

  const selectedTemplate = templates.find(t => t.id === (generatedContent?.templateId || templateId))

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-sm">AI_VIDEO_CONFIG</CardTitle>
          <CardDescription>
            <span className="text-primary">{'//'}</span> Describe your video and let AI generate it
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
              <p className="text-xs text-muted-foreground">
                Product features will be included in the video
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template">Template (optional)</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger id="template">
                  <SelectValue placeholder="Auto-select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Auto-select</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Let AI choose the best template if unsure
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt">AI Prompt *</Label>
            <Textarea
              id="prompt"
              placeholder="Describe what you want in your video. E.g., 'Create a video announcing our new AI-powered features with a professional tone'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
            />
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
              {isGenerating ? 'GENERATING...' : 'GENERATE'}
            </Button>
            {generatedContent && (
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

      {generatedContent && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="font-mono text-sm flex items-center">
              <Check className="mr-2 h-4 w-4 text-green-500" />
              GENERATED_CONTENT
            </CardTitle>
            <CardDescription>
              <span className="text-primary">{'//'}</span> Review and save your video content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="text-xs text-muted-foreground">Template</Label>
                <p className="font-mono">{selectedTemplate?.name || generatedContent.templateId}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Reasoning</Label>
                <p className="text-sm text-muted-foreground">{generatedContent.reasoning}</p>
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Generated Props</Label>
              <pre className="mt-2 p-4 bg-muted/50 rounded-md overflow-auto text-xs font-mono">
                {JSON.stringify(generatedContent.inputProps, null, 2)}
              </pre>
            </div>

            <div className="flex items-center justify-end space-x-4">
              <Button
                variant="terminal"
                onClick={handleSaveDraft}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Video className="mr-2 h-4 w-4" />
                )}
                SAVE DRAFT
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
