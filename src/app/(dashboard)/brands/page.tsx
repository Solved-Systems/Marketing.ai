'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Image as ImageIcon, Loader2, MessageSquare, Palette, Plus, Trash2, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Brand {
  id: string
  name: string
  tagline: string | null
  logo_url: string | null
  primary_color: string
  is_default?: boolean
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchBrands() {
      try {
        const response = await fetch('/api/brands')
        if (response.ok) {
          const data = await response.json()
          setBrands(data)
        }
      } catch (error) {
        console.error('Error fetching brands:', error)
      } finally {
        setIsLoading(false)
      }
    }

    void fetchBrands()
  }, [])

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Brands</h1>
          <p className="mt-2 text-sm text-muted-foreground md:text-base">
            Manage brand profiles and launch content workflows quickly.
          </p>
        </div>
        <Link href="/brands/new" className="self-start sm:self-auto">
          <Button variant="default" className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            New Brand
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <Card className="bg-card/65">
          <CardContent className="py-16 text-center">
            <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading brands...</p>
          </CardContent>
        </Card>
      ) : brands.length === 0 ? (
        <Card className="bg-card/65">
          <CardContent className="py-16 text-center">
            <Palette className="mx-auto mb-6 h-14 w-14 text-primary/70" />
            <h2 className="mb-2 text-xl font-semibold">No brands yet</h2>
            <p className="mx-auto mb-6 max-w-md text-muted-foreground">
              Create your first brand profile to unlock AI-powered content generation workflows.
            </p>
            <Link href="/brands/new">
              <Button>
                <Plus className="h-4 w-4" />
                Create Brand
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((brand) => (
            <BrandCard key={brand.id} brand={brand} onDelete={(id) => setBrands((prev) => prev.filter((b) => b.id !== id))} />
          ))}
        </div>
      )}
    </div>
  )
}

function BrandCard({ brand, onDelete }: { brand: Brand; onDelete: (id: string) => void }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/brands/${brand.id}`, { method: 'DELETE' })
      if (response.ok) {
        onDelete(brand.id)
        setShowDeleteDialog(false)
      } else {
        console.error('Delete failed:', await response.text())
      }
    } catch (error) {
      console.error('Error deleting brand:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Link href={`/brands/${brand.id}`}>
        <Card className="group relative h-full cursor-pointer border-border/70 bg-card/65 transition-colors hover:bg-card/90">
          <CardContent className="p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/14">
                {brand.logo_url ? (
                  <img src={brand.logo_url} alt={brand.name} className="h-10 w-10 rounded-lg object-cover" />
                ) : (
                  <Palette className="h-5 w-5 text-primary" />
                )}
              </div>

              <div className="flex items-center gap-2">
                {brand.is_default ? (
                  <Badge variant="outline" className="border-primary/30 text-[10px] text-primary">
                    Default
                  </Badge>
                ) : null}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowDeleteDialog(true)
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <h3 className="text-lg font-semibold tracking-tight">{brand.name}</h3>
            {brand.tagline ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{brand.tagline}</p> : null}

            <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Video className="h-3 w-3" />
                0 videos
              </span>
              <span className="flex items-center gap-1">
                <ImageIcon className="h-3 w-3" />
                0 images
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                0 posts
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4">
              <span className="text-xs text-muted-foreground">Open brand studio</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
            </div>
          </CardContent>
        </Card>
      </Link>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="border-border/70 bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete brand
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to delete <span className="font-semibold text-foreground">{brand.name}</span>?
              </p>
              <p className="text-sm text-destructive/80">
                This removes the brand and associated generated content permanently.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void handleDelete()
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete brand'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
