'use client'

import { use, useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react'
import { ContentChat } from '@/components/content/ContentChat'
import type { Brand } from '@/types/video-creation'

export default function CreateContentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [brand, setBrand] = useState<Brand | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchBrand() {
      try {
        const response = await fetch(`/api/brands/${id}`)
        if (!response.ok) {
          if (response.status === 404) {
            setError('Brand not found')
          } else {
            throw new Error('Failed to fetch brand')
          }
          return
        }
        const data = await response.json()
        setBrand(data)
      } catch (err) {
        console.error('Error fetching brand:', err)
        setError('Failed to load brand')
      } finally {
        setIsLoading(false)
      }
    }
    fetchBrand()
  }, [id])

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !brand) {
    return (
      <div className="p-4 md:p-8">
        <Link
          href="/brands"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Brands
        </Link>
        <Card className="terminal-border bg-card/50">
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">{error || 'Brand not found'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Link
              href={`/brands/${id}`}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Link>
            <div className="flex items-center gap-3">
              {brand.logo_url ? (
                <img
                  src={brand.logo_url}
                  alt={brand.name}
                  className="w-8 h-8 rounded object-contain bg-muted"
                />
              ) : (
                <div
                  className="w-8 h-8 rounded flex items-center justify-center"
                  style={{ backgroundColor: brand.primary_color || '#ff8c00' }}
                >
                  <span className="text-white font-bold text-sm">
                    {brand.name[0].toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <h1 className="text-lg font-semibold">{brand.name}</h1>
                <p className="text-xs text-muted-foreground">Content Studio</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs font-mono text-muted-foreground">AI Powered</span>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden">
        <ContentChat brand={brand} />
      </div>
    </div>
  )
}
