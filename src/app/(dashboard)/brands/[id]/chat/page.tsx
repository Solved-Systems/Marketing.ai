'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
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
  const [brand, setBrand] = useState<Brand | null>(null)
  const [loading, setLoading] = useState(true)

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
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="px-4 md:px-8 py-4 border-b border-border flex items-center justify-between">
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
              <h1 className="text-lg font-semibold">{brand.name} Studio</h1>
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
      <Chat brandId={id} brandName={brand?.name} />
    </div>
  )
}
