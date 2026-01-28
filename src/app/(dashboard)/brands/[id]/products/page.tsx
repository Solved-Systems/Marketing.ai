import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ProductForm } from '@/components/brands/product-form'

interface ProductsPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ edit?: string }>
}

export default async function ProductsPage({ params, searchParams }: ProductsPageProps) {
  const { id } = await params
  const { edit } = await searchParams
  const supabase = await createClient()

  const { data: brand } = await supabase
    .from('brands')
    .select('*')
    .eq('id', id)
    .single()

  if (!brand) {
    notFound()
  }

  let product = null
  if (edit) {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('id', edit)
      .single()
    product = data
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/brands/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <div className="text-sm text-muted-foreground font-mono mb-1">
            <span className="text-primary">$</span> {edit ? 'vim' : 'touch'} ./brands/{brand.name}/products/{edit ? 'edit' : 'new'}
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            <span className="text-primary">{'//'}</span> {edit ? 'EDIT_PRODUCT' : 'NEW_PRODUCT'}
          </h2>
          <p className="text-muted-foreground text-sm">
            {edit ? 'Edit product details' : `Add a new product to ${brand.name}`}
          </p>
        </div>
      </div>

      <div className="max-w-3xl">
        <ProductForm brandId={id} product={product || undefined} />
      </div>
    </div>
  )
}
