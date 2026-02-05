'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil, Loader2, ArrowRight, Check, X, Wand2 } from 'lucide-react'

interface ImageEditModalProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  onEditComplete: (editedImageUrl: string) => void
}

export function ImageEditModal({
  isOpen,
  onClose,
  imageUrl,
  onEditComplete,
}: ImageEditModalProps) {
  const [editPrompt, setEditPrompt] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editedImageUrl, setEditedImageUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleEdit = async () => {
    if (!editPrompt.trim() || isEditing) return

    setIsEditing(true)
    setError(null)
    setEditedImageUrl(null)

    try {
      const response = await fetch('/api/images/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          editPrompt: editPrompt.trim(),
        }),
      })

      const data = await response.json()

      if (data.success && data.images?.length > 0) {
        setEditedImageUrl(data.images[0].url)
      } else {
        setError(data.error || 'Failed to edit image')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setIsEditing(false)
    }
  }

  const handleUseImage = () => {
    if (editedImageUrl) {
      onEditComplete(editedImageUrl)
      handleClose()
    }
  }

  const handleClose = () => {
    setEditPrompt('')
    setEditedImageUrl(null)
    setError(null)
    setIsEditing(false)
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEdit()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-mono flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            Edit Image
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Image comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Original */}
            <div className="space-y-2">
              <p className="text-xs font-mono text-muted-foreground">original</p>
              <div className="relative aspect-square rounded-lg border border-border overflow-hidden bg-muted/20">
                <img
                  src={imageUrl}
                  alt="Original"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* Edited / Preview */}
            <div className="space-y-2">
              <p className="text-xs font-mono text-muted-foreground">
                {editedImageUrl ? 'edited' : 'preview'}
              </p>
              <div className="relative aspect-square rounded-lg border border-border overflow-hidden bg-muted/20">
                {isEditing ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-primary/5 to-primary/10">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-shimmer" />
                    <div className="relative">
                      <Wand2 className="h-8 w-8 text-primary animate-pulse" />
                      <div className="absolute inset-0 h-8 w-8 bg-primary/20 rounded-full animate-ping" />
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">editing...</p>
                  </div>
                ) : editedImageUrl ? (
                  <img
                    src={editedImageUrl}
                    alt="Edited"
                    className="w-full h-full object-contain animate-fade-in"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <ArrowRight className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                      <p className="text-xs text-muted-foreground/50 font-mono">
                        enter edit description
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Edit prompt input */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-muted-foreground">
              describe your edit
            </label>
            <div className="flex gap-2">
              <Input
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g., change the background to a sunset, add a logo in the corner..."
                disabled={isEditing}
                className="flex-1 font-mono"
              />
              <Button
                onClick={handleEdit}
                disabled={!editPrompt.trim() || isEditing}
                variant="terminal"
              >
                {isEditing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Pencil className="h-4 w-4 mr-2" />
                    Apply Edit
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Action buttons */}
          {editedImageUrl && (
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="ghost" onClick={handleClose}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleUseImage} variant="terminal">
                <Check className="h-4 w-4 mr-2" />
                Use This Image
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
