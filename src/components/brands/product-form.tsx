'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Plus, Trash2, Zap, Shield, Sparkles, Star, Rocket, Heart, Globe, Lock, Check } from 'lucide-react'
import type { Tables } from '@/lib/database.types'

const ICONS = [
  { value: 'zap', label: 'Zap', icon: Zap },
  { value: 'shield', label: 'Shield', icon: Shield },
  { value: 'sparkles', label: 'Sparkles', icon: Sparkles },
  { value: 'star', label: 'Star', icon: Star },
  { value: 'rocket', label: 'Rocket', icon: Rocket },
  { value: 'heart', label: 'Heart', icon: Heart },
  { value: 'globe', label: 'Globe', icon: Globe },
  { value: 'lock', label: 'Lock', icon: Lock },
  { value: 'check', label: 'Check', icon: Check },
]

interface Feature {
  icon: string
  title: string
  description: string
}

interface ProductFormProps {
  brandId: string
  product?: Tables<'products'>
  onSuccess?: () => void
}

export function ProductForm({ brandId, product, onSuccess }: ProductFormProps) {
  const existingFeatures = product?.features as Feature[] | null

  const [name, setName] = useState(product?.name || '')
  const [description, setDescription] = useState(product?.description || '')
  const [tagline, setTagline] = useState(product?.tagline || '')
  const [category, setCategory] = useState(product?.category || '')
  const [pricing, setPricing] = useState(product?.pricing || '')
  const [features, setFeatures] = useState<Feature[]>(existingFeatures || [])
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const addFeature = () => {
    setFeatures([...features, { icon: 'zap', title: '', description: '' }])
  }

  const removeFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index))
  }

  const updateFeature = (index: number, field: keyof Feature, value: string) => {
    const updated = [...features]
    updated[index] = { ...updated[index], [field]: value }
    setFeatures(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const productData = {
        brand_id: brandId,
        name,
        description: description || null,
        tagline: tagline || null,
        category: category || null,
        pricing: pricing || null,
        features: features.filter(f => f.title.trim()),
        product_images: [],
      }

      if (product) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', product.id)

        if (error) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: error.message,
          })
          return
        }

        toast({
          title: 'Product updated',
          description: 'Your product has been updated successfully',
        })
      } else {
        const { error } = await supabase
          .from('products')
          .insert(productData)

        if (error) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: error.message,
          })
          return
        }

        toast({
          title: 'Product created',
          description: 'Your product has been created successfully',
        })
      }

      onSuccess?.()
      router.refresh()
      if (!product) {
        router.push(`/brands/${brandId}`)
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-sm">PRODUCT_CONFIG</CardTitle>
        <CardDescription>
          <span className="text-primary">{'//'}</span> {product ? 'Edit product details' : 'Enter product details'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                placeholder="AI Video Generator"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                placeholder="Software, Service, etc."
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              placeholder="Product's catchphrase"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What does this product do?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pricing">Pricing</Label>
            <Input
              id="pricing"
              placeholder="$99/month, Free, Contact for pricing, etc."
              value={pricing}
              onChange={(e) => setPricing(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Features</Label>
              <Button type="button" variant="outline" size="sm" onClick={addFeature}>
                <Plus className="mr-2 h-4 w-4" />
                Add Feature
              </Button>
            </div>

            {features.map((feature, index) => (
              <Card key={index} className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Feature {index + 1}</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeFeature(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor={`feature-icon-${index}`}>Icon</Label>
                      <select
                        id={`feature-icon-${index}`}
                        value={feature.icon}
                        onChange={(e) => updateFeature(index, 'icon', e.target.value)}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {ICONS.map((icon) => (
                          <option key={icon.value} value={icon.value}>
                            {icon.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor={`feature-title-${index}`}>Title</Label>
                      <Input
                        id={`feature-title-${index}`}
                        placeholder="Feature title"
                        value={feature.title}
                        onChange={(e) => updateFeature(index, 'title', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`feature-desc-${index}`}>Description</Label>
                    <Input
                      id={`feature-desc-${index}`}
                      placeholder="Brief description of this feature"
                      value={feature.description}
                      onChange={(e) => updateFeature(index, 'description', e.target.value)}
                    />
                  </div>
                </div>
              </Card>
            ))}

            {features.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No features added yet. Click "Add Feature" to describe your product's features.
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-4">
            <Button variant="outline" type="button" onClick={() => router.back()}>
              ./cancel
            </Button>
            <Button variant="terminal" type="submit" disabled={isLoading || !name.trim()}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {product ? 'SAVE CHANGES' : 'CREATE'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
