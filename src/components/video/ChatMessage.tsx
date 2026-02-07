'use client'

import { Button } from '@/components/ui/button'
import {
  Sparkles,
  Pencil,
  Play,
  Download,
  Settings2,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  images?: string[]
  generatedImages?: string[]
  generatedVideo?: string
  isGenerating?: boolean
  isAnimating?: boolean
  parentImageUrl?: string
  timestamp?: string
  generationEngine?: string
  imageSize?: string
}

interface ChatMessageProps {
  message: Message
  onEdit?: (imageUrl: string) => void
  onAnimate?: (messageId: string, imageUrl: string) => void
  onVideoEdit?: (videoUrl: string, originalImageUrl?: string) => void
  imageSizes?: { value: string; aspectRatio: string }[]
}

export function ChatMessage({
  message,
  onEdit,
  onAnimate,
  onVideoEdit,
  imageSizes = [],
}: ChatMessageProps) {
  const isUser = message.role === 'user'

  const handleDownload = (url: string, type: 'image' | 'video') => {
    const link = document.createElement('a')
    link.href = url
    link.download = `${type}-${Date.now()}.${type === 'image' ? 'png' : 'mp4'}`
    link.click()
  }

  return (
    <div className="group/message animate-in fade-in duration-300 w-full">
      <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
        {/* Avatar */}
        {!isUser && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
        )}

        {/* Content */}
        <div className={cn('flex flex-col gap-2', isUser ? 'items-end' : 'items-start', 'max-w-[80%]')}>
          {/* User attached images */}
          {message.images && message.images.length > 0 && (
            <div className="flex gap-2">
              {message.images.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt=""
                  className="h-16 w-16 object-cover rounded-lg ring-1 ring-border"
                />
              ))}
            </div>
          )}

          {/* Text bubble */}
          {message.content && (
            <div
              className={cn(
                'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                isUser
                  ? 'bg-[#006cff] text-white'
                  : 'bg-muted text-foreground'
              )}
            >
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            </div>
          )}

          {/* Generating skeleton */}
          {message.isGenerating && (
            <div className="w-72 aspect-square rounded-2xl bg-muted/50 ring-1 ring-border/50 flex items-center justify-center">
              <div className="text-center space-y-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                </div>
                <p className="text-xs text-muted-foreground">Generating...</p>
              </div>
            </div>
          )}

          {/* Generated images */}
          {message.generatedImages && message.generatedImages.length > 0 && !message.generatedVideo && (
            <div className="space-y-3">
              {message.generatedImages.map((img, idx) => (
                <div key={idx} className="relative group/image">
                  {message.isAnimating ? (
                    <div className="relative w-72">
                      <img
                        src={img}
                        alt=""
                        className="w-full rounded-2xl opacity-40"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center space-y-2">
                          <Loader2 className="h-5 w-5 text-primary animate-spin mx-auto" />
                          <p className="text-xs font-medium">Animating...</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative w-72">
                      <img
                        src={img}
                        alt=""
                        className="w-full rounded-2xl ring-1 ring-border/50"
                      />

                      {/* Engine badge */}
                      {message.generationEngine && (
                        <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 backdrop-blur-sm rounded-full">
                          <span className="text-[10px] font-medium text-white">
                            {message.generationEngine === 'grok-imagine' ? 'Grok' : 'DALL·E'}
                          </span>
                          {message.imageSize && (
                            <span className="text-[10px] text-white/60 ml-1.5">
                              {imageSizes.find(s => s.value === message.imageSize)?.aspectRatio}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Hover actions */}
                      <div className="absolute bottom-3 right-3 flex gap-1.5 opacity-0 group-hover/image:opacity-100 transition-opacity duration-200">
                        {onEdit && (
                          <Button
                            size="sm"
                            onClick={() => onEdit(img)}
                            className="h-8 px-3 text-xs bg-white hover:bg-white/90 text-black shadow-lg"
                          >
                            <Pencil className="h-3 w-3 mr-1.5" />
                            Edit
                          </Button>
                        )}
                        {onAnimate && (
                          <Button
                            size="sm"
                            onClick={() => onAnimate(message.id, img)}
                            className="h-8 px-3 text-xs shadow-lg"
                          >
                            <Play className="h-3 w-3 mr-1.5" />
                            Animate
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleDownload(img, 'image')}
                          className="h-8 w-8 p-0 bg-white hover:bg-white/90 text-black shadow-lg"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Generated video */}
          {message.generatedVideo && (
            <div className="relative group/video w-72">
              <video
                src={message.generatedVideo}
                controls
                autoPlay
                muted
                loop
                className="w-full rounded-2xl ring-1 ring-border/50"
              />
              <div className="absolute bottom-3 right-3 flex gap-1.5 opacity-0 group-hover/video:opacity-100 transition-opacity duration-200">
                {onVideoEdit && (
                  <Button
                    size="sm"
                    onClick={() => onVideoEdit(message.generatedVideo!, message.parentImageUrl)}
                    className="h-8 px-3 text-xs bg-white hover:bg-white/90 text-black shadow-lg"
                  >
                    <Settings2 className="h-3 w-3 mr-1.5" />
                    Edit
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => handleDownload(message.generatedVideo!, 'video')}
                  className="h-8 w-8 p-0 bg-white hover:bg-white/90 text-black shadow-lg"
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
