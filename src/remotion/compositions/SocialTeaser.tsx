'use client'

import React from 'react'
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from 'remotion'

export interface SocialTeaserProps {
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

export const SocialTeaser: React.FC<SocialTeaserProps> = ({
  title,
  description,
  callToAction,
  primaryColor,
  secondaryColor,
  accentColor: _accentColor,
  brandName,
  style: _style,
}) => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()

  // Fast-paced timing for social
  const titleIn = 5
  const titleOut = Math.floor(durationInFrames * 0.4)
  const ctaIn = Math.floor(durationInFrames * 0.6)
  void _accentColor // Reserved for accent color styling
  void _style // Reserved for style-specific rendering

  // Animations
  const titleScale = spring({
    frame: frame - titleIn,
    fps,
    config: { damping: 12, stiffness: 200 },
  })

  const titleOpacity = interpolate(
    frame,
    [titleIn, titleIn + 10, titleOut, titleOut + 15],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )

  const descOpacity = interpolate(
    frame,
    [titleIn + 15, titleIn + 25, titleOut - 10, titleOut],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )

  const ctaOpacity = interpolate(frame, [ctaIn, ctaIn + 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const ctaScale = spring({
    frame: frame - ctaIn,
    fps,
    config: { damping: 10, stiffness: 180 },
  })

  // Pulsing background
  const pulse = Math.sin(frame / 15) * 0.1 + 1

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Animated shapes */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          right: '-10%',
          width: 400,
          height: 400,
          borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.1)',
          transform: `scale(${pulse})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-20%',
          left: '-10%',
          width: 500,
          height: 500,
          borderRadius: '50%',
          backgroundColor: 'rgba(0,0,0,0.1)',
          transform: `scale(${1 + Math.cos(frame / 20) * 0.1})`,
        }}
      />

      {/* Brand logo area */}
      <div
        style={{
          position: 'absolute',
          top: 40,
          left: 40,
          fontSize: 32,
          fontWeight: 800,
          color: '#ffffff',
          textShadow: '0 2px 10px rgba(0,0,0,0.3)',
        }}
      >
        {brandName}
      </div>

      {/* Main content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: 60,
          textAlign: 'center',
        }}
      >
        {/* Title section */}
        <div style={{ opacity: titleOpacity }}>
          <h1
            style={{
              fontSize: 96,
              fontWeight: 900,
              color: '#ffffff',
              lineHeight: 1.1,
              marginBottom: 24,
              transform: `scale(${titleScale})`,
              textShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}
          >
            {title}
          </h1>
          <p
            style={{
              fontSize: 32,
              color: 'rgba(255,255,255,0.9)',
              maxWidth: 700,
              opacity: descOpacity,
            }}
          >
            {description}
          </p>
        </div>

        {/* CTA section */}
        {frame >= ctaIn && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: ctaOpacity,
            }}
          >
            <div
              style={{
                padding: '24px 64px',
                backgroundColor: '#ffffff',
                borderRadius: 16,
                fontSize: 36,
                fontWeight: 800,
                color: primaryColor,
                transform: `scale(${ctaScale})`,
                boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
              }}
            >
              {callToAction || 'Learn More'}
            </div>
            <p
              style={{
                marginTop: 24,
                fontSize: 20,
                color: 'rgba(255,255,255,0.8)',
              }}
            >
              {brandName.toLowerCase()}.com
            </p>
          </div>
        )}
      </div>
    </AbsoluteFill>
  )
}
