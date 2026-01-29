import { NextRequest, NextResponse } from 'next/server'
import { generateText, createGateway } from 'ai'

interface MessageInput {
  role: 'user' | 'assistant'
  content: string
  images?: string[] // base64 data URLs
}

type ContentPart = { type: 'text'; text: string } | { type: 'image'; image: string }

export async function POST(request: NextRequest) {
  try {
    const { messages, system } = await request.json() as { messages: MessageInput[], system?: string }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 })
    }

    const apiKey = process.env.AI_GATEWAY_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'AI Gateway API key not configured' }, { status: 500 })
    }

    const gateway = createGateway({
      apiKey,
    })

    // Convert messages to multi-part format if they contain images
    const formattedMessages = messages.map((m) => {
      if (m.role === 'user' && m.images && m.images.length > 0) {
        // Create multi-part content with text and images
        const content: ContentPart[] = []

        // Add text part if there's content
        if (m.content) {
          content.push({ type: 'text', text: m.content })
        }

        // Add image parts
        for (const imageData of m.images) {
          content.push({ type: 'image', image: imageData })
        }

        return {
          role: 'user' as const,
          content,
        }
      }

      // Regular text message
      return {
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }
    })

    const { text } = await generateText({
      model: gateway('anthropic/claude-sonnet-4-20250514'),
      system: system || 'You are a helpful assistant.',
      messages: formattedMessages,
      maxOutputTokens: 1024,
    })

    return NextResponse.json({ content: text })
  } catch (error) {
    console.error('AI chat error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
