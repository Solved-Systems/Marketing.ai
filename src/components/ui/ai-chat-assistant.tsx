'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sparkles, Send, Loader2, X, MessageSquare, Minimize2, Maximize2, ImagePlus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
  images?: string[] // base64 images
}

interface FormField {
  name: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'color' | 'array'
  description?: string
  options?: string[]
}

interface AIChatAssistantProps {
  formFields: FormField[]
  onFieldUpdate: (fieldName: string, value: unknown) => void
  context?: string
  placeholder?: string
  className?: string
}

export function AIChatAssistant({
  formFields,
  onFieldUpdate,
  context = '',
  placeholder = 'Ask AI to help fill out the form...',
  className,
}: AIChatAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [pendingImages, setPendingImages] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const systemPrompt = `You are a helpful AI assistant that helps users fill out brand guide forms through conversation.

Available form fields:
${formFields.map(f => `- ${f.name} (${f.type}): ${f.label}${f.description ? ` - ${f.description}` : ''}${f.options ? ` Options: ${f.options.join(', ')}` : ''}`).join('\n')}

${context ? `Context: ${context}` : ''}

When the user shares images (like logos, brand materials, screenshots, or style guides):
1. Analyze the visual elements carefully
2. Extract brand colors (provide specific hex codes)
3. Identify typography styles if visible
4. Note any logos, icons, or visual patterns
5. Suggest a brand description based on the visual style

When the user describes what they want, extract the relevant information and respond with:
1. A friendly confirmation of what you understood
2. A JSON block with the field values to update, formatted as:
\`\`\`json
{"fieldUpdates": {"fieldName": "value", ...}}
\`\`\`

For color fields, always provide valid hex codes (e.g., "#FF6B00").
For array fields like "features", format as an array of objects.

Be conversational and helpful. Ask clarifying questions if needed.

Examples:
- If analyzing a logo image: Extract dominant colors and suggest {"fieldUpdates": {"primaryColor": "#3B82F6", "secondaryColor": "#1E40AF"}}
- If user says "My brand is called TechFlow, it's a SaaS company", respond with {"fieldUpdates": {"name": "TechFlow", "description": "SaaS company"}}
- For features, use format: {"fieldUpdates": {"features": [{"icon": "zap", "title": "Fast", "description": "Lightning fast performance"}]}}`

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files) return

    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'))

    for (const file of imageFiles) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const base64 = e.target?.result as string
        setPendingImages(prev => [...prev, base64])
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  const removeImage = (index: number) => {
    setPendingImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!input.trim() && pendingImages.length === 0) || isLoading) return

    const userMessage = input.trim()
    const imagesToSend = [...pendingImages]

    setInput('')
    setPendingImages([])
    setMessages(prev => [...prev, { role: 'user', content: userMessage || 'Analyze these images', images: imagesToSend.length > 0 ? imagesToSend : undefined }])
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage || 'Analyze these images for brand elements like colors, typography, and style.', images: imagesToSend.length > 0 ? imagesToSend : undefined }],
          system: systemPrompt,
        }),
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      const assistantMessage = data.content
      setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }])

      // Extract JSON field updates from response
      const jsonMatch = assistantMessage.match(/```json\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1])
          if (parsed.fieldUpdates) {
            Object.entries(parsed.fieldUpdates).forEach(([field, value]) => {
              onFieldUpdate(field, value)
            })
          }
        } catch {
          // JSON parsing failed, ignore
        }
      }
    } catch (error) {
      console.error('AI chat error:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }])
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={cn('fixed bottom-4 right-4 z-50 shadow-lg', className)}
      >
        <Sparkles className="mr-2 h-4 w-4" />
        AI Assistant
      </Button>
    )
  }

  return (
    <Card className={cn(
      'fixed bottom-4 right-4 z-50 shadow-xl border-primary/50 transition-all duration-200',
      isMinimized ? 'w-72' : 'w-96',
      className
    )}>
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-mono flex items-center">
          <Sparkles className="mr-2 h-4 w-4 text-primary" />
          AI_ASSISTANT
        </CardTitle>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>

      {!isMinimized && (
        <CardContent className="p-0">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'relative transition-colors',
              isDragging && 'bg-primary/10'
            )}
          >
            {isDragging && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10 border-2 border-dashed border-primary rounded-lg m-2">
                <div className="text-center">
                  <ImagePlus className="h-8 w-8 text-primary mx-auto mb-2" />
                  <p className="text-sm text-primary font-mono">Drop images here</p>
                </div>
              </div>
            )}

            <ScrollArea className="h-64 px-4" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Describe what you want and I&apos;ll help fill out the form
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Drop images to extract brand colors & style
                  </p>
                </div>
              ) : (
                <div className="space-y-3 py-4">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={cn(
                        'text-sm p-2 rounded-lg max-w-[85%]',
                        msg.role === 'user'
                          ? 'bg-primary/20 ml-auto'
                          : 'bg-muted'
                      )}
                    >
                      {msg.images && msg.images.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {msg.images.map((img, imgIdx) => (
                            <img
                              key={imgIdx}
                              src={img}
                              alt="Uploaded"
                              className="h-12 w-12 object-cover rounded border border-border"
                            />
                          ))}
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">
                        {msg.content.replace(/```json[\s\S]*?```/g, '').trim()}
                      </p>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="bg-muted text-sm p-2 rounded-lg max-w-[85%]">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Pending images preview */}
          {pendingImages.length > 0 && (
            <div className="px-3 py-2 border-t border-border/50">
              <div className="flex flex-wrap gap-2">
                {pendingImages.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={img}
                      alt="Pending upload"
                      className="h-14 w-14 object-cover rounded border border-primary/50"
                    />
                    <button
                      onClick={() => removeImage(idx)}
                      className="absolute -top-1 -right-1 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-3 border-t">
            <div className="flex space-x-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleFileSelect(e.target.files)}
                accept="image/*"
                multiple
                className="hidden"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0"
                title="Upload images"
              >
                <ImagePlus className="h-4 w-4" />
              </Button>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={pendingImages.length > 0 ? 'Describe or analyze images...' : placeholder}
                disabled={isLoading}
                className="text-sm"
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || (!input.trim() && pendingImages.length === 0)}
                variant="terminal"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      )}
    </Card>
  )
}
