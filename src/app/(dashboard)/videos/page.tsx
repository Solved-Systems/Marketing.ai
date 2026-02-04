'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Video, Play, Plus, Palette, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Brand {
  id: string
  name: string
  tagline: string | null
  logo_url: string | null
  primary_color: string
}

export default function ContentPage() {
  const router = useRouter()
  const [brands, setBrands] = useState<Brand[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchBrands() {
      try {
        const response = await fetch('/api/brands')
        if (response.ok) {
          const data = await response.json()
          setBrands(data)
        }
      } catch (error) {
        console.error('Error fetching brands:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchBrands()
  }, [])

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono mb-2">
          <span>$</span>
          <span className="text-primary">./content</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Content Library</h1>
            <p className="text-muted-foreground mt-2 text-sm md:text-base">
              All your AI-generated content in one place
            </p>
          </div>
        </div>
      </div>

      {/* Brand Selector - Create Content */}
      <Card className="terminal-border bg-card/50 mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-mono text-sm">
            <Plus className="h-4 w-4 text-primary" />
            create_content
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Select a brand to start creating content
          </p>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : brands.length === 0 ? (
            <div className="text-center py-8">
              <Palette className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No brands yet</p>
              <Link href="/brands/new">
                <Button variant="terminal">
                  <Plus className="h-4 w-4" />
                  Create your first brand
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {brands.map((brand) => (
                <button
                  key={brand.id}
                  onClick={() => router.push(`/brands/${brand.id}/create/video`)}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded bg-primary/20 flex items-center justify-center flex-shrink-0">
                    {brand.logo_url ? (
                      <img
                        src={brand.logo_url}
                        alt={brand.name}
                        className="w-8 h-8 rounded object-cover"
                      />
                    ) : (
                      <Palette className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{brand.name}</p>
                    {brand.tagline && (
                      <p className="text-xs text-muted-foreground truncate">{brand.tagline}</p>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Library */}
      <Card className="terminal-border bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-mono text-sm">
            <Video className="h-4 w-4 text-primary" />
            content_library
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
              <Play className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-mono text-lg mb-2">No content yet</h3>
            <p className="text-muted-foreground text-sm max-w-md">
              Select a brand above to start creating AI-generated videos, images, and posts.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
