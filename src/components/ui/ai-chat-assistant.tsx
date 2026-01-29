'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sparkles, Send, Loader2, X, MessageSquare, Minimize2, Maximize2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
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
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const systemPrompt = `You are a helpful AI assistant that helps users fill out forms through conversation.

Available form fields:
${formFields.map(f => `- ${f.name} (${f.type}): ${f.label}${f.description ? ` - ${f.description}` : ''}${f.options ? ` Options: ${f.options.join(', ')}` : ''}`).join('\n')}

${context ? `Context: ${context}` : ''}

When the user describes what they want, extract the relevant information and respond with:
1. A friendly confirmation of what you understood
2. A JSON block with the field values to update, formatted as:
\`\`\`json
{"fieldUpdates": {"fieldName": "value", ...}}
\`\`\`

Be conversational and helpful. Ask clarifying questions if needed. For array fields like "features", format as an array of objects.

Examples:
- If user says "My brand is called TechFlow, it's a SaaS company", respond with confirmation and {"fieldUpdates": {"name": "TechFlow", "description": "SaaS company"}}
- If user says "Use blue as the primary color", respond with {"fieldUpdates": {"primaryColor": "#3B82F6"}}
- For features, use format: {"fieldUpdates": {"features": [{"icon": "zap", "title": "Fast", "description": "Lightning fast performance"}]}}`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }],
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
          <ScrollArea className="h-64 px-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Describe what you want and I'll help fill out the form
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

          <form onSubmit={handleSubmit} className="p-3 border-t">
            <div className="flex space-x-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={placeholder}
                disabled={isLoading}
                className="text-sm"
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || !input.trim()}
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
