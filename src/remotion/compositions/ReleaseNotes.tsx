'use client'

import React from 'react'
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from 'remotion'

export interface ReleaseNotesProps {
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

export const ReleaseNotes: React.FC<ReleaseNotesProps> = ({
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

  // Phase timings
  const headerPhase = Math.floor(durationInFrames * 0.2)
  const featuresPhase = Math.floor(durationInFrames * 0.7)
  const ctaPhase = Math.floor(durationInFrames * 0.85)

  // Header animations
  const headerOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const badgeScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 150 },
  })

  // CTA
  const ctaOpacity = interpolate(frame, [ctaPhase, ctaPhase + 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill
      style={{
        background: '#0a0a0f',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
      }}
    >
      {/* Terminal-style background grid */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            linear-gradient(${primaryColor}10 1px, transparent 1px),
            linear-gradient(90deg, ${primaryColor}10 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          opacity: 0.5,
        }}
      />

      {/* Glow effect */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 800,
          height: 400,
          background: `radial-gradient(ellipse, ${primaryColor}30 0%, transparent 70%)`,
          filter: 'blur(60px)',
        }}
      />

      <div
        style={{
          padding: 60,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            opacity: headerOpacity,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              marginBottom: 20,
            }}
          >
            <span
              style={{
                color: primaryColor,
                fontSize: 24,
              }}
            >
              {brandName}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
            <span
              style={{
                padding: '6px 16px',
                backgroundColor: accentColor,
                borderRadius: 20,
                fontSize: 16,
                fontWeight: 600,
                color: '#fff',
                transform: `scale(${badgeScale})`,
              }}
            >
              NEW RELEASE
            </span>
          </div>

          <h1
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: '#ffffff',
              marginBottom: 16,
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            {title}
          </h1>

          <p
            style={{
              fontSize: 24,
              color: 'rgba(255,255,255,0.6)',
              maxWidth: 800,
            }}
          >
            {description}
          </p>
        </div>

        {/* Features list - changelog style */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {features.slice(0, 5).map((feature, index) => {
            const featureStart = headerPhase + index * 12
            const featureOpacity = interpolate(
              frame,
              [featureStart, featureStart + 15],
              [0, 1],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            )
            const featureX = interpolate(
              frame,
              [featureStart, featureStart + 15],
              [-40, 0],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            )

            return (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  opacity: featureOpacity,
                  transform: `translateX(${featureX}px)`,
                }}
              >
                <span
                  style={{
                    color: accentColor,
                    fontSize: 20,
                  }}
                >
                  +
                </span>
                <span
                  style={{
                    fontSize: 22,
                    color: 'rgba(255,255,255,0.85)',
                  }}
                >
                  {feature}
                </span>
              </div>
            )
          })}
        </div>

        {/* CTA */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            opacity: ctaOpacity,
            paddingTop: 40,
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div
            style={{
              fontSize: 18,
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            <span style={{ color: primaryColor }}>$</span> npm install {brandName.toLowerCase()}@latest
          </div>
          <div
            style={{
              padding: '14px 36px',
              backgroundColor: primaryColor,
              borderRadius: 8,
              fontSize: 18,
              fontWeight: 600,
              color: '#ffffff',
            }}
          >
            {callToAction || 'View Changelog'}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  )
}
