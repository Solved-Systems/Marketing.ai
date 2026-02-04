// Unified Content Creation Types

export type ContentType = 'video' | 'image' | 'post'

export interface GeneratedContent {
  id: string
  type: ContentType
  url?: string // For video/image
  text?: string // For post
  caption?: string // Caption for video/image
  hashtags?: string[]
  createdAt: Date
}

export interface ContentChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  images?: string[] // URLs or data URLs
  generatedContent?: GeneratedContent // Content generated in this message
  action?: ContentAction
  timestamp: Date
}

export type ContentAction =
  | 'idle'
  | 'generating_image'
  | 'generating_video'
  | 'generating_post'
  | 'generating_caption'
  | 'complete'

export interface ContentCreationState {
  // Current generation status
  isGenerating: boolean
  currentAction: ContentAction

  // Generated content in session
  generatedItems: GeneratedContent[]

  // Video-specific state
  videoId?: string
  videoStatus?: 'idle' | 'generating' | 'complete' | 'failed'
  backgroundImages?: string[]
  selectedBackground?: string

  // Last generated item for chaining
  lastGeneratedType?: ContentType
}

export const DEFAULT_CONTENT_STATE: ContentCreationState = {
  isGenerating: false,
  currentAction: 'idle',
  generatedItems: [],
}
