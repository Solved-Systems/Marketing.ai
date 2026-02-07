import { getXAIClient } from '@/lib/xai/client'

export interface StartGrokVideoOptions {
  prompt: string
  imageUrl?: string
  duration?: number
  aspectRatio?: '16:9' | '9:16' | '1:1'
}

export async function startGrokVideo(options: StartGrokVideoOptions) {
  const xai = getXAIClient()
  const response = await xai.generateVideo({
    prompt: options.prompt,
    duration: options.duration || 5,
    aspect_ratio: options.aspectRatio || '16:9',
    resolution: '720p',
    ...(options.imageUrl && { image: { url: options.imageUrl } }),
  })
  return { requestId: response.request_id }
}

export async function checkGrokVideoStatus(requestId: string) {
  const xai = getXAIClient()
  const result = await xai.getVideoResult(requestId)

  if (result.url) {
    return { status: 'completed' as const, outputUrl: result.url, message: 'Video is ready!' }
  }

  if (result.status === 'failed') {
    return { status: 'failed' as const, error: result.error || 'Generation failed' }
  }

  return { status: 'processing' as const, message: 'Still generating...' }
}
