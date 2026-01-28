import { generateText, streamText, generateObject } from 'ai'
import { z } from 'zod'

/**
 * AI utilities using Vercel AI Gateway
 *
 * The AI Gateway provides a unified API to access models from multiple providers.
 * Set the AI_GATEWAY_API_KEY environment variable to authenticate.
 *
 * Model format: 'provider/model-name'
 * Examples:
 *   - 'anthropic/claude-sonnet-4-20250514'
 *   - 'openai/gpt-4o'
 *   - 'google/gemini-pro'
 */

// Default model to use
export const DEFAULT_MODEL = 'anthropic/claude-sonnet-4-20250514'

/**
 * Generate text content using AI Gateway
 */
export async function generateContent(options: {
  prompt: string
  system?: string
  model?: string
  maxTokens?: number
}) {
  const { prompt, system, model = DEFAULT_MODEL, maxTokens = 4096 } = options

  const result = await generateText({
    model,
    system,
    prompt,
    maxTokens,
  })

  return result.text
}

/**
 * Stream text content using AI Gateway
 */
export async function streamContent(options: {
  prompt: string
  system?: string
  model?: string
  maxTokens?: number
}) {
  const { prompt, system, model = DEFAULT_MODEL, maxTokens = 4096 } = options

  const result = streamText({
    model,
    system,
    prompt,
    maxTokens,
  })

  return result
}

/**
 * Generate structured JSON using AI Gateway
 */
export async function generateStructured<T>(options: {
  prompt: string
  schema: z.ZodType<T>
  system?: string
  model?: string
  maxTokens?: number
}): Promise<T> {
  const { prompt, schema, system, model = DEFAULT_MODEL, maxTokens = 4096 } = options

  const result = await generateObject({
    model,
    system,
    prompt,
    schema,
    maxTokens,
  })

  return result.object
}

// Schema for video script generation
export const videoScriptSchema = z.object({
  templateId: z.string(),
  inputProps: z.record(z.unknown()),
  reasoning: z.string(),
})

// Schema for feature analysis
export const featureAnalysisSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  features: z.array(z.object({
    icon: z.enum(['zap', 'shield', 'sparkles', 'star', 'rocket', 'heart', 'globe', 'lock', 'check']),
    title: z.string(),
    description: z.string(),
  })),
  ctaText: z.string(),
  summary: z.string(),
})

// Schema for marketing content
export const marketingContentSchema = z.object({
  headline: z.string(),
  subheadline: z.string(),
  bodyText: z.string(),
  callToAction: z.string(),
  hashtags: z.array(z.string()),
  tone: z.enum(['professional', 'casual', 'urgent', 'inspiring']),
})

// Schema for social media posts
export const socialPostSchema = z.object({
  posts: z.array(z.object({
    platform: z.enum(['linkedin', 'twitter', 'instagram', 'tiktok']),
    text: z.string(),
    hashtags: z.array(z.string()),
    characterCount: z.number(),
  })),
})

// Schema for image generation
export const imageGenerationSchema = z.object({
  enhancedPrompt: z.string(),
  style: z.enum(['modern', 'minimalist', 'bold', 'corporate']),
  imageType: z.enum(['social', 'banner', 'ad', 'product']),
  suggestedColors: z.array(z.string()).optional(),
})

export type VideoScript = z.infer<typeof videoScriptSchema>
export type FeatureAnalysis = z.infer<typeof featureAnalysisSchema>
export type MarketingContent = z.infer<typeof marketingContentSchema>
export type SocialPost = z.infer<typeof socialPostSchema>
export type ImageGeneration = z.infer<typeof imageGenerationSchema>
