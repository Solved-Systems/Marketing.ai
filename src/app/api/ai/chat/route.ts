import { NextRequest, NextResponse } from 'next/server'
import { generateText, createGateway } from 'ai'

export async function POST(request: NextRequest) {
  try {
    const { messages, system } = await request.json()

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

    const { text } = await generateText({
      model: gateway('anthropic/claude-sonnet-4-20250514'),
      system: system || 'You are a helpful assistant.',
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      maxTokens: 1024,
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
