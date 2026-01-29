'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Trash2, Plus, X, Building2, Package, Users, MessageSquare, Palette, FileText, Target } from 'lucide-react'
import type { Tables } from '@/lib/database.types'
import type {
  BrandIdentity,
  TargetAudience,
  VoiceAndTone,
  VisualStyle,
  ContentGuidelines,
  CompetitiveContext,
  Persona,
  Competitor,
  defaultBrandIdentity,
  defaultTargetAudience,
  defaultVoiceAndTone,
  defaultVisualStyle,
  defaultContentGuidelines,
  defaultCompetitiveContext,
} from '@/lib/style-guide.types'
import {
  voiceAttributeOptions,
  writingStyleOptions,
  imageStyleOptions,
  moodKeywordOptions,
  contentTypeOptions,
  companySizeOptions,
} from '@/lib/style-guide.types'

interface StyleGuideFormProps {
  mode: 'create' | 'edit'
  styleGuide?: Tables<'style_guides'>
  initialType: 'company' | 'product'
  initialProductId?: string
  products: Array<{
    id: string
    name: string
    brand_id: string
    brands: { name: string } | null
  }>
  hasCompanyGuide: boolean
}

export function StyleGuideForm({
  mode,
  styleGuide,
  initialType,
  initialProductId,
  products,
  hasCompanyGuide,
}: StyleGuideFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  // Basic info
  const [name, setName] = useState(styleGuide?.name || '')
  const [description, setDescription] = useState(styleGuide?.description || '')
  const [guideType, setGuideType] = useState<'company' | 'product'>(initialType)
  const [productId, setProductId] = useState(initialProductId || styleGuide?.product_id || '')
  const [isDefault, setIsDefault] = useState(styleGuide?.is_default ?? !hasCompanyGuide)
  const [inheritFromCompany, setInheritFromCompany] = useState(styleGuide?.inherit_from_company ?? true)

  // JSONB fields
  const [brandIdentity, setBrandIdentity] = useState<BrandIdentity>(
    (styleGuide?.brand_identity as BrandIdentity) || {
      mission: '',
      vision: '',
      values: [],
      tagline: '',
      elevator_pitch: '',
      brand_story: '',
    }
  )

  const [targetAudience, setTargetAudience] = useState<TargetAudience>(
    (styleGuide?.target_audience as TargetAudience) || {
      demographics: '',
      pain_points: [],
      motivations: [],
      personas: [],
      industries: [],
      company_sizes: [],
    }
  )

  const [voiceAndTone, setVoiceAndTone] = useState<VoiceAndTone>(
    (styleGuide?.voice_and_tone as VoiceAndTone) || {
      voice_attributes: [],
      tone_guidelines: '',
      dos: [],
      donts: [],
      example_phrases: [],
      writing_style: '',
    }
  )

  const [visualStyle, setVisualStyle] = useState<VisualStyle>(
    (styleGuide?.visual_style as VisualStyle) || {
      colors: {
        primary: '#000000',
        secondary: '#ffffff',
        accent: '#0066cc',
        background: '#ffffff',
        text: '#333333',
      },
      typography: {
        heading_font: '',
        body_font: '',
      },
      logo_guidelines: '',
      image_style: '',
      mood_keywords: [],
      visual_themes: [],
    }
  )

  const [contentGuidelines, setContentGuidelines] = useState<ContentGuidelines>(
    (styleGuide?.content_guidelines as ContentGuidelines) || {
      messaging_pillars: [],
      key_themes: [],
      topics_to_avoid: [],
      hashtag_strategy: '',
      content_types: [],
      call_to_actions: [],
      posting_frequency: '',
    }
  )

  const [competitiveContext, setCompetitiveContext] = useState<CompetitiveContext>(
    (styleGuide?.competitive_context as CompetitiveContext) || {
      competitors: [],
      differentiators: [],
      positioning: '',
      market_position: '',
      unique_value_proposition: '',
    }
  )

  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const data = {
        name,
        description: description || null,
        product_id: guideType === 'product' ? productId : null,
        is_default: guideType === 'company' ? isDefault : false,
        inherit_from_company: guideType === 'product' ? inheritFromCompany : false,
        brand_identity: brandIdentity,
        target_audience: targetAudience,
        voice_and_tone: voiceAndTone,
        visual_style: visualStyle,
        content_guidelines: contentGuidelines,
        competitive_context: competitiveContext,
      }

      if (mode === 'create') {
        const { data: userData } = await supabase.auth.getUser()
        const { data: userRecord } = await supabase
          .from('users')
          .select('organization_id')
          .eq('id', userData.user?.id)
          .single()

        const { error } = await supabase.from('style_guides').insert({
          ...data,
          organization_id: userRecord?.organization_id,
          created_by: userData.user?.id,
        })

        if (error) throw error

        toast({
          title: 'Style guide created',
          description: 'Your style guide has been created successfully',
        })

        router.push('/style-guides')
      } else {
        const { error } = await supabase
          .from('style_guides')
          .update(data)
          .eq('id', styleGuide!.id)

        if (error) throw error

        toast({
          title: 'Style guide updated',
          description: 'Your changes have been saved',
        })

        router.refresh()
      }
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this style guide? This action cannot be undone.')) {
      return
    }

    setIsDeleting(true)

    try {
      const { error } = await supabase
        .from('style_guides')
        .delete()
        .eq('id', styleGuide!.id)

      if (error) throw error

      toast({
        title: 'Style guide deleted',
        description: 'Your style guide has been deleted',
      })

      router.push('/style-guides')
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-sm">GUIDE_CONFIG</CardTitle>
          <CardDescription>
            <span className="text-primary">{'//'}</span> Basic style guide information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Main Brand Guide"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Guide Type</Label>
              <Select
                value={guideType}
                onValueChange={(v) => setGuideType(v as 'company' | 'product')}
                disabled={mode === 'edit'}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">
                    <div className="flex items-center">
                      <Building2 className="mr-2 h-4 w-4" />
                      Company-wide
                    </div>
                  </SelectItem>
                  <SelectItem value="product">
                    <div className="flex items-center">
                      <Package className="mr-2 h-4 w-4" />
                      Product-specific
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {guideType === 'product' && (
            <div className="space-y-2">
              <Label htmlFor="product">Product *</Label>
              <Select
                value={productId}
                onValueChange={setProductId}
                disabled={mode === 'edit'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                      {product.brands && ` (${product.brands.name})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What is this style guide for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex flex-col space-y-3">
            {guideType === 'company' && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded border-border"
                />
                <Label htmlFor="isDefault" className="text-sm">
                  Set as default company style guide
                </Label>
              </div>
            )}

            {guideType === 'product' && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="inheritFromCompany"
                  checked={inheritFromCompany}
                  onChange={(e) => setInheritFromCompany(e.target.checked)}
                  className="rounded border-border"
                />
                <Label htmlFor="inheritFromCompany" className="text-sm">
                  Inherit unset values from company guide
                </Label>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content Tabs */}
      <Tabs defaultValue="identity" className="space-y-4">
        <TabsList className="grid grid-cols-3 lg:grid-cols-6 h-auto">
          <TabsTrigger value="identity" className="flex items-center gap-1 text-xs">
            <Building2 className="h-3 w-3" />
            <span className="hidden sm:inline">Identity</span>
          </TabsTrigger>
          <TabsTrigger value="audience" className="flex items-center gap-1 text-xs">
            <Users className="h-3 w-3" />
            <span className="hidden sm:inline">Audience</span>
          </TabsTrigger>
          <TabsTrigger value="voice" className="flex items-center gap-1 text-xs">
            <MessageSquare className="h-3 w-3" />
            <span className="hidden sm:inline">Voice</span>
          </TabsTrigger>
          <TabsTrigger value="visual" className="flex items-center gap-1 text-xs">
            <Palette className="h-3 w-3" />
            <span className="hidden sm:inline">Visual</span>
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center gap-1 text-xs">
            <FileText className="h-3 w-3" />
            <span className="hidden sm:inline">Content</span>
          </TabsTrigger>
          <TabsTrigger value="competitive" className="flex items-center gap-1 text-xs">
            <Target className="h-3 w-3" />
            <span className="hidden sm:inline">Competition</span>
          </TabsTrigger>
        </TabsList>

        {/* Brand Identity Tab */}
        <TabsContent value="identity">
          <BrandIdentitySection
            value={brandIdentity}
            onChange={setBrandIdentity}
          />
        </TabsContent>

        {/* Target Audience Tab */}
        <TabsContent value="audience">
          <TargetAudienceSection
            value={targetAudience}
            onChange={setTargetAudience}
          />
        </TabsContent>

        {/* Voice & Tone Tab */}
        <TabsContent value="voice">
          <VoiceAndToneSection
            value={voiceAndTone}
            onChange={setVoiceAndTone}
          />
        </TabsContent>

        {/* Visual Style Tab */}
        <TabsContent value="visual">
          <VisualStyleSection
            value={visualStyle}
            onChange={setVisualStyle}
          />
        </TabsContent>

        {/* Content Guidelines Tab */}
        <TabsContent value="content">
          <ContentGuidelinesSection
            value={contentGuidelines}
            onChange={setContentGuidelines}
          />
        </TabsContent>

        {/* Competitive Context Tab */}
        <TabsContent value="competitive">
          <CompetitiveContextSection
            value={competitiveContext}
            onChange={setCompetitiveContext}
          />
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <div>
          {mode === 'edit' && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Trash2 className="mr-2 h-4 w-4" />
              DELETE
            </Button>
          )}
        </div>
        <Button variant="terminal" type="submit" disabled={isLoading || !name.trim()}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === 'create' ? 'CREATE GUIDE' : 'SAVE CHANGES'}
        </Button>
      </div>
    </form>
  )
}

// Helper component for array input
function ArrayInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
}) {
  const [inputValue, setInputValue] = useState('')

  const handleAdd = () => {
    if (inputValue.trim() && !value.includes(inputValue.trim())) {
      onChange([...value, inputValue.trim()])
      setInputValue('')
    }
  }

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <div className="flex space-x-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAdd()
            }
          }}
        />
        <Button type="button" variant="outline" size="icon" onClick={handleAdd}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((item, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-sm font-mono"
            >
              {item}
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="ml-2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// Brand Identity Section
function BrandIdentitySection({
  value,
  onChange,
}: {
  value: BrandIdentity
  onChange: (value: BrandIdentity) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-sm">BRAND_IDENTITY</CardTitle>
        <CardDescription>
          <span className="text-primary">{'//'}</span> Core brand positioning and values
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Mission Statement</Label>
          <Textarea
            placeholder="What is your company's purpose?"
            value={value.mission || ''}
            onChange={(e) => onChange({ ...value, mission: e.target.value })}
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label>Vision</Label>
          <Textarea
            placeholder="What future are you working towards?"
            value={value.vision || ''}
            onChange={(e) => onChange({ ...value, vision: e.target.value })}
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label>Tagline</Label>
          <Input
            placeholder="Your brand's catchphrase"
            value={value.tagline || ''}
            onChange={(e) => onChange({ ...value, tagline: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Elevator Pitch</Label>
          <Textarea
            placeholder="30-second description of what you do"
            value={value.elevator_pitch || ''}
            onChange={(e) => onChange({ ...value, elevator_pitch: e.target.value })}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>Core Values</Label>
          <ArrayInput
            value={value.values || []}
            onChange={(values) => onChange({ ...value, values })}
            placeholder="Add a value (press Enter)"
          />
        </div>

        <div className="space-y-2">
          <Label>Brand Story</Label>
          <Textarea
            placeholder="The narrative behind your brand..."
            value={value.brand_story || ''}
            onChange={(e) => onChange({ ...value, brand_story: e.target.value })}
            rows={4}
          />
        </div>
      </CardContent>
    </Card>
  )
}

// Target Audience Section
function TargetAudienceSection({
  value,
  onChange,
}: {
  value: TargetAudience
  onChange: (value: TargetAudience) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-sm">TARGET_AUDIENCE</CardTitle>
        <CardDescription>
          <span className="text-primary">{'//'}</span> Who you're creating content for
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Demographics</Label>
          <Textarea
            placeholder="Describe your target demographics (age, location, profession, etc.)"
            value={value.demographics || ''}
            onChange={(e) => onChange({ ...value, demographics: e.target.value })}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>Industries</Label>
          <ArrayInput
            value={value.industries || []}
            onChange={(industries) => onChange({ ...value, industries })}
            placeholder="Add an industry"
          />
        </div>

        <div className="space-y-2">
          <Label>Company Sizes</Label>
          <div className="flex flex-wrap gap-2">
            {companySizeOptions.map((size) => (
              <label key={size} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={(value.company_sizes || []).includes(size)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onChange({ ...value, company_sizes: [...(value.company_sizes || []), size] })
                    } else {
                      onChange({
                        ...value,
                        company_sizes: (value.company_sizes || []).filter((s) => s !== size),
                      })
                    }
                  }}
                  className="rounded border-border"
                />
                <span className="text-sm">{size}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Pain Points</Label>
          <ArrayInput
            value={value.pain_points || []}
            onChange={(pain_points) => onChange({ ...value, pain_points })}
            placeholder="What problems do they face?"
          />
        </div>

        <div className="space-y-2">
          <Label>Motivations</Label>
          <ArrayInput
            value={value.motivations || []}
            onChange={(motivations) => onChange({ ...value, motivations })}
            placeholder="What drives them?"
          />
        </div>
      </CardContent>
    </Card>
  )
}

// Voice & Tone Section
function VoiceAndToneSection({
  value,
  onChange,
}: {
  value: VoiceAndTone
  onChange: (value: VoiceAndTone) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-sm">VOICE_AND_TONE</CardTitle>
        <CardDescription>
          <span className="text-primary">{'//'}</span> How your brand communicates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Voice Attributes</Label>
          <div className="flex flex-wrap gap-2">
            {voiceAttributeOptions.map((attr) => (
              <label key={attr} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={(value.voice_attributes || []).includes(attr)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onChange({
                        ...value,
                        voice_attributes: [...(value.voice_attributes || []), attr],
                      })
                    } else {
                      onChange({
                        ...value,
                        voice_attributes: (value.voice_attributes || []).filter((a) => a !== attr),
                      })
                    }
                  }}
                  className="rounded border-border"
                />
                <span className="text-sm">{attr}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Writing Style</Label>
          <Select
            value={value.writing_style || ''}
            onValueChange={(v) => onChange({ ...value, writing_style: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a writing style" />
            </SelectTrigger>
            <SelectContent>
              {writingStyleOptions.map((style) => (
                <SelectItem key={style} value={style}>
                  {style}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Tone Guidelines</Label>
          <Textarea
            placeholder="Describe the overall tone of voice..."
            value={value.tone_guidelines || ''}
            onChange={(e) => onChange({ ...value, tone_guidelines: e.target.value })}
            rows={3}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Do's</Label>
            <ArrayInput
              value={value.dos || []}
              onChange={(dos) => onChange({ ...value, dos })}
              placeholder="Things to always do"
            />
          </div>

          <div className="space-y-2">
            <Label>Don'ts</Label>
            <ArrayInput
              value={value.donts || []}
              onChange={(donts) => onChange({ ...value, donts })}
              placeholder="Things to avoid"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Example Phrases</Label>
          <ArrayInput
            value={value.example_phrases || []}
            onChange={(example_phrases) => onChange({ ...value, example_phrases })}
            placeholder="Add an example phrase"
          />
        </div>
      </CardContent>
    </Card>
  )
}

// Visual Style Section
function VisualStyleSection({
  value,
  onChange,
}: {
  value: VisualStyle
  onChange: (value: VisualStyle) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-sm">VISUAL_STYLE</CardTitle>
        <CardDescription>
          <span className="text-primary">{'//'}</span> Visual identity and design guidelines
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label>Color Palette</Label>
          <div className="grid gap-4 md:grid-cols-3">
            {(['primary', 'secondary', 'accent', 'background', 'text'] as const).map((colorKey) => (
              <div key={colorKey} className="space-y-2">
                <Label className="text-xs capitalize">{colorKey}</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    type="color"
                    value={value.colors?.[colorKey] || '#000000'}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        colors: { ...value.colors, [colorKey]: e.target.value },
                      })
                    }
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={value.colors?.[colorKey] || ''}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        colors: { ...value.colors, [colorKey]: e.target.value },
                      })
                    }
                    className="flex-1 font-mono text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Heading Font</Label>
            <Input
              placeholder="e.g., Inter, Roboto, Arial"
              value={value.typography?.heading_font || ''}
              onChange={(e) =>
                onChange({
                  ...value,
                  typography: { ...value.typography, heading_font: e.target.value },
                })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Body Font</Label>
            <Input
              placeholder="e.g., Inter, Roboto, Arial"
              value={value.typography?.body_font || ''}
              onChange={(e) =>
                onChange({
                  ...value,
                  typography: { ...value.typography, body_font: e.target.value },
                })
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Image Style</Label>
          <Select
            value={value.image_style || ''}
            onValueChange={(v) => onChange({ ...value, image_style: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an image style" />
            </SelectTrigger>
            <SelectContent>
              {imageStyleOptions.map((style) => (
                <SelectItem key={style} value={style}>
                  {style}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Mood Keywords</Label>
          <div className="flex flex-wrap gap-2">
            {moodKeywordOptions.map((keyword) => (
              <label key={keyword} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={(value.mood_keywords || []).includes(keyword)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onChange({
                        ...value,
                        mood_keywords: [...(value.mood_keywords || []), keyword],
                      })
                    } else {
                      onChange({
                        ...value,
                        mood_keywords: (value.mood_keywords || []).filter((k) => k !== keyword),
                      })
                    }
                  }}
                  className="rounded border-border"
                />
                <span className="text-sm">{keyword}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Logo Guidelines</Label>
          <Textarea
            placeholder="Guidelines for logo usage..."
            value={value.logo_guidelines || ''}
            onChange={(e) => onChange({ ...value, logo_guidelines: e.target.value })}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>Visual Themes</Label>
          <ArrayInput
            value={value.visual_themes || []}
            onChange={(visual_themes) => onChange({ ...value, visual_themes })}
            placeholder="Add a visual theme"
          />
        </div>
      </CardContent>
    </Card>
  )
}

// Content Guidelines Section
function ContentGuidelinesSection({
  value,
  onChange,
}: {
  value: ContentGuidelines
  onChange: (value: ContentGuidelines) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-sm">CONTENT_GUIDELINES</CardTitle>
        <CardDescription>
          <span className="text-primary">{'//'}</span> What and how to create content
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Messaging Pillars</Label>
          <ArrayInput
            value={value.messaging_pillars || []}
            onChange={(messaging_pillars) => onChange({ ...value, messaging_pillars })}
            placeholder="Core messaging themes"
          />
        </div>

        <div className="space-y-2">
          <Label>Key Themes</Label>
          <ArrayInput
            value={value.key_themes || []}
            onChange={(key_themes) => onChange({ ...value, key_themes })}
            placeholder="Topics to focus on"
          />
        </div>

        <div className="space-y-2">
          <Label>Content Types</Label>
          <div className="flex flex-wrap gap-2">
            {contentTypeOptions.map((type) => (
              <label key={type} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={(value.content_types || []).includes(type)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onChange({
                        ...value,
                        content_types: [...(value.content_types || []), type],
                      })
                    } else {
                      onChange({
                        ...value,
                        content_types: (value.content_types || []).filter((t) => t !== type),
                      })
                    }
                  }}
                  className="rounded border-border"
                />
                <span className="text-sm">{type}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Topics to Avoid</Label>
          <ArrayInput
            value={value.topics_to_avoid || []}
            onChange={(topics_to_avoid) => onChange({ ...value, topics_to_avoid })}
            placeholder="Topics to stay away from"
          />
        </div>

        <div className="space-y-2">
          <Label>Call to Actions</Label>
          <ArrayInput
            value={value.call_to_actions || []}
            onChange={(call_to_actions) => onChange({ ...value, call_to_actions })}
            placeholder="Preferred CTAs"
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Hashtag Strategy</Label>
            <Textarea
              placeholder="How to use hashtags..."
              value={value.hashtag_strategy || ''}
              onChange={(e) => onChange({ ...value, hashtag_strategy: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Posting Frequency</Label>
            <Textarea
              placeholder="How often to post..."
              value={value.posting_frequency || ''}
              onChange={(e) => onChange({ ...value, posting_frequency: e.target.value })}
              rows={3}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Competitive Context Section
function CompetitiveContextSection({
  value,
  onChange,
}: {
  value: CompetitiveContext
  onChange: (value: CompetitiveContext) => void
}) {
  const addCompetitor = () => {
    onChange({
      ...value,
      competitors: [...(value.competitors || []), { name: '', website: '', strengths: [], weaknesses: [] }],
    })
  }

  const removeCompetitor = (index: number) => {
    onChange({
      ...value,
      competitors: (value.competitors || []).filter((_, i) => i !== index),
    })
  }

  const updateCompetitor = (index: number, field: keyof Competitor, fieldValue: string | string[]) => {
    const updated = [...(value.competitors || [])]
    updated[index] = { ...updated[index], [field]: fieldValue }
    onChange({ ...value, competitors: updated })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-sm">COMPETITIVE_CONTEXT</CardTitle>
        <CardDescription>
          <span className="text-primary">{'//'}</span> Market positioning and competitors
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Market Position</Label>
          <Textarea
            placeholder="Where do you stand in the market?"
            value={value.market_position || ''}
            onChange={(e) => onChange({ ...value, market_position: e.target.value })}
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label>Unique Value Proposition</Label>
          <Textarea
            placeholder="What makes you unique?"
            value={value.unique_value_proposition || ''}
            onChange={(e) => onChange({ ...value, unique_value_proposition: e.target.value })}
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label>Positioning Statement</Label>
          <Textarea
            placeholder="How you position yourself vs. competitors..."
            value={value.positioning || ''}
            onChange={(e) => onChange({ ...value, positioning: e.target.value })}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>Key Differentiators</Label>
          <ArrayInput
            value={value.differentiators || []}
            onChange={(differentiators) => onChange({ ...value, differentiators })}
            placeholder="What sets you apart?"
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Competitors</Label>
            <Button type="button" variant="outline" size="sm" onClick={addCompetitor}>
              <Plus className="h-4 w-4 mr-1" />
              Add Competitor
            </Button>
          </div>

          {(value.competitors || []).map((competitor, index) => (
            <Card key={index} className="p-4">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="grid gap-4 md:grid-cols-2 flex-1">
                    <div className="space-y-2">
                      <Label className="text-xs">Name</Label>
                      <Input
                        placeholder="Competitor name"
                        value={competitor.name}
                        onChange={(e) => updateCompetitor(index, 'name', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Website</Label>
                      <Input
                        placeholder="https://..."
                        value={competitor.website || ''}
                        onChange={(e) => updateCompetitor(index, 'website', e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCompetitor(index)}
                    className="ml-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
