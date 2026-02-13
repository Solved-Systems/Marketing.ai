"use client"

import { useCallback, useState, type DragEvent, type ReactNode } from "react"
import { Upload } from "lucide-react"
import { cn } from "@/lib/utils"
import { validateVideoFile, ACCEPTED_VIDEO_TYPES } from "@/lib/video-editor/media-import"

interface MediaDropZoneProps {
  children: ReactNode
  onFilesAccepted: (files: File[]) => void
  disabled?: boolean
  className?: string
}

export function MediaDropZone({ children, onFilesAccepted, disabled, className }: MediaDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [dropError, setDropError] = useState<string | null>(null)

  const handleDragOver = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (disabled) return
      setIsDragOver(true)
    },
    [disabled]
  )

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)
      setDropError(null)

      if (disabled) return

      const files = Array.from(e.dataTransfer.files)
      const videoFiles: File[] = []
      const errors: string[] = []

      for (const file of files) {
        const validation = validateVideoFile(file)
        if (validation.valid) {
          videoFiles.push(file)
        } else {
          errors.push(`${file.name}: ${validation.error}`)
        }
      }

      if (errors.length > 0) {
        setDropError(errors.join("; "))
      }

      if (videoFiles.length > 0) {
        onFilesAccepted(videoFiles)
      }
    },
    [disabled, onFilesAccepted]
  )

  return (
    <div
      className={cn("relative", className)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}

      {isDragOver && !disabled && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/10 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2 text-primary">
            <Upload className="h-8 w-8" />
            <p className="text-sm font-medium">Drop video file to import</p>
            <p className="text-xs text-muted-foreground">MP4, WebM, MOV, MKV (max 500MB)</p>
          </div>
        </div>
      )}

      {dropError && (
        <div className="absolute bottom-2 left-2 right-2 z-20 rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
          {dropError}
        </div>
      )}
    </div>
  )
}
