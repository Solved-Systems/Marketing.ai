// Content Creation Chat Flow Types

export type ContentPhase = 'compose' | 'iterate' | 'animate' | 'copy' | 'complete'

// Keep old type for backwards compatibility
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

// New content creation state
export interface ContentCreationState {
  phase: ContentPhase
  // Uploaded reference images (logos, icons, etc.)
  uploadedImages: string[]
  // Brand's style prompt (from project instructions)
  stylePrompt: string | null
  // User's description of what to create
  userPrompt: string | null
  // Generated composite images (multiple for selection)
  generatedImages: string[]
  // Currently selected/approved image
  selectedImage: string | null
  // Image generation history (for iterations)
  imageHistory: {
    prompt: string
    images: string[]
    feedback?: string
  }[]
  // Video settings
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
  videoProgress?: number // 0-100
  videoStartTime?: number // timestamp when generation started
  // Marketing copy
  marketingCopy: MarketingCopy | null
  // Social posting
  postingStatus: {
    linkedin?: 'pending' | 'posted' | 'failed'
    twitter?: 'pending' | 'posted' | 'failed'
    instagram?: 'pending' | 'posted' | 'failed'
  }
}

// Keep old state for backwards compatibility
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
  videoProgress?: number // 0-100
  videoStartTime?: number // timestamp when generation started
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
  // New actions for composite workflow
  | 'upload_images'
  | 'generating_composite'
  | 'composite_ready'
  | 'iterate_image'
  | 'approve_image'
  | 'animate_image'
  | 'post_content'

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
  // Brand style prompt for image generation
  stylePrompt?: string
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

export const DEFAULT_VIDEO_SETTINGS: ContentCreationState['videoSettings'] = {
  duration: 5,
  aspectRatio: '16:9',
  resolution: '720p',
}

export const VIDEO_MODELS = [
  { value: 'grok' as const, label: 'Grok Imagine', description: 'AI-powered video from image' },
  { value: 'remotion' as const, label: 'Remotion', description: 'Template-based animated video' },
]

export const DEFAULT_VIDEO_MODEL: VideoModel = 'grok'

// Default style prompt for industrial/energy brands
export const DEFAULT_STYLE_PROMPT = `A wide, zoomed-out cinematic background depicting a large-scale industrial or infrastructure environment set in an open landscape at twilight. The scene features multiple structural elements arranged with strong depth and perspective, extending from foreground to horizon. Key forms are outlined with glowing neon linework (primary accent color: hex #36CF82), creating a clean, grid-like visual language across the ground plane and structures.

The environment is minimalist and expansive, with distant natural features on the horizon beneath a clear, star-speckled gradient sky enhanced with subtle abstract data motifs. The overall aesthetic is retro-futurist and Tron-inspired, emphasizing crisp edges, high contrast, and a sleek, engineered feel.

**Style:** Retro-futurist neon linework, "Tron-inspired landscape," crisp vector-like rim glow, cinematic twilight lighting, subtle film grain.
**Composition:** Widescreen, rule of thirds, strong leading lines converging toward the horizon.
**Lighting:** Twilight rim lighting emphasizing neon outlines.
**Palette:** #36CF82, #0A0F0F, #0E1A14, #1F3A28, #DA8A27`

export const initialContentState: ContentCreationState = {
  phase: 'compose',
  uploadedImages: [],
  stylePrompt: null,
  userPrompt: null,
  generatedImages: [],
  selectedImage: null,
  imageHistory: [],
  videoModel: 'grok',
  videoSettings: DEFAULT_VIDEO_SETTINGS,
  videoId: null,
  videoUrl: null,
  videoStatus: 'idle',
  videoError: null,
  marketingCopy: null,
  postingStatus: {},
}
