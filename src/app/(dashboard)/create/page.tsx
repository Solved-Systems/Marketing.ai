'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Sparkles,
  Loader2,
  Palette,
  Plus,
  ChevronRight,
} from 'lucide-react'

interface Brand {
  id: string
  name: string
  tagline: string | null
  logo_url: string | null
  primary_color: string
}

export default function CreatePage() {
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

  const handleBrandSelect = (brandId: string) => {
    router.push(`/brands/${brandId}/create`)
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono mb-2">
          <span>$</span>
          <span className="text-primary">./create</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold">Create Content</h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          Select a brand to start creating AI-powered content
        </p>
      </div>

      {isLoading ? (
        <Card className="terminal-border bg-card/50">
          <CardContent className="py-16 text-center">
            <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading brands...</p>
          </CardContent>
        </Card>
      ) : brands.length === 0 ? (
        <Card className="terminal-border bg-card/50">
          <CardContent className="py-16 text-center">
            <Palette className="h-16 w-16 text-primary/50 mx-auto mb-6" />
            <h2 className="text-xl font-semibold mb-2">No brands yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Create your first brand to start generating content.
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {brands.map((brand) => (
            <button
              key={brand.id}
              onClick={() => handleBrandSelect(brand.id)}
              className="text-left"
            >
              <Card className="terminal-border bg-card/50 hover:bg-card/70 hover:border-primary/50 transition-all cursor-pointer group h-full">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    {brand.logo_url ? (
                      <img
                        src={brand.logo_url}
                        alt={brand.name}
                        className="w-12 h-12 rounded-lg object-contain bg-muted"
                        onError={(e) => {
                          // Fallback to letter on error
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          target.nextElementSibling?.classList.remove('hidden')
                        }}
                      />
                    ) : null}
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center ${brand.logo_url ? 'hidden' : ''}`}
                      style={{ backgroundColor: brand.primary_color || '#ff8c00' }}
                    >
                      <span className="text-white font-bold text-lg">
                        {brand.name[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{brand.name}</h3>
                      {brand.tagline && (
                        <p className="text-sm text-muted-foreground truncate">{brand.tagline}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border/50">
                    <div className="flex items-center gap-2 text-primary">
                      <Sparkles className="h-4 w-4" />
                      <span className="text-sm font-medium">Open Studio</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
