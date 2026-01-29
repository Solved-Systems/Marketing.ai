import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { StyleGuideForm } from '@/components/style-guides/style-guide-form'

interface NewStyleGuidePageProps {
  searchParams: Promise<{ type?: string; product_id?: string }>
}

export default async function NewStyleGuidePage({ searchParams }: NewStyleGuidePageProps) {
  const params = await searchParams
  const isProductLevel = params.type === 'product' || !!params.product_id
  const supabase = await createClient()

  // Fetch products for the dropdown if creating a product-level guide
  const { data: products } = await supabase
    .from('products')
    .select(`
      id,
      name,
      brand_id,
      brands(name)
    `)
    .order('name')

  // Fetch existing company guides to check if there's a default
  const { data: companyGuides } = await supabase
    .from('style_guides')
    .select('id, name')
    .is('product_id', null)

  const hasCompanyGuide = (companyGuides?.length ?? 0) > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/style-guides">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <div className="text-sm text-muted-foreground font-mono mb-1">
            <span className="text-primary">$</span> touch ./style-guides/new
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            <span className="text-primary">{'//'}</span> NEW STYLE GUIDE
          </h2>
          <p className="text-muted-foreground text-sm">
            {isProductLevel
              ? 'Create a product-specific style guide'
              : 'Create a company-wide style guide'}
          </p>
        </div>
      </div>

      <StyleGuideForm
        mode="create"
        initialType={isProductLevel ? 'product' : 'company'}
        initialProductId={params.product_id}
        products={products || []}
        hasCompanyGuide={hasCompanyGuide}
      />
    </div>
  )
}
