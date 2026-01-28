import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, PenSquare, Palette } from 'lucide-react'
import { PostGenerator } from '@/components/content/post-generator'

interface CreatePostPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ product?: string }>
}

export default async function CreatePostPage({ params, searchParams }: CreatePostPageProps) {
  const { id } = await params
  const { product: productParam } = await searchParams
  const supabase = await createClient()

  const { data: brand } = await supabase
    .from('brands')
    .select('*')
    .eq('id', id)
    .single()

  if (!brand) {
    notFound()
  }

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('brand_id', id)
    .order('name')

  const brandColors = brand.brand_colors as { primary?: string } | null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/brands/${id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center space-x-3">
            {brand.logo_url ? (
              <img
                src={brand.logo_url}
                alt={brand.name}
                className="h-10 w-10 rounded object-contain bg-background"
              />
            ) : (
              <div
                className="h-10 w-10 rounded flex items-center justify-center"
                style={{ backgroundColor: brandColors?.primary || 'hsl(var(--primary))' }}
              >
                <Palette className="h-5 w-5 text-white" />
              </div>
            )}
            <div>
              <div className="text-sm text-muted-foreground font-mono mb-1">
                <span className="text-primary">$</span> generate --post --brand={brand.name}
              </div>
              <h2 className="text-2xl font-bold tracking-tight">
                <span className="text-primary">{'//'}</span> CREATE_POST
              </h2>
              <p className="text-muted-foreground text-sm">
                Generate AI-powered social posts for {brand.name}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <PenSquare className="h-8 w-8 text-primary" />
        </div>
      </div>

      <div className="max-w-4xl">
        <PostGenerator
          brand={brand}
          products={products || []}
          selectedProductId={productParam}
        />
      </div>
    </div>
  )
}
