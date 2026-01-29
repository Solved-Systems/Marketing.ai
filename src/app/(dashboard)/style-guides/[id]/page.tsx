import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { ArrowLeft, Building2, Package, Settings, Eye, Star } from 'lucide-react'
import { StyleGuideForm } from '@/components/style-guides/style-guide-form'
import { StyleGuidePreview } from '@/components/style-guides/style-guide-preview'

interface StyleGuidePageProps {
  params: Promise<{ id: string }>
}

export default async function StyleGuidePage({ params }: StyleGuidePageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: styleGuide } = await supabase
    .from('style_guides')
    .select(`
      *,
      products(id, name, brand_id, brands(name))
    `)
    .eq('id', id)
    .single()

  if (!styleGuide) {
    notFound()
  }

  const isProductLevel = !!styleGuide.product_id

  // Fetch products for the dropdown
  const { data: products } = await supabase
    .from('products')
    .select(`
      id,
      name,
      brand_id,
      brands(name)
    `)
    .order('name')

  // Fetch existing company guides
  const { data: companyGuides } = await supabase
    .from('style_guides')
    .select('id, name')
    .is('product_id', null)

  const hasCompanyGuide = (companyGuides?.length ?? 0) > 0

  const productInfo = styleGuide.products as { id: string; name: string; brand_id: string; brands: { name: string } | null } | null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/style-guides">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 rounded flex items-center justify-center bg-primary/10">
              {isProductLevel ? (
                <Package className="h-6 w-6 text-primary" />
              ) : (
                <Building2 className="h-6 w-6 text-primary" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-3xl font-bold tracking-tight">{styleGuide.name}</h2>
                {styleGuide.is_default && !isProductLevel && (
                  <Star className="h-5 w-5 text-primary fill-primary" />
                )}
              </div>
              {isProductLevel && productInfo && (
                <p className="text-muted-foreground">
                  Product: {productInfo.name}
                  {productInfo.brands && ` (${productInfo.brands.name})`}
                </p>
              )}
              {!isProductLevel && (
                <p className="text-muted-foreground">Company-wide style guide</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="edit" className="space-y-4">
        <TabsList>
          <TabsTrigger value="edit" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Edit
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="space-y-4">
          <StyleGuideForm
            mode="edit"
            styleGuide={styleGuide}
            initialType={isProductLevel ? 'product' : 'company'}
            initialProductId={styleGuide.product_id || undefined}
            products={products || []}
            hasCompanyGuide={hasCompanyGuide}
          />
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <StyleGuidePreview styleGuide={styleGuide} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
