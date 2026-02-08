'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2, MessageSquare, Palette, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Brand {
  id: string
  name: string
  tagline: string | null
  logo_url: string | null
}

export default function ChatHubPage() {
  const router = useRouter()
  const [brands, setBrands] = useState<Brand[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchBrands() {
      try {
        const response = await fetch('/api/brands')
        if (!response.ok) return
        const data = (await response.json()) as Brand[]
        setBrands(data)
      } catch (error) {
        console.error('Error fetching brands:', error)
      } finally {
        setIsLoading(false)
      }
    }

    void fetchBrands()
  }, [])

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <div className="mb-2 flex items-center gap-2 font-mono text-sm text-muted-foreground">
          <span>$</span>
          <span className="text-primary">./chat</span>
        </div>
        <h1 className="text-2xl font-bold md:text-3xl">Chat Workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground md:text-base">
          Start a repo-aware content chat for any brand.
        </p>
      </div>

      <Card className="terminal-border bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-mono text-sm">
            <MessageSquare className="h-4 w-4 text-primary" />
            start_chat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Pick a brand to open chat, pull repo context, and generate image/post workflows.
          </p>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : brands.length === 0 ? (
            <div className="py-8 text-center">
              <Palette className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="mb-4 text-muted-foreground">No brands yet</p>
              <Link href="/brands/new">
                <Button variant="terminal">
                  <Plus className="h-4 w-4" />
                  Create your first brand
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {brands.map((brand) => (
                <button
                  key={brand.id}
                  onClick={() => router.push(`/brands/${brand.id}/chat`)}
                  className="group flex items-center gap-3 rounded-lg border border-border/50 p-3 text-left transition-all hover:border-primary/50 hover:bg-primary/5"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-primary/20">
                    {brand.logo_url ? (
                      <img
                        src={brand.logo_url}
                        alt={brand.name}
                        className="h-8 w-8 rounded object-cover"
                      />
                    ) : (
                      <Palette className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{brand.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {brand.tagline || 'Open chat and start generating.'}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
