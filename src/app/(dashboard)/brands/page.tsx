'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Palette, Video, Image, MessageSquare, ArrowRight } from 'lucide-react'

export default function BrandsPage() {
  // TODO: Fetch brands from API/database
  const brands: any[] = []

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono mb-2">
            <span>$</span>
            <span className="text-primary">./brands</span>
          </div>
          <h1 className="text-3xl font-bold">Brands</h1>
          <p className="text-muted-foreground mt-2">
            Manage your brands and create content
          </p>
        </div>
        <Link href="/brands/new">
          <Button variant="terminal">
            <Plus className="h-4 w-4" />
            New Brand
          </Button>
        </Link>
      </div>

      {brands.length === 0 ? (
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
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {brands.map((brand) => (
            <BrandCard key={brand.id} brand={brand} />
          ))}
        </div>
      )}
    </div>
  )
}

function BrandCard({ brand }: { brand: any }) {
  return (
    <Link href={`/brands/${brand.id}`}>
      <Card className="terminal-border bg-card/50 hover:bg-card/70 transition-all cursor-pointer group h-full">
        <CardContent className="p-6">
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
