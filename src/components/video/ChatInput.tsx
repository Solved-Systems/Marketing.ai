'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Send,
  Loader2,
  Paperclip,
  X,
  Wand2,
  Zap,
  Clapperboard,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type GenerationMode = 'grok-imagine' | 'openai' | 'remotion'

interface ImageSize {
  value: string
  label: string
  aspectRatio: string
}

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  isLoading: boolean
  uploadedImages: string[]
  onRemoveImage: (index: number) => void
  onFilesSelected: (files: FileList | File[]) => void
  generationMode: GenerationMode
  onModeChange: (mode: GenerationMode) => void
  imageSize: string
  onImageSizeChange: (size: string) => void
  imageSizes: ImageSize[]
  remotionTemplate: string
  onRemotionTemplateChange: (template: string) => void
  remotionDuration: string
  onRemotionDurationChange: (duration: string) => void
  remotionStyle: string
  onRemotionStyleChange: (style: string) => void
  remotionTemplates: { value: string; label: string }[]
  remotionDurations: { value: string; label: string }[]
  remotionStyles: { value: string; label: string }[]
  hasBrand: boolean
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  isLoading,
  uploadedImages,
  onRemoveImage,
  onFilesSelected,
  generationMode,
  onModeChange,
  imageSize,
  onImageSizeChange,
  imageSizes,
  remotionTemplate,
  onRemotionTemplateChange,
  remotionDuration,
  onRemotionDurationChange,
  remotionStyle,
  onRemotionStyleChange,
  remotionTemplates,
  remotionDurations,
  remotionStyles,
  hasBrand,
}: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-4">
      {/* Uploaded images */}
      {uploadedImages.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {uploadedImages.map((img, idx) => (
            <div key={idx} className="relative group">
              <img
                src={img}
                alt=""
                className="h-14 w-14 object-contain rounded-lg border border-border bg-muted/30"
              />
              <button
                type="button"
                onClick={() => onRemoveImage(idx)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main input */}
      {generationMode === 'remotion' ? (
        <div className="space-y-3">
          {/* Remotion settings */}
          <div className="flex items-center gap-2">
            <Select value={remotionTemplate} onValueChange={onRemotionTemplateChange}>
              <SelectTrigger className="flex-1 h-9 bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {remotionTemplates.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={remotionDuration} onValueChange={onRemotionDurationChange}>
              <SelectTrigger className="w-20 h-9 bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {remotionDurations.map(d => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={remotionStyle} onValueChange={onRemotionStyleChange}>
              <SelectTrigger className="w-24 h-9 bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {remotionStyles.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={onSubmit as () => void}
            className="w-full h-10"
            disabled={isLoading || !hasBrand}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Clapperboard className="h-4 w-4 mr-2" />
            )}
            {isLoading ? 'Rendering...' : 'Generate Video'}
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => e.target.files && onFilesSelected(e.target.files)}
          />

          {/* Chat input box */}
          <div className="relative flex items-end gap-2 p-2 bg-muted/30 rounded-xl border border-border focus-within:border-primary/50 transition-colors">
            {/* Attach button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
            >
              <Paperclip className="h-4 w-4" />
            </Button>

            {/* Text input */}
            <textarea
              value={value}
              onChange={(e) => {
                onChange(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if (value.trim() || uploadedImages.length > 0) {
                    onSubmit(e)
                  }
                }
              }}
              placeholder="Describe what you want to create..."
              disabled={isLoading}
              rows={1}
              className="flex-1 min-h-[36px] max-h-[120px] py-2 px-1 bg-transparent border-0 resize-none text-sm placeholder:text-muted-foreground/60 focus:outline-none"
            />

            {/* Size selector */}
            <Select value={imageSize} onValueChange={onImageSizeChange}>
              <SelectTrigger className="w-16 h-8 text-xs border-0 bg-muted/50 hover:bg-muted">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {imageSizes.map(s => (
                  <SelectItem key={s.value} value={s.value} className="text-xs">
                    {s.aspectRatio}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Send button */}
            <Button
              type="submit"
              size="icon"
              disabled={isLoading || (!value.trim() && uploadedImages.length === 0)}
              className="h-8 w-8 shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      )}

      {/* Engine selector */}
      <div className="flex items-center justify-center gap-1">
        {[
          { mode: 'grok-imagine' as const, icon: Wand2, label: 'Grok' },
          { mode: 'openai' as const, icon: Zap, label: 'DALL·E' },
          { mode: 'remotion' as const, icon: Clapperboard, label: 'Remotion' },
        ].map(({ mode, icon: Icon, label }) => (
          <button
            key={mode}
            type="button"
            onClick={() => onModeChange(mode)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors',
              generationMode === mode
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
