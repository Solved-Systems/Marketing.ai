'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Pencil,
  Loader2,
  ArrowRight,
  Check,
  X,
  Wand2,
  Eraser,
  Paintbrush,
  RotateCcw,
  Sparkles,
  Image as ImageIcon,
  Sliders,
  Grid3X3,
  ChevronLeft,
  ChevronRight,
  Download,
  Layers,
} from 'lucide-react'

// Edit presets
const EDIT_PRESETS = [
  { value: 'remove_background', label: 'Remove BG', icon: Layers },
  { value: 'enhance', label: 'Enhance', icon: Sparkles },
  { value: 'style_painting', label: 'Oil Paint', icon: Paintbrush },
  { value: 'style_watercolor', label: 'Watercolor', icon: Paintbrush },
  { value: 'style_sketch', label: 'Sketch', icon: Pencil },
  { value: 'style_cartoon', label: 'Cartoon', icon: ImageIcon },
  { value: 'lighting_dramatic', label: 'Dramatic', icon: Sliders },
  { value: 'color_vibrant', label: 'Vibrant', icon: Sliders },
]

const EDIT_SIZES = [
  { value: '1024x1024', label: '1024px' },
  { value: '512x512', label: '512px' },
  { value: '256x256', label: '256px' },
]

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
  const [editedImages, setEditedImages] = useState<{ url: string; index: number }[]>([])
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [size, setSize] = useState<string>('1024x1024')
  const [numVariations, setNumVariations] = useState(1)
  const [activePreset, setActivePreset] = useState<string | null>(null)

  // Mask drawing state
  const [isMaskMode, setIsMaskMode] = useState(false)
  const [brushSize, setBrushSize] = useState(30)
  const [maskDataUrl, setMaskDataUrl] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [canvasReady, setCanvasReady] = useState(false)

  // Initialize canvas when mask mode is enabled
  useEffect(() => {
    if (isMaskMode && canvasRef.current && imageUrl) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const img = new window.Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        // Set canvas size to match image
        canvas.width = img.width
        canvas.height = img.height

        // Draw the image
        ctx.drawImage(img, 0, 0)

        // Set up for mask drawing (transparent areas will be edited)
        ctx.globalCompositeOperation = 'destination-out'
        setCanvasReady(true)
      }
      img.src = imageUrl
    }
  }, [isMaskMode, imageUrl])

  // Drawing handlers
  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !canvasReady) return
    setIsDrawing(true)
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.beginPath()
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2)
    ctx.fill()
  }, [brushSize, canvasReady])

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current || !canvasReady) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.beginPath()
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2)
    ctx.fill()
  }, [isDrawing, brushSize, canvasReady])

  const stopDrawing = useCallback(() => {
    if (isDrawing && canvasRef.current) {
      setIsDrawing(false)
      // Save mask as data URL
      setMaskDataUrl(canvasRef.current.toDataURL('image/png'))
    }
  }, [isDrawing])

  const clearMask = useCallback(() => {
    if (!canvasRef.current || !imageUrl) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      ctx.globalCompositeOperation = 'source-over'
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      ctx.globalCompositeOperation = 'destination-out'
    }
    img.src = imageUrl
    setMaskDataUrl(null)
  }, [imageUrl])

  const handlePresetClick = (presetValue: string) => {
    if (activePreset === presetValue) {
      setActivePreset(null)
      setEditPrompt('')
    } else {
      setActivePreset(presetValue)
      const preset = EDIT_PRESETS.find(p => p.value === presetValue)
      if (preset) {
        setEditPrompt(`Apply ${preset.label.toLowerCase()} effect`)
      }
    }
  }

  const handleEdit = async () => {
    if ((!editPrompt.trim() && !activePreset) || isEditing) return

    setIsEditing(true)
    setError(null)
    setEditedImages([])

    try {
      const response = await fetch('/api/images/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          editPrompt: editPrompt.trim(),
          size,
          n: numVariations,
          preset: activePreset || undefined,
          maskUrl: maskDataUrl || undefined,
        }),
      })

      const data = await response.json()

      if (data.success && data.images?.length > 0) {
        setEditedImages(data.images)
        setSelectedImageIndex(0)
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
    if (editedImages[selectedImageIndex]) {
      onEditComplete(editedImages[selectedImageIndex].url)
      handleClose()
    }
  }

  const handleClose = () => {
    setEditPrompt('')
    setEditedImages([])
    setSelectedImageIndex(0)
    setError(null)
    setIsEditing(false)
    setActivePreset(null)
    setIsMaskMode(false)
    setMaskDataUrl(null)
    setCanvasReady(false)
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEdit()
    }
  }

  const selectedImage = editedImages[selectedImageIndex]

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            Edit Image
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Quick Presets */}
          <div className="space-y-2">
            <p className="text-xs font-mono text-muted-foreground">quick_presets</p>
            <div className="flex flex-wrap gap-2">
              {EDIT_PRESETS.map((preset) => {
                const Icon = preset.icon
                return (
                  <button
                    key={preset.value}
                    onClick={() => handlePresetClick(preset.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      activePreset === preset.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {preset.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Image comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Original / Mask Canvas */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-mono text-muted-foreground">
                  {isMaskMode ? 'mask_editor' : 'original'}
                </p>
                <Button
                  variant={isMaskMode ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setIsMaskMode(!isMaskMode)}
                  className="h-7 text-xs"
                >
                  <Eraser className="h-3.5 w-3.5 mr-1" />
                  {isMaskMode ? 'Exit Mask' : 'Mask Mode'}
                </Button>
              </div>
              <div className="relative aspect-square rounded-lg border border-border overflow-hidden bg-muted/20">
                {isMaskMode ? (
                  <>
                    <canvas
                      ref={canvasRef}
                      className="w-full h-full object-contain cursor-crosshair"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                    />
                    {/* Mask controls */}
                    <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 p-2 bg-background/90 rounded-lg border border-border">
                      <Paintbrush className="h-4 w-4 text-muted-foreground" />
                      <input
                        type="range"
                        min="5"
                        max="100"
                        value={brushSize}
                        onChange={(e) => setBrushSize(Number(e.target.value))}
                        className="flex-1 h-1.5 accent-primary"
                      />
                      <span className="text-xs font-mono w-8">{brushSize}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearMask}
                        className="h-7"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="absolute top-2 left-2 text-xs text-primary bg-background/80 px-2 py-1 rounded">
                      Paint areas to edit
                    </p>
                  </>
                ) : (
                  <img
                    src={imageUrl}
                    alt="Original"
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
            </div>

            {/* Edited / Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-mono text-muted-foreground">
                  {editedImages.length > 0 ? `edited (${selectedImageIndex + 1}/${editedImages.length})` : 'preview'}
                </p>
                {editedImages.length > 1 && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedImageIndex(Math.max(0, selectedImageIndex - 1))}
                      disabled={selectedImageIndex === 0}
                      className="h-7 w-7 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedImageIndex(Math.min(editedImages.length - 1, selectedImageIndex + 1))}
                      disabled={selectedImageIndex === editedImages.length - 1}
                      className="h-7 w-7 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="relative aspect-square rounded-lg border border-border overflow-hidden bg-muted/20">
                {isEditing ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-primary/5 to-primary/10">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-shimmer" />
                    <div className="relative">
                      <Wand2 className="h-8 w-8 text-primary animate-pulse" />
                      <div className="absolute inset-0 h-8 w-8 bg-primary/20 rounded-full animate-ping" />
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">
                      {numVariations > 1 ? `generating ${numVariations} variations...` : 'editing...'}
                    </p>
                  </div>
                ) : selectedImage ? (
                  <img
                    src={selectedImage.url}
                    alt="Edited"
                    className="w-full h-full object-contain animate-fade-in"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <ArrowRight className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                      <p className="text-xs text-muted-foreground/50 font-mono">
                        {activePreset ? 'click apply to edit' : 'enter edit description'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Variation thumbnails */}
              {editedImages.length > 1 && (
                <div className="flex gap-2 justify-center">
                  {editedImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`w-12 h-12 rounded border-2 overflow-hidden transition-all ${
                        selectedImageIndex === idx
                          ? 'border-primary ring-2 ring-primary/20'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <img
                        src={img.url}
                        alt={`Variation ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Settings Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-mono text-muted-foreground">size</label>
              <Select value={size} onValueChange={setSize}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EDIT_SIZES.map(s => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-mono text-muted-foreground">variations</label>
              <Select value={String(numVariations)} onValueChange={(v) => setNumVariations(Number(v))}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 image</SelectItem>
                  <SelectItem value="2">2 images</SelectItem>
                  <SelectItem value="3">3 images</SelectItem>
                  <SelectItem value="4">4 images</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-mono text-muted-foreground">mask</label>
              <Button
                variant={maskDataUrl ? 'default' : 'outline'}
                size="sm"
                className="w-full h-9"
                onClick={() => setIsMaskMode(!isMaskMode)}
              >
                <Grid3X3 className="h-4 w-4 mr-1" />
                {maskDataUrl ? 'Mask Active' : 'No Mask'}
              </Button>
            </div>
          </div>

          {/* Edit prompt input */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-muted-foreground">
              edit_prompt {activePreset && <span className="text-primary">(preset: {activePreset})</span>}
            </label>
            <div className="flex gap-2">
              <Input
                value={editPrompt}
                onChange={(e) => {
                  setEditPrompt(e.target.value)
                  if (activePreset) setActivePreset(null)
                }}
                onKeyDown={handleKeyDown}
                placeholder="e.g., change the background to a sunset, add a logo in the corner..."
                disabled={isEditing}
                className="flex-1 font-mono"
              />
              <Button
                onClick={handleEdit}
                disabled={(!editPrompt.trim() && !activePreset) || isEditing}
                variant="terminal"
              >
                {isEditing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
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
          {editedImages.length > 0 && (
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (selectedImage) {
                    const link = document.createElement('a')
                    link.href = selectedImage.url
                    link.download = `edited-${Date.now()}.png`
                    link.click()
                  }
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={handleClose}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleUseImage} variant="terminal">
                  <Check className="h-4 w-4 mr-2" />
                  Use This Image
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
