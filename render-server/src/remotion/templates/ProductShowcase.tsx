import { z } from 'zod'
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Img,
  Sequence,
} from 'remotion'
import { Check } from 'lucide-react'

export const productShowcaseSchema = z.object({
  productName: z.string(),
  tagline: z.string(),
  images: z.array(z.string()),
  features: z.array(z.string()),
  brandColors: z.object({
    primary: z.string(),
    secondary: z.string(),
  }),
  ctaText: z.string(),
})

type ProductShowcaseProps = z.infer<typeof productShowcaseSchema>

export const ProductShowcase: React.FC<ProductShowcaseProps> = ({
  productName,
  tagline,
  images,
  features,
  brandColors,
  ctaText,
}) => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()

  // Scene durations (in frames)
  const introEnd = 90 // First 3 seconds
  const featuresEnd = 330 // Next 8 seconds
  const ctaStart = 350

  // Intro animations
  const introProgress = interpolate(frame, [0, introEnd], [0, 1], {
    extrapolateRight: 'clamp',
  })

  const titleScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  })

  const taglineOpacity = interpolate(frame, [30, 50], [0, 1], {
    extrapolateRight: 'clamp',
  })

  // CTA animation
  const ctaOpacity = interpolate(frame, [ctaStart, ctaStart + 20], [0, 1], {
    extrapolateRight: 'clamp',
  })

  // Determine current scene
  const isIntro = frame < introEnd
  const isFeatures = frame >= introEnd && frame < ctaStart
  const isCta = frame >= ctaStart

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#ffffff',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Gradient background */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '60%',
          background: `linear-gradient(135deg, ${brandColors.primary}15 0%, ${brandColors.secondary}10 100%)`,
        }}
      />

      {/* Intro Scene */}
      {isIntro && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
          }}
        >
          <h1
            style={{
              fontSize: 100,
              fontWeight: 900,
              color: brandColors.secondary,
              transform: `scale(${titleScale})`,
              textAlign: 'center',
              marginBottom: 20,
            }}
          >
            {productName}
          </h1>
          <p
            style={{
              fontSize: 36,
              color: brandColors.secondary,
              opacity: taglineOpacity * 0.7,
              textAlign: 'center',
            }}
          >
            {tagline}
          </p>
        </div>
      )}

      {/* Features Scene */}
      {isFeatures && (
        <div
          style={{
            display: 'flex',
            height: '100%',
            padding: 80,
          }}
        >
          {/* Left side - Product image placeholder */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {images.length > 0 ? (
              <Img
                src={images[0]}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  borderRadius: 20,
                  boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
                }}
              />
            ) : (
              <div
                style={{
                  width: 500,
                  height: 500,
                  backgroundColor: brandColors.primary + '20',
                  borderRadius: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 48,
                  color: brandColors.primary,
                }}
              >
                {productName[0]}
              </div>
            )}
          </div>

          {/* Right side - Features */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              paddingLeft: 60,
            }}
          >
            <h2
              style={{
                fontSize: 48,
                fontWeight: 800,
                color: brandColors.secondary,
                marginBottom: 40,
              }}
            >
              Key Features
            </h2>
            {features.map((feature, index) => {
              const featureFrame = frame - introEnd - index * 30
              const featureOpacity = interpolate(
                featureFrame,
                [0, 20],
                [0, 1],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              )
              const featureX = interpolate(
                featureFrame,
                [0, 20],
                [50, 0],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              )

              return (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: 24,
                    opacity: featureOpacity,
                    transform: `translateX(${featureX}px)`,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: brandColors.primary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 20,
                    }}
                  >
                    <Check style={{ color: 'white', width: 24, height: 24 }} />
                  </div>
                  <span
                    style={{
                      fontSize: 28,
                      color: brandColors.secondary,
                    }}
                  >
                    {feature}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* CTA Scene */}
      {isCta && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            opacity: ctaOpacity,
          }}
        >
          <h2
            style={{
              fontSize: 64,
              fontWeight: 800,
              color: brandColors.secondary,
              marginBottom: 40,
              textAlign: 'center',
            }}
          >
            Ready to get started?
          </h2>
          <div
            style={{
              backgroundColor: brandColors.primary,
              color: 'white',
              padding: '24px 80px',
              borderRadius: 16,
              fontSize: 36,
              fontWeight: 700,
            }}
          >
            {ctaText}
          </div>
        </div>
      )}
    </AbsoluteFill>
  )
}
