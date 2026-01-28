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
import { Loader2, Sparkles, PenSquare, Check, RefreshCw, Copy, Calendar } from 'lucide-react'
import type { Tables, Json } from '@/lib/database.types'

interface PostGeneratorProps {
  brand: Tables<'brands'>
  products: Tables<'products'>[]
  selectedProductId?: string
}

interface GeneratedPost {
  posts: {
    platform: string
    text: string
    hashtags: string[]
    characterCount: number
  }[]
}

const PLATFORMS = [
  { value: 'linkedin', label: 'LinkedIn', maxChars: 3000 },
  { value: 'twitter', label: 'Twitter / X', maxChars: 280 },
  { value: 'instagram', label: 'Instagram', maxChars: 2200 },
  { value: 'tiktok', label: 'TikTok', maxChars: 2200 },
]

const TONES = [
  { value: 'professional', label: 'Professional', description: 'Formal and business-oriented' },
  { value: 'casual', label: 'Casual', description: 'Friendly and conversational' },
  { value: 'enthusiastic', label: 'Enthusiastic', description: 'Energetic and excited' },
  { value: 'informative', label: 'Informative', description: 'Educational and helpful' },
]

export function PostGenerator({ brand, products, selectedProductId }: PostGeneratorProps) {
  const [prompt, setPrompt] = useState('')
  const [productId, setProductId] = useState(selectedProductId || '')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['linkedin', 'twitter'])
  const [tone, setTone] = useState('professional')
  const [includeHashtags, setIncludeHashtags] = useState(true)
  const [includeEmoji, setIncludeEmoji] = useState(true)
  const [includeCta, setIncludeCta] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [generatedPosts, setGeneratedPosts] = useState<GeneratedPost | null>(null)
  const [scheduledFor, setScheduledFor] = useState<string>('')
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    )
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter a prompt',
      })
      return
    }

    if (selectedPlatforms.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select at least one platform',
      })
      return
    }

    setIsGenerating(true)
    setGeneratedPosts(null)

    try {
      // Build the prompt for post generation
      const platformLimits = selectedPlatforms.map(p => {
        const platform = PLATFORMS.find(pl => pl.value === p)
        return `${platform?.label} (max ${platform?.maxChars} characters)`
      }).join(', ')

      const selectedProduct = products.find(p => p.id === productId)
      const features = selectedProduct?.features as Array<{ title?: string; description?: string }> | null
      const brandColors = brand.brand_colors as { primary?: string } | null

      const systemPrompt = `You are a social media content writer for ${brand.name}${brand.tagline ? ` - "${brand.tagline}"` : ''}.

Brand context:
- Name: ${brand.name}
- Tagline: ${brand.tagline || 'N/A'}
- Description: ${brand.description || 'N/A'}
- Primary Color: ${brandColors?.primary || '#ff6b00'}
${selectedProduct ? `
Product context:
- Product: ${selectedProduct.name}
- Description: ${selectedProduct.description || 'N/A'}
- Features: ${features?.map(f => f.title).join(', ') || 'N/A'}
` : ''}

Generate social media posts for these platforms: ${platformLimits}

Requirements:
- Tone: ${tone}
- Include hashtags: ${includeHashtags ? 'Yes (3-5 relevant hashtags)' : 'No'}
- Include emoji: ${includeEmoji ? 'Yes (appropriately placed)' : 'No'}
- Include CTA: ${includeCta ? 'Yes (clear call-to-action)' : 'No'}

Respond with a JSON object containing:
{
  "posts": [
    {
      "platform": "platform_name",
      "text": "post content",
      "hashtags": ["hashtag1", "hashtag2"],
      "characterCount": number
    }
  ]
}

Make content engaging and platform-appropriate. Respect character limits.`

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          prompt: `Generate posts for: ${prompt}\n\nPlatforms: ${selectedPlatforms.join(', ')}\n\nRespond only with the JSON object.`,
          brandId: brand.id,
          productId: productId || undefined,
          contentType: 'post',
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate posts')
      }

      // The AI response should contain posts array
      const postsData = result.data.posts || result.data.inputProps?.posts || []

      setGeneratedPosts({ posts: postsData })

      toast({
        title: 'Posts generated',
        description: `Generated ${postsData.length} post(s)`,
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate posts',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveDraft = async (status: 'draft' | 'scheduled' = 'draft') => {
    if (!generatedPosts) return

    if (status === 'scheduled' && !scheduledFor) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select a date and time for scheduling',
      })
      return
    }

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
          content_type: 'post',
          title: `Social post: ${prompt.substring(0, 50)}...`,
          content: {
            posts: generatedPosts.posts,
            platforms: selectedPlatforms,
            tone,
            options: { includeHashtags, includeEmoji, includeCta },
          } as unknown as Json,
          ai_prompt: prompt,
          status,
          scheduled_for: status === 'scheduled' ? scheduledFor : null,
          platforms: selectedPlatforms as unknown as Json,
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
        title: status === 'scheduled' ? 'Post scheduled' : 'Draft saved',
        description: status === 'scheduled'
          ? `Post scheduled for ${new Date(scheduledFor).toLocaleString()}`
          : 'Post saved as draft',
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copied',
      description: 'Post copied to clipboard',
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-sm">AI_POST_CONFIG</CardTitle>
          <CardDescription>
            <span className="text-primary">{'//'}</span> Describe your post and let AI write it
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
              <Label htmlFor="tone">Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger id="tone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Platforms</Label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((platform) => (
                <Button
                  key={platform.value}
                  type="button"
                  variant={selectedPlatforms.includes(platform.value) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => togglePlatform(platform.value)}
                >
                  {platform.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt">AI Prompt *</Label>
            <Textarea
              id="prompt"
              placeholder="What should the post be about? E.g., 'Announce our new AI features, emphasize ease of use and time savings'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="includeHashtags"
                checked={includeHashtags}
                onChange={(e) => setIncludeHashtags(e.target.checked)}
                className="rounded border-border"
              />
              <Label htmlFor="includeHashtags" className="text-sm">Hashtags</Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="includeEmoji"
                checked={includeEmoji}
                onChange={(e) => setIncludeEmoji(e.target.checked)}
                className="rounded border-border"
              />
              <Label htmlFor="includeEmoji" className="text-sm">Emoji</Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="includeCta"
                checked={includeCta}
                onChange={(e) => setIncludeCta(e.target.checked)}
                className="rounded border-border"
              />
              <Label htmlFor="includeCta" className="text-sm">Call-to-Action</Label>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button
              variant="terminal"
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim() || selectedPlatforms.length === 0}
            >
              {isGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {isGenerating ? 'GENERATING...' : 'GENERATE'}
            </Button>
            {generatedPosts && (
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

      {generatedPosts && generatedPosts.posts.length > 0 && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="font-mono text-sm flex items-center">
              <Check className="mr-2 h-4 w-4 text-green-500" />
              GENERATED_POSTS
            </CardTitle>
            <CardDescription>
              <span className="text-primary">{'//'}</span> Review, copy, or schedule your posts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              {generatedPosts.posts.map((post, index) => {
                const platform = PLATFORMS.find(p => p.value === post.platform)
                return (
                  <Card key={index}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-mono">
                          {platform?.label || post.platform}
                        </CardTitle>
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs ${post.characterCount > (platform?.maxChars || 0) ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {post.characterCount} / {platform?.maxChars}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => copyToClipboard(post.text)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap text-sm">{post.text}</p>
                      {post.hashtags && post.hashtags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {post.hashtags.map((tag, i) => (
                            <span key={i} className="text-xs text-primary">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Label htmlFor="scheduledFor" className="text-sm">Schedule for (optional)</Label>
                <input
                  type="datetime-local"
                  id="scheduledFor"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  className="w-full mt-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-4">
              <Button
                variant="outline"
                onClick={() => handleSaveDraft('draft')}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <PenSquare className="mr-2 h-4 w-4" />
                )}
                SAVE DRAFT
              </Button>
              <Button
                variant="terminal"
                onClick={() => handleSaveDraft('scheduled')}
                disabled={isSaving || !scheduledFor}
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Calendar className="mr-2 h-4 w-4" />
                )}
                SCHEDULE
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
