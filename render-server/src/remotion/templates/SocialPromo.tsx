import { z } from 'zod'
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Img,
} from 'remotion'

export const socialPromoSchema = z.object({
  headline: z.string(),
  subheadline: z.string(),
  backgroundImage: z.string(),
  logoUrl: z.string(),
  brandColor: z.string(),
})

type SocialPromoProps = z.infer<typeof socialPromoSchema>

export const SocialPromo: React.FC<SocialPromoProps> = ({
  headline,
  subheadline,
  backgroundImage,
  logoUrl,
  brandColor,
}) => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()

  // Zoom animation on background
  const bgScale = interpolate(frame, [0, durationInFrames], [1, 1.1], {
    extrapolateRight: 'clamp',
  })

  // Headline animation
  const headlineProgress = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 80 },
  })

  const headlineY = interpolate(headlineProgress, [0, 1], [100, 0])
  const headlineOpacity = interpolate(headlineProgress, [0, 1], [0, 1])

  // Subheadline animation
  const subheadlineDelay = 20
  const subheadlineProgress = spring({
    frame: frame - subheadlineDelay,
    fps,
    config: { damping: 12, stiffness: 80 },
  })

  const subheadlineY = interpolate(subheadlineProgress, [0, 1], [50, 0])
  const subheadlineOpacity = interpolate(subheadlineProgress, [0, 1], [0, 1])

  // Logo animation
  const logoDelay = 40
  const logoProgress = spring({
    frame: frame - logoDelay,
    fps,
    config: { damping: 10, stiffness: 100 },
  })

  // Decorative elements
  const decorOpacity = interpolate(frame, [60, 80], [0, 1], {
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill>
      {/* Background */}
      {backgroundImage ? (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            transform: `scale(${bgScale})`,
          }}
        >
          <Img
            src={backgroundImage}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          {/* Overlay */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
            }}
          />
        </div>
      ) : (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}80 100%)`,
          }}
        />
      )}

      {/* Animated gradient overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(circle at ${50 + Math.sin(frame / 20) * 20}% ${50 + Math.cos(frame / 20) * 20}%, ${brandColor}40, transparent 70%)`,
        }}
      />

      {/* Decorative circles */}
      <div
        style={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 400,
          height: 400,
          borderRadius: '50%',
          border: `4px solid ${brandColor}60`,
          opacity: decorOpacity,
          transform: `rotate(${frame}deg)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -150,
          left: -150,
          width: 500,
          height: 500,
          borderRadius: '50%',
          border: `4px solid ${brandColor}40`,
          opacity: decorOpacity,
          transform: `rotate(${-frame * 0.5}deg)`,
        }}
      />

      {/* Content */}
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
          padding: 60,
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {/* Headline */}
        <h1
          style={{
            fontSize: 72,
            fontWeight: 900,
            color: 'white',
            textAlign: 'center',
            marginBottom: 24,
            opacity: headlineOpacity,
            transform: `translateY(${headlineY}px)`,
            textShadow: '0 4px 20px rgba(0,0,0,0.3)',
            lineHeight: 1.1,
          }}
        >
          {headline}
        </h1>

        {/* Subheadline */}
        <p
          style={{
            fontSize: 32,
            color: 'white',
            textAlign: 'center',
            opacity: subheadlineOpacity * 0.9,
            transform: `translateY(${subheadlineY}px)`,
            textShadow: '0 2px 10px rgba(0,0,0,0.3)',
            maxWidth: 800,
          }}
        >
          {subheadline}
        </p>

        {/* Logo */}
        {logoUrl && (
          <div
            style={{
              marginTop: 60,
              opacity: logoProgress,
              transform: `scale(${logoProgress})`,
            }}
          >
            <Img
              src={logoUrl}
              style={{
                height: 60,
              }}
            />
          </div>
        )}

        {/* Animated brand bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 8,
            backgroundColor: brandColor,
            transform: `scaleX(${interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' })})`,
            transformOrigin: 'left',
          }}
        />
      </div>
    </AbsoluteFill>
  )
}
