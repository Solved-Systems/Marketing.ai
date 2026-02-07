'use client'

import React from 'react'
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from 'remotion'

export interface FeatureAnnouncementProps {
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

export const FeatureAnnouncement: React.FC<FeatureAnnouncementProps> = ({
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
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()

  const getStyleConfig = () => {
    switch (style) {
      case 'Minimal':
        return {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          titleWeight: 300,
          bgGradient: `linear-gradient(135deg, ${primaryColor}10 0%, ${secondaryColor}10 100%)`,
          borderRadius: 0,
        }
      case 'Bold':
        return {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          titleWeight: 900,
          bgGradient: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
          borderRadius: 24,
        }
      case 'Playful':
        return {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          titleWeight: 700,
          bgGradient: `linear-gradient(45deg, ${primaryColor} 0%, ${accentColor} 50%, ${secondaryColor} 100%)`,
          borderRadius: 32,
        }
      default: // Modern
        return {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          titleWeight: 600,
          bgGradient: `linear-gradient(180deg, ${primaryColor}20 0%, ${secondaryColor}40 100%)`,
          borderRadius: 16,
        }
    }
  }

  const styleConfig = getStyleConfig()

  // Animation timings
  const titleStart = Math.floor(fps * 0.3)
  const descStart = Math.floor(fps * 0.8)
  const featuresStart = Math.floor(fps * 1.5)
  const ctaStart = durationInFrames - Math.floor(fps * 2)

  // Title animation
  const titleOpacity = interpolate(frame, [titleStart, titleStart + 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const titleY = spring({
    frame: frame - titleStart,
    fps,
    config: { damping: 20, stiffness: 100 },
  })

  // Description animation
  const descOpacity = interpolate(frame, [descStart, descStart + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // CTA animation
  const ctaScale = spring({
    frame: frame - ctaStart,
    fps,
    config: { damping: 15, stiffness: 200 },
  })
  const ctaOpacity = interpolate(frame, [ctaStart, ctaStart + 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill
      style={{
        background: style === 'Bold'
          ? styleConfig.bgGradient
          : `linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%)`,
        fontFamily: styleConfig.fontFamily,
      }}
    >
      {/* Background accent */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '120%',
          height: '120%',
          background: styleConfig.bgGradient,
          opacity: 0.3,
          filter: 'blur(100px)',
        }}
      />

      {/* Brand watermark */}
      <div
        style={{
          position: 'absolute',
          top: 40,
          left: 40,
          color: primaryColor,
          fontSize: 24,
          fontWeight: 600,
          opacity: 0.8,
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
          padding: 80,
          textAlign: 'center',
        }}
      >
        {/* Title */}
        <h1
          style={{
            fontSize: 72,
            fontWeight: styleConfig.titleWeight,
            color: style === 'Bold' ? '#ffffff' : primaryColor,
            marginBottom: 24,
            opacity: titleOpacity,
            transform: `translateY(${interpolate(titleY, [0, 1], [50, 0])}px)`,
            textShadow: style === 'Bold' ? '0 4px 20px rgba(0,0,0,0.3)' : 'none',
          }}
        >
          {title}
        </h1>

        {/* Description */}
        <p
          style={{
            fontSize: 28,
            color: style === 'Bold' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.7)',
            maxWidth: 800,
            lineHeight: 1.5,
            opacity: descOpacity,
            marginBottom: 48,
          }}
        >
          {description}
        </p>

        {/* Features */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            marginBottom: 48,
          }}
        >
          {features.slice(0, 4).map((feature, index) => {
            const featureDelay = featuresStart + index * 10
            const featureOpacity = interpolate(
              frame,
              [featureDelay, featureDelay + 15],
              [0, 1],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            )
            const featureX = interpolate(
              frame,
              [featureDelay, featureDelay + 15],
              [-30, 0],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            )

            return (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  opacity: featureOpacity,
                  transform: `translateX(${featureX}px)`,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: accentColor,
                  }}
                />
                <span
                  style={{
                    fontSize: 24,
                    color: 'rgba(255,255,255,0.8)',
                  }}
                >
                  {feature}
                </span>
              </div>
            )
          })}
        </div>

        {/* Call to Action */}
        {callToAction && (
          <div
            style={{
              padding: '16px 48px',
              backgroundColor: accentColor,
              borderRadius: styleConfig.borderRadius,
              fontSize: 24,
              fontWeight: 600,
              color: '#ffffff',
              opacity: ctaOpacity,
              transform: `scale(${ctaScale})`,
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}
          >
            {callToAction}
          </div>
        )}
      </div>
    </AbsoluteFill>
  )
}
