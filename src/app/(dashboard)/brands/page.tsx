import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Plus, Palette, Video, Image as ImageIcon, FileText, Star } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default async function BrandsPage() {
  const supabase = await createClient()

  const { data: brands } = await supabase
    .from('brands')
    .select(`
      *,
      products(count),
      content_drafts(count)
    `)
    .order('is_default', { ascending: false })
    .order('updated_at', { ascending: false })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground font-mono mb-2">
            <span className="text-primary">$</span> ls -la ./brands
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            <span className="text-primary">{'//'}</span> BRANDS
          </h2>
          <p className="text-muted-foreground text-sm">
            Manage your brands and their products
          </p>
        </div>
        <Button variant="terminal" asChild>
          <Link href="/brands/new">
            <Plus className="mr-2 h-4 w-4" />
            CREATE
          </Link>
        </Button>
      </div>

      {brands && brands.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {brands.map((brand) => {
            const productCount = (brand.products as { count: number }[])?.[0]?.count || 0
            const contentCount = (brand.content_drafts as { count: number }[])?.[0]?.count || 0
            const brandColors = brand.brand_colors as { primary?: string } | null

            return (
              <Link key={brand.id} href={`/brands/${brand.id}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full relative">
                  {brand.is_default && (
                    <div className="absolute top-2 right-2">
                      <Star className="h-4 w-4 text-primary fill-primary" />
                    </div>
                  )}
                  <CardHeader>
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
                        <CardTitle className="text-base font-mono">{brand.name}</CardTitle>
                        {brand.tagline && (
                          <CardDescription className="text-xs font-mono truncate max-w-[200px]">
                            {brand.tagline}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    {brand.description && (
                      <CardDescription className="line-clamp-2 font-mono text-xs mt-2">
                        <span className="text-primary">{'//'}</span> {brand.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center" title="Products">
                          <FileText className="mr-1 h-3 w-3" />
                          {productCount}
                        </span>
                        <span className="flex items-center" title="Content">
                          <Video className="mr-1 h-3 w-3" />
                          {contentCount}
                        </span>
                      </div>
                      <span className="text-primary">
                        {formatDistanceToNow(new Date(brand.updated_at), { addSuffix: true })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Palette className="h-16 w-16 text-primary/30 mb-4" />
            <h3 className="text-lg font-mono mb-2">
              <span className="text-primary">$</span> brands: <span className="text-muted-foreground">empty</span>
            </h3>
            <p className="text-muted-foreground text-center mb-4 font-mono text-sm">
              <span className="text-primary">{'//'}</span> Create your first brand to start
            </p>
            <Button variant="terminal" asChild>
              <Link href="/brands/new">
                <Plus className="mr-2 h-4 w-4" />
                INITIALIZE
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
