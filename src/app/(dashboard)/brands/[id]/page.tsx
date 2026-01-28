import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { ArrowLeft, Plus, Video, Image as ImageIcon, FileText, Settings, Sparkles, Star, Palette, PenSquare } from 'lucide-react'
import { BrandSettings } from '@/components/brands/brand-settings'
import { ProductList } from '@/components/brands/product-list'
import { ContentList } from '@/components/brands/content-list'

interface BrandPageProps {
  params: Promise<{ id: string }>
}

export default async function BrandPage({ params }: BrandPageProps) {
  const { id } = await params
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
    .order('created_at', { ascending: false })

  const { data: contentDrafts } = await supabase
    .from('content_drafts')
    .select('*')
    .eq('brand_id', id)
    .order('created_at', { ascending: false })

  const brandColors = brand.brand_colors as { primary?: string } | null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/brands">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center space-x-3">
            {brand.logo_url ? (
              <img
                src={brand.logo_url}
                alt={brand.name}
                className="h-12 w-12 rounded object-contain bg-background"
              />
            ) : (
              <div
                className="h-12 w-12 rounded flex items-center justify-center"
                style={{ backgroundColor: brandColors?.primary || 'hsl(var(--primary))' }}
              >
                <Palette className="h-6 w-6 text-white" />
              </div>
            )}
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-3xl font-bold tracking-tight">{brand.name}</h2>
                {brand.is_default && (
                  <Star className="h-5 w-5 text-primary fill-primary" />
                )}
              </div>
              {brand.tagline && (
                <p className="text-muted-foreground">{brand.tagline}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" asChild>
            <Link href={`/brands/${id}/create/video`}>
              <Video className="mr-2 h-4 w-4" />
              Video
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/brands/${id}/create/image`}>
              <ImageIcon className="mr-2 h-4 w-4" />
              Image
            </Link>
          </Button>
          <Button variant="terminal" asChild>
            <Link href={`/brands/${id}/create/post`}>
              <PenSquare className="mr-2 h-4 w-4" />
              Post
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Products ({products?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            Content ({contentDrafts?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold font-mono">
                <span className="text-primary">{'//'}</span> PRODUCTS
              </h3>
              <p className="text-sm text-muted-foreground">
                Products and services under this brand
              </p>
            </div>
            <Button variant="terminal" asChild>
              <Link href={`/brands/${id}/products`}>
                <Plus className="mr-2 h-4 w-4" />
                ADD PRODUCT
              </Link>
            </Button>
          </div>

          {products && products.length > 0 ? (
            <ProductList products={products} brandId={id} />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center mb-4">
                  No products yet. Add your first product to this brand.
                </p>
                <Button variant="terminal" asChild>
                  <Link href={`/brands/${id}/products`}>
                    <Plus className="mr-2 h-4 w-4" />
                    ADD PRODUCT
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold font-mono">
                <span className="text-primary">{'//'}</span> CONTENT
              </h3>
              <p className="text-sm text-muted-foreground">
                Videos, images, and posts for this brand
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" asChild>
                <Link href={`/brands/${id}/create/video`}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Video
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/brands/${id}/create/image`}>
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Generate Image
                </Link>
              </Button>
              <Button variant="terminal" asChild>
                <Link href={`/brands/${id}/create/post`}>
                  <PenSquare className="mr-2 h-4 w-4" />
                  Write Post
                </Link>
              </Button>
            </div>
          </div>

          {contentDrafts && contentDrafts.length > 0 ? (
            <ContentList content={contentDrafts} brandId={id} />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Sparkles className="h-12 w-12 text-primary mb-4" />
                <p className="text-muted-foreground text-center mb-4">
                  No content yet. Generate videos, images, or posts for this brand.
                </p>
                <div className="flex items-center space-x-2">
                  <Button variant="terminal" asChild>
                    <Link href={`/brands/${id}/create/video`}>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Video
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <BrandSettings brand={brand} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
