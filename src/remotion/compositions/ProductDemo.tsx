'use client'

import React from 'react'
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from 'remotion'

export interface ProductDemoProps {
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

export const ProductDemo: React.FC<ProductDemoProps> = ({
  title,
  description,
  features,
  callToAction,
  primaryColor,
  secondaryColor,
  accentColor,
  brandName,
  style: _style,
}) => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()

  // Phase timings
  const phase1End = Math.floor(durationInFrames * 0.25)
  const phase3Start = Math.floor(durationInFrames * 0.75)
  void _style // Reserved for future style-specific rendering

  // Intro animations
  const introScale = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 100 },
  })

  // Mock browser window animation
  const browserOpacity = interpolate(frame, [phase1End, phase1End + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const browserY = spring({
    frame: frame - phase1End,
    fps,
    config: { damping: 20, stiffness: 100 },
  })

  // CTA phase
  const ctaOpacity = interpolate(frame, [phase3Start, phase3Start + 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #0f0f1a 100%)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Animated background elements */}
      <div
        style={{
          position: 'absolute',
          top: -200,
          right: -200,
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${primaryColor}30 0%, transparent 70%)`,
          filter: 'blur(60px)',
          transform: `scale(${1 + Math.sin(frame / 30) * 0.1})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -100,
          left: -100,
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${secondaryColor}20 0%, transparent 70%)`,
          filter: 'blur(40px)',
        }}
      />

      {/* Header */}
      <div
        style={{
          position: 'absolute',
          top: 40,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 60px',
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: primaryColor,
          }}
        >
          {brandName}
        </div>
      </div>

      {/* Phase 1: Title intro */}
      {frame < phase1End + 30 && (
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
            opacity: interpolate(frame, [phase1End, phase1End + 30], [1, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          <h1
            style={{
              fontSize: 80,
              fontWeight: 700,
              color: '#ffffff',
              marginBottom: 20,
              transform: `scale(${introScale})`,
              textAlign: 'center',
            }}
          >
            {title}
          </h1>
          <p
            style={{
              fontSize: 28,
              color: 'rgba(255,255,255,0.6)',
              maxWidth: 600,
              textAlign: 'center',
            }}
          >
            {description}
          </p>
        </div>
      )}

      {/* Phase 2: Mock product interface */}
      {frame >= phase1End && frame < phase3Start && (
        <div
          style={{
            position: 'absolute',
            top: 120,
            left: '50%',
            transform: `translateX(-50%) translateY(${interpolate(browserY, [0, 1], [40, 0])}px)`,
            opacity: browserOpacity,
          }}
        >
          {/* Browser window mock */}
          <div
            style={{
              width: 900,
              height: 500,
              backgroundColor: 'rgba(20, 20, 30, 0.9)',
              borderRadius: 12,
              border: `1px solid ${primaryColor}40`,
              overflow: 'hidden',
              boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 100px ${primaryColor}20`,
            }}
          >
            {/* Browser header */}
            <div
              style={{
                height: 40,
                backgroundColor: 'rgba(30, 30, 45, 1)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                gap: 8,
              }}
            >
              <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#ff5f57' }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#febc2e' }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#28c840' }} />
              <div
                style={{
                  marginLeft: 16,
                  padding: '4px 12px',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderRadius: 4,
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.5)',
                }}
              >
                {brandName.toLowerCase()}.com
              </div>
            </div>

            {/* Content area */}
            <div
              style={{
                padding: 40,
                display: 'flex',
                flexDirection: 'column',
                gap: 24,
              }}
            >
              {features.slice(0, 3).map((feature, index) => {
                const featureDelay = phase1End + 30 + index * 15
                const featureOpacity = interpolate(
                  frame,
                  [featureDelay, featureDelay + 15],
                  [0, 1],
                  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                )

                return (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 20,
                      opacity: featureOpacity,
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 8,
                        backgroundColor: primaryColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 24,
                        color: '#fff',
                      }}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 600, color: '#fff' }}>
                        {feature}
                      </div>
                      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
                        Powerful feature built for you
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Phase 3: CTA */}
      {frame >= phase3Start && (
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
          <h2
            style={{
              fontSize: 56,
              fontWeight: 700,
              color: '#ffffff',
              marginBottom: 32,
              textAlign: 'center',
            }}
          >
            Ready to get started?
          </h2>
          <div
            style={{
              padding: '20px 60px',
              backgroundColor: accentColor,
              borderRadius: 12,
              fontSize: 28,
              fontWeight: 600,
              color: '#ffffff',
              boxShadow: `0 8px 32px ${accentColor}50`,
            }}
          >
            {callToAction || 'Start Free Trial'}
          </div>
        </div>
      )}
    </AbsoluteFill>
  )
}
