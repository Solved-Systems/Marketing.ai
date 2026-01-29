import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Plus, BookOpen, Building2, Package, Star } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default async function StyleGuidesPage() {
  const supabase = await createClient()

  const { data: styleGuides } = await supabase
    .from('style_guides')
    .select(`
      *,
      products(name)
    `)
    .order('product_id', { ascending: true, nullsFirst: true })
    .order('is_default', { ascending: false })
    .order('updated_at', { ascending: false })

  const companyGuides = styleGuides?.filter(g => !g.product_id) || []
  const productGuides = styleGuides?.filter(g => g.product_id) || []

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground font-mono mb-2">
            <span className="text-primary">$</span> ls -la ./style-guides
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            <span className="text-primary">{'//'}</span> STYLE GUIDES
          </h2>
          <p className="text-muted-foreground text-sm">
            Define your brand voice, visual identity, and content guidelines
          </p>
        </div>
        <Button variant="terminal" asChild>
          <Link href="/style-guides/new">
            <Plus className="mr-2 h-4 w-4" />
            CREATE
          </Link>
        </Button>
      </div>

      {/* Company-Level Style Guides */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold font-mono">
            <span className="text-primary">{'//'}</span> COMPANY
          </h3>
        </div>

        {companyGuides.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {companyGuides.map((guide) => (
              <StyleGuideCard key={guide.id} guide={guide} type="company" />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-primary/30 mb-4" />
              <h3 className="text-lg font-mono mb-2">
                <span className="text-primary">$</span> company_guides: <span className="text-muted-foreground">empty</span>
              </h3>
              <p className="text-muted-foreground text-center mb-4 font-mono text-sm">
                <span className="text-primary">{'//'}</span> Create a company-wide style guide
              </p>
              <Button variant="terminal" asChild>
                <Link href="/style-guides/new?type=company">
                  <Plus className="mr-2 h-4 w-4" />
                  CREATE COMPANY GUIDE
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Product-Level Style Guides */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Package className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold font-mono">
            <span className="text-primary">{'//'}</span> PRODUCTS
          </h3>
        </div>

        {productGuides.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {productGuides.map((guide) => (
              <StyleGuideCard key={guide.id} guide={guide} type="product" />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Package className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground text-center text-sm">
                No product-specific style guides yet.
              </p>
              <p className="text-muted-foreground text-center text-xs mt-1">
                Product guides can inherit from or override company guidelines.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function StyleGuideCard({
  guide,
  type
}: {
  guide: {
    id: string
    name: string
    description: string | null
    is_default: boolean
    inherit_from_company: boolean
    updated_at: string
    products?: { name: string } | null
  }
  type: 'company' | 'product'
}) {
  const productName = guide.products?.name

  return (
    <Link href={`/style-guides/${guide.id}`}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full relative">
        {guide.is_default && type === 'company' && (
          <div className="absolute top-2 right-2">
            <Star className="h-4 w-4 text-primary fill-primary" />
          </div>
        )}
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded flex items-center justify-center bg-primary/10">
              {type === 'company' ? (
                <Building2 className="h-5 w-5 text-primary" />
              ) : (
                <Package className="h-5 w-5 text-primary" />
              )}
            </div>
            <div>
              <CardTitle className="text-base font-mono">{guide.name}</CardTitle>
              {type === 'product' && productName && (
                <CardDescription className="text-xs font-mono">
                  Product: {productName}
                </CardDescription>
              )}
            </div>
          </div>
          {guide.description && (
            <CardDescription className="line-clamp-2 font-mono text-xs mt-2">
              <span className="text-primary">{'//'}</span> {guide.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
            <div className="flex items-center space-x-2">
              {type === 'product' && guide.inherit_from_company && (
                <span className="text-primary" title="Inherits from company guide">
                  [inherits]
                </span>
              )}
              {type === 'company' && guide.is_default && (
                <span className="text-primary">[default]</span>
              )}
            </div>
            <span className="text-primary">
              {formatDistanceToNow(new Date(guide.updated_at), { addSuffix: true })}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
