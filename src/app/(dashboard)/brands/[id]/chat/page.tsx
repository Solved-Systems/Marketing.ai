'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Chat } from '@/components/chat/Chat'
import { supabase } from '@/lib/supabase/client'

interface Brand {
  id: string
  name: string
  description: string | null
  tagline: string | null
  primary_color: string | null
  secondary_color: string | null
  logo_url: string | null
}

export default function BrandChatPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const searchParams = useSearchParams()
  const [brand, setBrand] = useState<Brand | null>(null)
  const [loading, setLoading] = useState(true)
  const workflow = searchParams?.get('workflow') ?? null
  const workflowPreset: 'image' | 'post' | 'repo' | 'campaign' | null =
    workflow === 'image' || workflow === 'post' || workflow === 'repo' || workflow === 'campaign'
      ? workflow
      : null

  useEffect(() => {
    async function fetchBrand() {
      const { data } = await supabase
        .from('brands')
        .select('*')
        .eq('id', id)
        .single()

      setBrand(data)
      setLoading(false)
    }
    fetchBrand()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] min-h-0 flex-col lg:h-screen">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 md:px-6">
        <div className="flex items-center gap-4">
          <Link
            href={`/brands/${id}`}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft size={18} className="text-muted-foreground" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono">
              <span className="text-primary">$</span>
              <span>./brands/{brand?.name || id}/chat</span>
            </div>
            {brand && (
              <div>
                <h1 className="text-lg font-semibold">{brand.name} Studio</h1>
                {brand.tagline && <p className="text-xs text-muted-foreground">{brand.tagline}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Brand colors indicator */}
        {brand && (brand.primary_color || brand.secondary_color) && (
          <div className="flex items-center gap-2">
            {brand.primary_color && (
              <div
                className="w-6 h-6 rounded-full border border-border"
                style={{ backgroundColor: brand.primary_color }}
                title={`Primary: ${brand.primary_color}`}
              />
            )}
            {brand.secondary_color && (
              <div
                className="w-6 h-6 rounded-full border border-border"
                style={{ backgroundColor: brand.secondary_color }}
                title={`Secondary: ${brand.secondary_color}`}
              />
            )}
          </div>
        )}
      </div>

      {/* Chat */}
      <Chat brandId={id} brandName={brand?.name} initialWorkflow={workflowPreset} />
    </div>
  )
}
