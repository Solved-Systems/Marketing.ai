'use client'

import { Button } from '@/components/ui/button'
import {
  Wand2,
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
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[85%]', isUser ? 'order-1' : '')}>
        {/* Message content */}
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5',
            isUser
              ? 'bg-foreground text-background'
              : 'bg-muted'
          )}
        >
          {/* User images */}
          {message.images && message.images.length > 0 && (
            <div className="flex gap-2 mb-2">
              {message.images.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt=""
                  className="h-12 w-12 object-contain rounded-lg"
                />
              ))}
            </div>
          )}

          {/* Text content */}
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {message.content}
          </p>
        </div>

        {/* Loading skeleton for generation */}
        {message.isGenerating && (
          <div className="mt-3 w-80 aspect-square rounded-2xl bg-muted flex items-center justify-center">
            <div className="text-center">
              <Wand2 className="h-6 w-6 text-muted-foreground animate-pulse mx-auto mb-2" />
              <span className="text-xs text-muted-foreground">Generating...</span>
            </div>
          </div>
        )}

        {/* Generated images */}
        {message.generatedImages && message.generatedImages.length > 0 && !message.generatedVideo && (
          <div className="mt-3 space-y-3">
            {message.generatedImages.map((img, idx) => (
              <div key={idx} className="relative group">
                {message.isAnimating ? (
                  <div className="relative w-80">
                    <img
                      src={img}
                      alt=""
                      className="w-full rounded-2xl opacity-50"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <Loader2 className="h-6 w-6 text-foreground animate-spin mx-auto mb-2" />
                        <span className="text-xs text-foreground font-medium">Animating...</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative w-80">
                    <img
                      src={img}
                      alt=""
                      className="w-full rounded-2xl"
                    />

                    {/* Badge */}
                    {message.generationEngine && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded-full text-[10px] text-white/90 font-medium">
                        {message.generationEngine === 'grok-imagine' ? 'Grok' : 'DALL·E'}
                        {message.imageSize && (
                          <span className="text-white/60 ml-1">
                            {imageSizes.find(s => s.value === message.imageSize)?.aspectRatio}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Hover actions */}
                    <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onEdit && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onEdit(img)}
                          className="h-7 px-2 text-xs bg-white/90 hover:bg-white text-black border-0"
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      )}
                      {onAnimate && (
                        <Button
                          size="sm"
                          onClick={() => onAnimate(message.id, img)}
                          className="h-7 px-2 text-xs"
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Animate
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleDownload(img, 'image')}
                        className="h-7 w-7 p-0 bg-white/90 hover:bg-white text-black border-0"
                      >
                        <Download className="h-3 w-3" />
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
          <div className="mt-3 relative group w-80">
            <video
              src={message.generatedVideo}
              controls
              autoPlay
              muted
              loop
              className="w-full rounded-2xl"
            />
            <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {onVideoEdit && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onVideoEdit(message.generatedVideo!, message.parentImageUrl)}
                  className="h-7 px-2 text-xs bg-white/90 hover:bg-white text-black border-0"
                >
                  <Settings2 className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              )}
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleDownload(message.generatedVideo!, 'video')}
                className="h-7 w-7 p-0 bg-white/90 hover:bg-white text-black border-0"
              >
                <Download className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
