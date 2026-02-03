/**
 * xAI Grok Imagine Video API Client
 */

const XAI_API_BASE = 'https://api.x.ai/v1'

export interface VideoGenerationRequest {
  prompt: string
  model?: string
  duration?: number // 1-15 seconds
  aspect_ratio?: '16:9' | '4:3' | '1:1' | '9:16' | '3:4' | '3:2' | '2:3'
  resolution?: '720p' | '480p'
  image?: { url: string }
}

export interface VideoGenerationResponse {
  request_id: string
}

export interface VideoResultResponse {
  url?: string
  status?: 'pending' | 'processing' | 'completed' | 'failed'
  error?: string
  duration?: number
}

export class XAIClient {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  /**
   * Start a video generation request
   */
  async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    const response = await fetch(`${XAI_API_BASE}/videos/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        prompt: request.prompt,
        model: request.model || 'grok-imagine-video',
        duration: request.duration,
        aspect_ratio: request.aspect_ratio,
        resolution: request.resolution,
        ...(request.image && { image: request.image }),
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `xAI API error: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Get the result of a video generation request
   */
  async getVideoResult(requestId: string): Promise<VideoResultResponse> {
    const response = await fetch(`${XAI_API_BASE}/videos/${requestId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `xAI API error: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Poll for video result with automatic retries
   */
  async waitForVideo(requestId: string, maxAttempts = 60, intervalMs = 5000): Promise<VideoResultResponse> {
    for (let i = 0; i < maxAttempts; i++) {
      const result = await this.getVideoResult(requestId)
      
      if (result.url) {
        return result
      }
      
      if (result.status === 'failed') {
        throw new Error(result.error || 'Video generation failed')
      }

      await new Promise(resolve => setTimeout(resolve, intervalMs))
    }

    throw new Error('Video generation timed out')
  }
}

// Singleton instance
let client: XAIClient | null = null

export function getXAIClient(): XAIClient {
  if (!client) {
    const apiKey = process.env.XAI_API_KEY
    if (!apiKey) {
      throw new Error('XAI_API_KEY environment variable is not set')
    }
    client = new XAIClient(apiKey)
  }
  return client
}
