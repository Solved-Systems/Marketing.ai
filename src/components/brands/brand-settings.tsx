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
import { Loader2, Trash2, Upload } from 'lucide-react'
import type { Tables } from '@/lib/database.types'

interface BrandSettingsProps {
  brand: Tables<'brands'>
}

export function BrandSettings({ brand }: BrandSettingsProps) {
  const brandColors = brand.brand_colors as { primary?: string; secondary?: string; accent?: string; background?: string } | null
  const socialHandles = brand.social_handles as { linkedin?: string; twitter?: string; instagram?: string; tiktok?: string } | null

  const [name, setName] = useState(brand.name)
  const [description, setDescription] = useState(brand.description || '')
  const [tagline, setTagline] = useState(brand.tagline || '')
  const [websiteUrl, setWebsiteUrl] = useState(brand.website_url || '')
  const [primaryColor, setPrimaryColor] = useState(brandColors?.primary || '#ff6b00')
  const [secondaryColor, setSecondaryColor] = useState(brandColors?.secondary || '#ffffff')
  const [isDefault, setIsDefault] = useState(brand.is_default)
  const [linkedin, setLinkedin] = useState(socialHandles?.linkedin || '')
  const [twitter, setTwitter] = useState(socialHandles?.twitter || '')
  const [instagram, setInstagram] = useState(socialHandles?.instagram || '')
  const [tiktok, setTiktok] = useState(socialHandles?.tiktok || '')
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await supabase
        .from('brands')
        .update({
          name,
          description: description || null,
          tagline: tagline || null,
          website_url: websiteUrl || null,
          is_default: isDefault,
          brand_colors: {
            primary: primaryColor,
            secondary: secondaryColor,
            accent: primaryColor,
            background: '#000000',
          },
          social_handles: {
            linkedin: linkedin || null,
            twitter: twitter || null,
            instagram: instagram || null,
            tiktok: tiktok || null,
          },
        })
        .eq('id', brand.id)

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message,
        })
        return
      }

      toast({
        title: 'Brand updated',
        description: 'Your brand settings have been saved',
      })

      router.refresh()
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

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this brand? This will also delete all products and content associated with it.')) {
      return
    }

    setIsDeleting(true)

    try {
      const { error } = await supabase
        .from('brands')
        .delete()
        .eq('id', brand.id)

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message,
        })
        return
      }

      toast({
        title: 'Brand deleted',
        description: 'Your brand has been deleted',
      })

      router.push('/brands')
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-sm">BRAND_IDENTITY</CardTitle>
          <CardDescription>
            <span className="text-primary">{'//'}</span> Basic brand information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Brand Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  placeholder="Your brand's catchphrase"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What does your brand represent?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website URL</Label>
              <Input
                id="website"
                type="url"
                placeholder="https://yourbrand.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex items-center space-x-3">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-16 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondaryColor">Secondary Color</Label>
                <div className="flex items-center space-x-3">
                  <Input
                    id="secondaryColor"
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-16 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="flex-1 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="rounded border-border"
              />
              <Label htmlFor="isDefault" className="text-sm">
                Set as default brand for organization
              </Label>
            </div>

            <div className="flex justify-end">
              <Button variant="terminal" type="submit" disabled={isLoading || !name.trim()}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                SAVE CHANGES
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-sm">SOCIAL_HANDLES</CardTitle>
          <CardDescription>
            <span className="text-primary">{'//'}</span> Social media accounts for this brand
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn</Label>
                <Input
                  id="linkedin"
                  placeholder="company-name"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="twitter">Twitter / X</Label>
                <Input
                  id="twitter"
                  placeholder="@handle"
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  placeholder="@handle"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tiktok">TikTok</Label>
                <Input
                  id="tiktok"
                  placeholder="@handle"
                  value={tiktok}
                  onChange={(e) => setTiktok(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="terminal" type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                SAVE SOCIAL
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="font-mono text-sm text-destructive">DANGER_ZONE</CardTitle>
          <CardDescription>
            <span className="text-destructive">{'//'}</span> Irreversible actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Delete this brand</p>
              <p className="text-sm text-muted-foreground">
                This will permanently delete the brand, all products, and content.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Trash2 className="mr-2 h-4 w-4" />
              DELETE
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
