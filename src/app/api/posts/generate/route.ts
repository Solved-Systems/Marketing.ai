import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

interface GeneratePostRequest {
  brandId: string
  brandName?: string
  brandDescription?: string
  brandTagline?: string
  context: {
    type: 'pr' | 'commit' | 'release' | 'feature' | 'custom'
    title: string
    description?: string
    url?: string
    author?: string
    date?: string
  }
  tone?: 'professional' | 'casual' | 'technical' | 'exciting'
  platform?: 'linkedin' | 'twitter' | 'instagram' | 'general'
  includeImage?: boolean
  imagePrompt?: string
}

export async function POST(request: NextRequest) {
  const session = await auth()

  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const body: GeneratePostRequest = await request.json()
    const {
      brandName = 'Our Company',
      brandDescription,
      brandTagline,
      context,
      tone = 'professional',
      platform = 'general',
    } = body

    // Build context-specific prompt
    let contextDescription = ''
    switch (context.type) {
      case 'pr':
        contextDescription = `A pull request was merged: "${context.title}"${context.description ? `\n\nDetails: ${context.description}` : ''}${context.author ? `\n\nContributor: ${context.author}` : ''}`
        break
      case 'commit':
        contextDescription = `A new commit was made: "${context.title}"${context.author ? ` by ${context.author}` : ''}`
        break
      case 'release':
        contextDescription = `A new release is available: "${context.title}"${context.description ? `\n\n${context.description}` : ''}`
        break
      case 'feature':
        contextDescription = `A new feature has been added: "${context.title}"${context.description ? `\n\n${context.description}` : ''}`
        break
      case 'custom':
        contextDescription = context.title + (context.description ? `\n\n${context.description}` : '')
        break
    }

    // Platform-specific constraints
    const platformConstraints = {
      linkedin: 'LinkedIn post (professional tone, can be longer, use line breaks for readability)',
      twitter: 'Twitter/X post (max 280 characters, punchy and engaging)',
      instagram: 'Instagram caption (casual, emoji-friendly, encourage engagement)',
      general: 'Social media post (versatile, works across platforms)',
    }

    // Tone descriptions
    const toneDescriptions = {
      professional: 'professional and polished',
      casual: 'friendly and conversational',
      technical: 'technically detailed but accessible',
      exciting: 'enthusiastic and energetic',
    }

    const systemPrompt = `You are a marketing copywriter for ${brandName}.
${brandDescription ? `About the company: ${brandDescription}` : ''}
${brandTagline ? `Brand tagline: ${brandTagline}` : ''}

Generate a ${toneDescriptions[tone]} ${platformConstraints[platform]}.

The post should announce or highlight:
${contextDescription}

Guidelines:
- Make it engaging and shareable
- Include a clear call-to-action when appropriate
- For technical updates, translate them into user benefits
- Use the brand voice consistently
${platform === 'twitter' ? '- MUST be under 280 characters' : ''}

Respond with ONLY a JSON block in this exact format:
\`\`\`json
{
  "headline": "Short attention-grabbing headline (under 60 chars)",
  "body": "Main post content here. Can include line breaks for readability.",
  "cta": "Call to action text",
  "hashtags": ["#Hashtag1", "#Hashtag2", "#Hashtag3", "#Hashtag4", "#Hashtag5"],
  "imagePrompt": "A brief description for generating an accompanying image"
}
\`\`\``

    // Call AI to generate copy
    const aiResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Generate the marketing post as specified.' }],
        system: systemPrompt,
      }),
    })

    if (!aiResponse.ok) {
      throw new Error('AI request failed')
    }

    const aiData = await aiResponse.json()
    const content = aiData.content || ''

    // Parse JSON from response
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)
    if (!jsonMatch) {
      throw new Error('Could not parse AI response')
    }

    const parsed = JSON.parse(jsonMatch[1])

    return NextResponse.json({
      success: true,
      post: {
        headline: parsed.headline,
        body: parsed.body,
        cta: parsed.cta,
        hashtags: parsed.hashtags,
        imagePrompt: parsed.imagePrompt,
        context: {
          type: context.type,
          title: context.title,
          url: context.url,
        },
        platform,
        tone,
      },
    })
  } catch (error) {
    console.error('Post generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Post generation failed' },
      { status: 500 }
    )
  }
}
