// MRKTCMD AI Model Tiers and Credit Costs

import type { CreditCost, GenerationType } from '@/types/billing'

// Credit costs by generation type
export const CREDIT_COSTS: Record<GenerationType, CreditCost> = {
  text_post: {
    type: 'text_post',
    credits: 1,
    label: 'Text Post',
    description: 'Social media post generation',
    model: 'Claude Sonnet 4',
  },
  image_default: {
    type: 'image_default',
    credits: 1,
    label: 'Image (Fast)',
    description: 'Quick image generation',
    model: 'FLUX.2 Klein 4B',
  },
  image_standard: {
    type: 'image_standard',
    credits: 3,
    label: 'Image (Standard)',
    description: 'High-quality image generation',
    model: 'FLUX.2 Pro',
  },
  image_premium: {
    type: 'image_premium',
    credits: 5,
    label: 'Image (Premium)',
    description: 'Best quality image generation',
    model: 'FLUX.2 Max / Imagen 4',
  },
  video_default: {
    type: 'video_default',
    credits: 10,
    label: 'Video (Standard)',
    description: 'Standard video generation',
    model: 'Remotion + Opus',
  },
  video_premium: {
    type: 'video_premium',
    credits: 20,
    label: 'Video (Premium)',
    description: 'High-quality video generation',
    model: 'Remotion + Opus (HQ)',
  },
}

// Model quality tiers for user selection
export type ModelQuality = 'default' | 'standard' | 'premium'

export interface ModelTier {
  quality: ModelQuality
  label: string
  description: string
}

export const IMAGE_TIERS: ModelTier[] = [
  {
    quality: 'default',
    label: 'Fast',
    description: '1 credit - Quick generation with FLUX.2 Klein',
  },
  {
    quality: 'standard',
    label: 'Standard',
    description: '3 credits - High quality with FLUX.2 Pro',
  },
  {
    quality: 'premium',
    label: 'Premium',
    description: '5 credits - Best quality with FLUX.2 Max',
  },
]

export const VIDEO_TIERS: ModelTier[] = [
  {
    quality: 'default',
    label: 'Standard',
    description: '10 credits - Standard quality video',
  },
  {
    quality: 'premium',
    label: 'Premium',
    description: '20 credits - High quality video',
  },
]

// Helper functions
export function getImageGenerationType(quality: ModelQuality): GenerationType {
  switch (quality) {
    case 'default':
      return 'image_default'
    case 'standard':
      return 'image_standard'
    case 'premium':
      return 'image_premium'
    default:
      return 'image_default'
  }
}

export function getVideoGenerationType(quality: ModelQuality): GenerationType {
  return quality === 'premium' ? 'video_premium' : 'video_default'
}

export function getCreditCost(type: GenerationType): number {
  return CREDIT_COSTS[type].credits
}

export function getModelName(type: GenerationType): string {
  return CREDIT_COSTS[type].model || 'Unknown'
}
