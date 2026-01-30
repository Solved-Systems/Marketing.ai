'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Palette, Video, Image, MessageSquare, ArrowRight, Loader2 } from 'lucide-react'

interface Brand {
  id: string
  name: string
  tagline: string | null
  logo_url: string | null
  primary_color: string
  is_default?: boolean
}

export default function BrandsPage() {
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono mb-2">
            <span>$</span>
            <span className="text-primary">./brands</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">Brands</h1>
          <p className="text-muted-foreground mt-1 md:mt-2 text-sm md:text-base">
            Manage your brands and create content
          </p>
        </div>
        <Link href="/brands/new" className="self-start sm:self-auto">
          <Button variant="terminal" className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            New Brand
          </Button>
        </Link>
      </div>

      {isLoading ? (
        /* Loading State */
        <Card className="terminal-border bg-card/50">
          <CardContent className="py-16 text-center">
            <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading brands...</p>
          </CardContent>
        </Card>
      ) : brands.length === 0 ? (
        /* Empty State */
        <Card className="terminal-border bg-card/50">
          <CardContent className="py-16 text-center">
            <Palette className="h-16 w-16 text-primary/50 mx-auto mb-6" />
            <h2 className="text-xl font-semibold mb-2">No brands yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Create your first brand to start generating AI-powered marketing content.
            </p>
            <Link href="/brands/new">
              <Button variant="terminal">
                <Plus className="h-4 w-4" />
                Create Brand
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        /* Brands Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {brands.map((brand) => (
            <BrandCard key={brand.id} brand={brand} />
          ))}
        </div>
      )}
    </div>
  )
}

function BrandCard({ brand }: { brand: Brand }) {
  return (
    <Link href={`/brands/${brand.id}`}>
      <Card className="terminal-border bg-card/50 hover:bg-card/70 active:bg-card/70 transition-all cursor-pointer group h-full">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded bg-primary/20 flex items-center justify-center">
              {brand.logo_url ? (
                <img
                  src={brand.logo_url}
                  alt={brand.name}
                  className="w-10 h-10 rounded object-cover"
                />
              ) : (
                <Palette className="h-6 w-6 text-primary" />
              )}
            </div>
            {brand.is_default && (
              <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                Default
              </Badge>
            )}
          </div>

          <h3 className="font-semibold text-lg mb-1">{brand.name}</h3>
          {brand.tagline && (
            <p className="text-sm text-muted-foreground mb-4">{brand.tagline}</p>
          )}

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Video className="h-3 w-3" />0 videos
            </span>
            <span className="flex items-center gap-1">
              <Image className="h-3 w-3" />0 images
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />0 posts
            </span>
          </div>

          <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">0 products</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
