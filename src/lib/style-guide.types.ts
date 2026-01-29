// Style Guide TypeScript Interfaces
// These define the structure of the JSONB fields in the style_guides table

export interface BrandIdentity {
  mission?: string
  vision?: string
  values?: string[]
  tagline?: string
  elevator_pitch?: string
  brand_story?: string
}

export interface Persona {
  name: string
  role?: string
  age_range?: string
  description: string
  goals?: string[]
  challenges?: string[]
}

export interface TargetAudience {
  demographics?: string
  pain_points?: string[]
  motivations?: string[]
  personas?: Persona[]
  industries?: string[]
  company_sizes?: string[]
}

export interface VoiceAndTone {
  voice_attributes?: string[] // e.g., ["Professional", "Friendly", "Authoritative", "Innovative"]
  tone_guidelines?: string
  dos?: string[]
  donts?: string[]
  example_phrases?: string[]
  writing_style?: string // e.g., "Conversational", "Technical", "Casual"
}

export interface ColorPalette {
  primary?: string
  secondary?: string
  accent?: string
  background?: string
  text?: string
  success?: string
  warning?: string
  error?: string
}

export interface Typography {
  heading_font?: string
  body_font?: string
  heading_weight?: string
  body_weight?: string
}

export interface VisualStyle {
  colors?: ColorPalette
  typography?: Typography
  logo_guidelines?: string
  image_style?: string // e.g., "Photography", "Illustrations", "Mixed"
  mood_keywords?: string[] // e.g., ["Modern", "Clean", "Bold", "Energetic"]
  visual_themes?: string[]
}

export interface ContentGuidelines {
  messaging_pillars?: string[]
  key_themes?: string[]
  topics_to_avoid?: string[]
  hashtag_strategy?: string
  content_types?: string[] // e.g., ["Product demos", "Tutorials", "Behind-the-scenes"]
  call_to_actions?: string[]
  posting_frequency?: string
}

export interface Competitor {
  name: string
  website?: string
  strengths?: string[]
  weaknesses?: string[]
}

export interface CompetitiveContext {
  competitors?: Competitor[]
  differentiators?: string[]
  positioning?: string
  market_position?: string
  unique_value_proposition?: string
}

// Main Style Guide type with all sections
export interface StyleGuideContent {
  brand_identity: BrandIdentity
  target_audience: TargetAudience
  voice_and_tone: VoiceAndTone
  visual_style: VisualStyle
  content_guidelines: ContentGuidelines
  competitive_context: CompetitiveContext
}

// Merged style guide returned by get_merged_style_guide function
export interface MergedStyleGuide extends StyleGuideContent {
  id: string
  name: string
  description?: string
  is_product_level: boolean
  inherited_from?: string
}

// Default empty values for initializing new style guides
export const defaultBrandIdentity: BrandIdentity = {
  mission: '',
  vision: '',
  values: [],
  tagline: '',
  elevator_pitch: '',
  brand_story: '',
}

export const defaultTargetAudience: TargetAudience = {
  demographics: '',
  pain_points: [],
  motivations: [],
  personas: [],
  industries: [],
  company_sizes: [],
}

export const defaultVoiceAndTone: VoiceAndTone = {
  voice_attributes: [],
  tone_guidelines: '',
  dos: [],
  donts: [],
  example_phrases: [],
  writing_style: '',
}

export const defaultVisualStyle: VisualStyle = {
  colors: {
    primary: '#000000',
    secondary: '#ffffff',
    accent: '#0066cc',
    background: '#ffffff',
    text: '#333333',
  },
  typography: {
    heading_font: '',
    body_font: '',
  },
  logo_guidelines: '',
  image_style: '',
  mood_keywords: [],
  visual_themes: [],
}

export const defaultContentGuidelines: ContentGuidelines = {
  messaging_pillars: [],
  key_themes: [],
  topics_to_avoid: [],
  hashtag_strategy: '',
  content_types: [],
  call_to_actions: [],
  posting_frequency: '',
}

export const defaultCompetitiveContext: CompetitiveContext = {
  competitors: [],
  differentiators: [],
  positioning: '',
  market_position: '',
  unique_value_proposition: '',
}

export const defaultStyleGuideContent: StyleGuideContent = {
  brand_identity: defaultBrandIdentity,
  target_audience: defaultTargetAudience,
  voice_and_tone: defaultVoiceAndTone,
  visual_style: defaultVisualStyle,
  content_guidelines: defaultContentGuidelines,
  competitive_context: defaultCompetitiveContext,
}

// Predefined options for UI dropdowns/selections
export const voiceAttributeOptions = [
  'Professional',
  'Friendly',
  'Authoritative',
  'Innovative',
  'Casual',
  'Formal',
  'Playful',
  'Empathetic',
  'Bold',
  'Inspirational',
  'Educational',
  'Conversational',
]

export const writingStyleOptions = [
  'Conversational',
  'Technical',
  'Casual',
  'Formal',
  'Academic',
  'Journalistic',
  'Marketing',
  'Storytelling',
]

export const imageStyleOptions = [
  'Photography',
  'Illustrations',
  'Mixed',
  '3D Renders',
  'Abstract',
  'Minimalist',
  'Stock Photos',
  'Custom Graphics',
]

export const moodKeywordOptions = [
  'Modern',
  'Clean',
  'Bold',
  'Energetic',
  'Calm',
  'Luxurious',
  'Playful',
  'Professional',
  'Warm',
  'Cool',
  'Minimalist',
  'Vibrant',
  'Sophisticated',
  'Approachable',
]

export const contentTypeOptions = [
  'Product demos',
  'Tutorials',
  'Behind-the-scenes',
  'Customer testimonials',
  'Industry insights',
  'Company news',
  'Educational content',
  'Entertainment',
  'User-generated content',
  'Thought leadership',
  'Case studies',
  'How-to guides',
]

export const companySizeOptions = [
  'Startups (1-10)',
  'Small Business (11-50)',
  'Mid-Market (51-200)',
  'Enterprise (201-1000)',
  'Large Enterprise (1000+)',
]
