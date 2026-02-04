// Video Creation Chat Flow Types

export type VideoPhase = 'logo' | 'background' | 'video' | 'copy' | 'complete'

export interface LogoAnalysis {
  colors: {
    primary: string
    secondary: string
    accent: string
    dominant: string[]
  }
  style: string
  composition: string
  suggestions: string[]
}

export interface MarketingCopy {
  headline: string
  body: string
  cta: string
  hashtags: string[]
}

export type VideoModel = 'grok' | 'remotion'

export interface VideoCreationState {
  phase: VideoPhase
  logoUrl: string | null
  logoAnalysis: LogoAnalysis | null
  backgroundPrompt: string | null
  backgroundImages: string[]
  selectedBackground: string | null
  videoPrompt: string | null
  videoModel: VideoModel
  videoSettings: {
    duration: number
    aspectRatio: '16:9' | '4:3' | '1:1' | '9:16' | '3:4' | '3:2' | '2:3'
    resolution: '720p' | '480p'
  }
  videoId: string | null
  videoUrl: string | null
  videoStatus: 'idle' | 'generating' | 'complete' | 'failed'
  videoError: string | null
  marketingCopy: MarketingCopy | null
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  images?: string[] // URLs or data URLs for attached images
  action?: ChatAction
  timestamp: Date
}

export type ChatAction =
  | 'upload_logo'
  | 'use_brand_logo'
  | 'analyzing_logo'
  | 'suggest_background'
  | 'generating_backgrounds'
  | 'select_background'
  | 'configure_video'
  | 'generating_video'
  | 'video_ready'
  | 'generating_copy'
  | 'copy_ready'
  | 'complete'

export interface BrandMetadata {
  availableLogos?: { path: string; downloadUrl: string }[]
  fontFiles?: { path: string; downloadUrl: string; name: string }[]
  detectedFonts?: string[]
  aiAnalysis?: {
    fonts?: { primary?: string; secondary?: string; mono?: string; sources?: string[] }
    allColors?: Record<string, string>
    sources?: Record<string, string>
    summary?: string
  } | null
  extractedAt?: string
}

export interface Brand {
  id: string
  name: string
  description: string | null
  tagline: string | null
  logo_url: string | null
  primary_color: string | null
  secondary_color: string | null
  accent_color: string | null
  website_url: string | null
  github_repo: string | null
  metadata?: BrandMetadata | null
}

export const ASPECT_RATIOS = [
  { value: '16:9' as const, label: 'Landscape', description: 'YouTube, presentations' },
  { value: '9:16' as const, label: 'Portrait', description: 'TikTok, Reels, Stories' },
  { value: '1:1' as const, label: 'Square', description: 'Instagram, social feeds' },
  { value: '4:3' as const, label: 'Classic', description: 'Traditional video' },
  { value: '3:4' as const, label: 'Portrait', description: 'Pinterest, some social' },
]

export const DEFAULT_VIDEO_SETTINGS: VideoCreationState['videoSettings'] = {
  duration: 5,
  aspectRatio: '16:9',
  resolution: '720p',
}

export const VIDEO_MODELS = [
  { value: 'grok' as const, label: 'Grok Imagine', description: 'AI-powered video from image' },
  { value: 'remotion' as const, label: 'Remotion', description: 'Template-based animated video' },
]

export const DEFAULT_VIDEO_MODEL: VideoModel = 'grok'
