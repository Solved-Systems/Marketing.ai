'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'
import { MoreVertical, Trash2, Edit, FileText, Sparkles, Video, Image as ImageIcon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import type { Tables } from '@/lib/database.types'

interface ProductListProps {
  products: Tables<'products'>[]
  brandId: string
}

export function ProductList({ products, brandId }: ProductListProps) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product? This cannot be undone.')) {
      return
    }

    setIsDeleting(productId)

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message,
        })
        return
      }

      toast({
        title: 'Product deleted',
        description: 'The product has been removed',
      })

      router.refresh()
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred',
      })
    } finally {
      setIsDeleting(null)
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => {
        const features = product.features as Array<{ icon?: string; title?: string; description?: string }> | null

        return (
          <Card key={product.id} className="hover:border-primary/50 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base font-mono">{product.name}</CardTitle>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/brands/${brandId}/products?edit=${product.id}`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/brands/${brandId}/create/video?product=${product.id}`}>
                        <Video className="mr-2 h-4 w-4" />
                        Create Video
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/brands/${brandId}/create/image?product=${product.id}`}>
                        <ImageIcon className="mr-2 h-4 w-4" />
                        Create Image
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/brands/${brandId}/create/post?product=${product.id}`}>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Create Post
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleDelete(product.id)}
                      disabled={isDeleting === product.id}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {product.tagline && (
                <CardDescription className="text-xs font-mono">
                  {product.tagline}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {product.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {product.description}
                </p>
              )}
              <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                <span className="flex items-center">
                  <Sparkles className="mr-1 h-3 w-3" />
                  {features?.length || 0} features
                </span>
                {product.category && (
                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">
                    {product.category}
                  </span>
                )}
              </div>
              <div className="mt-2 text-xs text-muted-foreground font-mono">
                <span className="text-primary">
                  {formatDistanceToNow(new Date(product.updated_at), { addSuffix: true })}
                </span>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
