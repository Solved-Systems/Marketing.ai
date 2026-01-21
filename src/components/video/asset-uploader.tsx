'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { Upload, X, File, Loader2 } from 'lucide-react'
import { formatBytes } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface AssetUploaderProps {
  projectId: string
}

interface UploadingFile {
  file: File
  progress: number
  status: 'uploading' | 'completed' | 'error'
  error?: string
}

const ACCEPTED_FILE_TYPES = {
  'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'],
  'video/*': ['.mp4', '.webm', '.mov'],
  'audio/*': ['.mp3', '.wav', '.m4a'],
  'font/*': ['.ttf', '.otf', '.woff', '.woff2'],
}

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

export function AssetUploader({ projectId }: AssetUploaderProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const uploadFile = async (file: File, index: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Generate unique file path
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${projectId}/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) throw uploadError

      // Determine file type
      let fileType = 'other'
      if (file.type.startsWith('image/')) fileType = 'image'
      else if (file.type.startsWith('video/')) fileType = 'video'
      else if (file.type.startsWith('audio/')) fileType = 'audio'
      else if (file.name.match(/\.(ttf|otf|woff|woff2)$/i)) fileType = 'font'

      // Create asset record
      const { error: dbError } = await supabase.from('assets').insert({
        project_id: projectId,
        name: file.name,
        file_path: filePath,
        file_type: fileType,
        mime_type: file.type,
        file_size: file.size,
        uploaded_by: user.id,
        metadata: {},
      })

      if (dbError) throw dbError

      setUploadingFiles((prev) =>
        prev.map((f, i) =>
          i === index ? { ...f, progress: 100, status: 'completed' } : f
        )
      )
    } catch (error) {
      setUploadingFiles((prev) =>
        prev.map((f, i) =>
          i === index
            ? { ...f, status: 'error', error: (error as Error).message }
            : f
        )
      )
    }
  }

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const newFiles = acceptedFiles.map((file) => ({
        file,
        progress: 0,
        status: 'uploading' as const,
      }))

      setUploadingFiles((prev) => [...prev, ...newFiles])

      const startIndex = uploadingFiles.length

      await Promise.all(
        acceptedFiles.map((file, index) => uploadFile(file, startIndex + index))
      )

      router.refresh()
      toast({
        title: 'Upload complete',
        description: `${acceptedFiles.length} file(s) uploaded successfully`,
      })

      // Clear completed uploads after a delay
      setTimeout(() => {
        setUploadingFiles((prev) => prev.filter((f) => f.status !== 'completed'))
      }, 2000)
    },
    [projectId, uploadingFiles.length]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    onDropRejected: (fileRejections) => {
      fileRejections.forEach((rejection) => {
        toast({
          variant: 'destructive',
          title: 'File rejected',
          description: `${rejection.file.name}: ${rejection.errors[0].message}`,
        })
      })
    },
  })

  const removeFile = (index: number) => {
    setUploadingFiles((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
        {isDragActive ? (
          <p className="text-primary">Drop files here...</p>
        ) : (
          <>
            <p className="text-muted-foreground mb-2">
              Drag & drop files here, or click to select
            </p>
            <p className="text-xs text-muted-foreground">
              Supports images, videos, audio, and fonts (max 100MB)
            </p>
          </>
        )}
      </div>

      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((item, index) => (
            <div
              key={index}
              className="flex items-center space-x-4 rounded-lg border p-3"
            >
              <File className="h-8 w-8 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(item.file.size)}
                </p>
                {item.status === 'uploading' && (
                  <Progress value={item.progress} className="h-1 mt-1" />
                )}
                {item.status === 'error' && (
                  <p className="text-xs text-destructive">{item.error}</p>
                )}
              </div>
              {item.status === 'uploading' && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {item.status === 'completed' && (
                <span className="text-xs text-green-600">Uploaded</span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => removeFile(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
