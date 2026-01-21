'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { MoreVertical, Trash2, Download, Image as ImageIcon, Video, Music, Type } from 'lucide-react'
import { formatBytes } from '@/lib/utils'
import type { Tables } from '@/lib/database.types'

interface AssetGridProps {
  assets: Tables<'assets'>[]
  projectId: string
}

const fileTypeIcons = {
  image: ImageIcon,
  video: Video,
  audio: Music,
  font: Type,
  other: ImageIcon,
}

export function AssetGrid({ assets, projectId }: AssetGridProps) {
  const [deleteAsset, setDeleteAsset] = useState<Tables<'assets'> | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const handleDelete = async () => {
    if (!deleteAsset) return
    setIsDeleting(true)

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('assets')
        .remove([deleteAsset.file_path])

      if (storageError) throw storageError

      // Delete from database
      const { error: dbError } = await supabase
        .from('assets')
        .delete()
        .eq('id', deleteAsset.id)

      if (dbError) throw dbError

      toast({
        title: 'Asset deleted',
        description: 'The asset has been deleted successfully',
      })

      router.refresh()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: (error as Error).message,
      })
    } finally {
      setIsDeleting(false)
      setDeleteAsset(null)
    }
  }

  const handleDownload = async (asset: Tables<'assets'>) => {
    try {
      const { data, error } = await supabase.storage
        .from('assets')
        .download(asset.file_path)

      if (error) throw error

      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = asset.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: (error as Error).message,
      })
    }
  }

  const getAssetUrl = (asset: Tables<'assets'>) => {
    const { data } = supabase.storage.from('assets').getPublicUrl(asset.file_path)
    return data.publicUrl
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {assets.map((asset) => {
          const Icon = fileTypeIcons[asset.file_type as keyof typeof fileTypeIcons] || ImageIcon
          const isImage = asset.file_type === 'image'

          return (
            <div
              key={asset.id}
              className="group relative rounded-lg border overflow-hidden bg-muted/50"
            >
              <div className="aspect-square flex items-center justify-center">
                {isImage ? (
                  <Image
                    src={getAssetUrl(asset)}
                    alt={asset.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                  />
                ) : (
                  <Icon className="h-12 w-12 text-muted-foreground" />
                )}
              </div>

              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end">
                <div className="p-3 w-full">
                  <p className="text-white text-sm font-medium truncate">
                    {asset.name}
                  </p>
                  <p className="text-white/70 text-xs">
                    {formatBytes(asset.file_size)}
                  </p>
                </div>
              </div>

              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleDownload(asset)}>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDeleteAsset(asset)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )
        })}
      </div>

      <Dialog open={!!deleteAsset} onOpenChange={() => setDeleteAsset(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Asset</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteAsset?.name}&quot;? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAsset(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
