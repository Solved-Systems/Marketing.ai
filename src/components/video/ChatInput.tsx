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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim() || uploadedImages.length > 0) {
        onSubmit(e)
      }
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
    // Auto-resize
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
  }

  return (
    <div className="space-y-3">
      {/* Uploaded images preview */}
      {uploadedImages.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {uploadedImages.map((img, idx) => (
            <div key={idx} className="relative group flex-shrink-0">
              <img
                src={img}
                alt=""
                className="h-16 w-16 object-cover rounded-lg ring-1 ring-border"
              />
              <button
                type="button"
                onClick={() => onRemoveImage(idx)}
                className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main input container */}
      <div className="rounded-xl border border-border bg-background shadow-sm">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => e.target.files && onFilesSelected(e.target.files)}
        />

        {/* Textarea */}
        <div className="p-3">
          <textarea
            value={value}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={
              generationMode === 'remotion'
                ? 'Add custom text for your video (title, description, features...)'
                : 'Describe what you want to create...'
            }
            disabled={isLoading}
            rows={1}
            className="w-full resize-none border-0 bg-transparent text-sm leading-relaxed placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0 min-h-[24px] max-h-[200px]"
          />
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-2 px-3 pb-3">
          <div className="flex items-center gap-2">
            {/* Attach button - only for image modes */}
            {generationMode !== 'remotion' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                disabled={isLoading}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            )}

            {/* Mode-specific controls */}
            {generationMode === 'remotion' ? (
              <div className="flex items-center gap-1.5">
                <Select value={remotionTemplate} onValueChange={onRemotionTemplateChange}>
                  <SelectTrigger className="h-8 w-auto gap-1 text-xs border-0 bg-muted/50 hover:bg-muted px-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {remotionTemplates.map(t => (
                      <SelectItem key={t.value} value={t.value} className="text-xs">
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={remotionDuration} onValueChange={onRemotionDurationChange}>
                  <SelectTrigger className="h-8 w-16 text-xs border-0 bg-muted/50 hover:bg-muted px-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {remotionDurations.map(d => (
                      <SelectItem key={d.value} value={d.value} className="text-xs">
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={remotionStyle} onValueChange={onRemotionStyleChange}>
                  <SelectTrigger className="h-8 w-20 text-xs border-0 bg-muted/50 hover:bg-muted px-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {remotionStyles.map(s => (
                      <SelectItem key={s.value} value={s.value} className="text-xs">
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <Select value={imageSize} onValueChange={onImageSizeChange}>
                <SelectTrigger className="h-8 w-16 text-xs border-0 bg-muted/50 hover:bg-muted px-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {imageSizes.map(s => (
                    <SelectItem key={s.value} value={s.value} className="text-xs">
                      {s.aspectRatio}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Submit button */}
          <Button
            type={generationMode === 'remotion' ? 'button' : 'submit'}
            size="sm"
            onClick={generationMode === 'remotion' ? (onSubmit as () => void) : undefined}
            disabled={
              isLoading ||
              (generationMode === 'remotion' ? !hasBrand : (!value.trim() && uploadedImages.length === 0))
            }
            className="h-8 px-3"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                <span className="text-xs">
                  {generationMode === 'remotion' ? 'Rendering' : 'Generating'}
                </span>
              </>
            ) : (
              <>
                {generationMode === 'remotion' ? (
                  <Clapperboard className="h-4 w-4 mr-1.5" />
                ) : (
                  <Send className="h-4 w-4 mr-1.5" />
                )}
                <span className="text-xs">
                  {generationMode === 'remotion' ? 'Generate' : 'Send'}
                </span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Engine selector */}
      <div className="flex items-center justify-center">
        <div className="inline-flex items-center gap-0.5 p-1 rounded-full bg-muted/50">
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
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                generationMode === mode
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
