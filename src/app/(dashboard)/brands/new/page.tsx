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
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewBrandPage() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [tagline, setTagline] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#ff6b00')
  const [isDefault, setIsDefault] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'You must be logged in to create a brand',
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
          description: 'You must belong to an organization to create a brand',
        })
        return
      }

      const { data: brand, error } = await supabase
        .from('brands')
        .insert({
          name,
          description: description || null,
          tagline: tagline || null,
          website_url: websiteUrl || null,
          organization_id: profile.organization_id,
          is_default: isDefault,
          brand_colors: {
            primary: primaryColor,
            secondary: '#ffffff',
            accent: primaryColor,
            background: '#000000',
          },
          social_handles: {},
        })
        .select()
        .single()

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message,
        })
        return
      }

      toast({
        title: 'Brand created',
        description: 'Your brand has been created successfully',
      })

      router.push(`/brands/${brand.id}`)
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
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/brands">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <div className="text-sm text-muted-foreground font-mono mb-1">
            <span className="text-primary">$</span> mkdir ./brands/new
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            <span className="text-primary">{'//'}</span> NEW_BRAND
          </h2>
          <p className="text-muted-foreground text-sm">
            Create a new brand for your organization
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="font-mono text-sm">BRAND_CONFIG</CardTitle>
          <CardDescription>
            <span className="text-primary">{'//'}</span> Enter brand details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Brand Name *</Label>
              <Input
                id="name"
                placeholder="My Awesome Brand"
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

            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Brand Color</Label>
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
                  placeholder="#ff6b00"
                  className="flex-1 font-mono"
                />
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

            <div className="flex justify-end space-x-4">
              <Button variant="outline" type="button" asChild>
                <Link href="/brands">./cancel</Link>
              </Button>
              <Button variant="terminal" type="submit" disabled={isLoading || !name.trim()}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                INITIALIZE
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
