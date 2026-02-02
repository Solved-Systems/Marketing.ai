'use client'

import React, { useMemo } from 'react'
import { Player } from '@remotion/player'
import {
  FeatureAnnouncement,
  ProductDemo,
  SocialTeaser,
  ReleaseNotes,
} from '@/remotion'

export interface VideoPreviewProps {
  template: 'feature' | 'product' | 'social' | 'release'
  duration: '15 seconds' | '30 seconds' | '60 seconds'
  title: string
  description: string
  features: string[]
  callToAction: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  brandName: string
  style: 'Modern' | 'Minimal' | 'Bold' | 'Playful'
}

const FPS = 30

const DURATIONS = {
  '15 seconds': 15 * FPS,
  '30 seconds': 30 * FPS,
  '60 seconds': 60 * FPS,
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({
  template,
  duration,
  title,
  description,
  features,
  callToAction,
  primaryColor,
  secondaryColor,
  accentColor,
  brandName,
  style,
}) => {
  const Component = useMemo(() => {
    switch (template) {
      case 'product':
        return ProductDemo
      case 'social':
        return SocialTeaser
      case 'release':
        return ReleaseNotes
      default:
        return FeatureAnnouncement
    }
  }, [template])

  const inputProps = useMemo(
    () => ({
      title: title || 'Your Video Title',
      description: description || 'Add a description for your video',
      features: features.length > 0 ? features : ['Feature 1', 'Feature 2', 'Feature 3'],
      callToAction: callToAction || 'Learn More',
      primaryColor: primaryColor || '#6366f1',
      secondaryColor: secondaryColor || '#8b5cf6',
      accentColor: accentColor || '#22c55e',
      brandName: brandName || 'Brand',
      style,
    }),
    [title, description, features, callToAction, primaryColor, secondaryColor, accentColor, brandName, style]
  )

  const dimensions = useMemo(() => {
    if (template === 'social') {
      return { width: 1080, height: 1080 }
    }
    return { width: 1920, height: 1080 }
  }, [template])

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
      <Player
        component={Component}
        inputProps={inputProps}
        durationInFrames={DURATIONS[duration]}
        fps={FPS}
        compositionWidth={dimensions.width}
        compositionHeight={dimensions.height}
        style={{
          width: '100%',
          height: '100%',
        }}
        controls
        autoPlay={false}
        loop
      />
    </div>
  )
}
