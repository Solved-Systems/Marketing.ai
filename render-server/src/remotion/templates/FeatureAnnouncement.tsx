import { z } from 'zod'
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
} from 'remotion'
import { Zap, Shield, Sparkles, Star, Rocket, Heart, Globe, Lock, Check } from 'lucide-react'

export const featureAnnouncementSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  features: z.array(
    z.object({
      icon: z.string(),
      title: z.string(),
      description: z.string(),
    })
  ),
  brandColors: z.object({
    primary: z.string(),
    secondary: z.string(),
    background: z.string(),
  }),
  logoUrl: z.string(),
  ctaText: z.string(),
  ctaUrl: z.string(),
})

type FeatureAnnouncementProps = z.infer<typeof featureAnnouncementSchema>

const iconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  zap: Zap,
  shield: Shield,
  sparkles: Sparkles,
  star: Star,
  rocket: Rocket,
  heart: Heart,
  globe: Globe,
  lock: Lock,
  check: Check,
}

export const FeatureAnnouncement: React.FC<FeatureAnnouncementProps> = ({
  title,
  subtitle,
  features,
  brandColors,
  logoUrl,
  ctaText,
}) => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()

  // Animation timing
  const titleDelay = 0
  const subtitleDelay = 15
  const featuresDelay = 45
  const ctaDelay = 200

  // Title animation
  const titleOpacity = interpolate(frame, [titleDelay, titleDelay + 20], [0, 1], {
    extrapolateRight: 'clamp',
  })
  const titleY = interpolate(frame, [titleDelay, titleDelay + 20], [50, 0], {
    extrapolateRight: 'clamp',
  })

  // Subtitle animation
  const subtitleOpacity = interpolate(frame, [subtitleDelay, subtitleDelay + 20], [0, 1], {
    extrapolateRight: 'clamp',
  })

  // CTA animation
  const ctaOpacity = interpolate(frame, [ctaDelay, ctaDelay + 20], [0, 1], {
    extrapolateRight: 'clamp',
  })
  const ctaScale = spring({
    frame: frame - ctaDelay,
    fps,
    config: { damping: 10, stiffness: 100 },
  })

  return (
    <AbsoluteFill
      style={{
        backgroundColor: brandColors.background,
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Animated background gradient */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(circle at ${50 + Math.sin(frame / 30) * 10}% ${50 + Math.cos(frame / 30) * 10}%, ${brandColors.primary}20, transparent 70%)`,
        }}
      />

      {/* Content container */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: 80,
        }}
      >
        {/* Title */}
        <h1
          style={{
            fontSize: 80,
            fontWeight: 800,
            color: brandColors.secondary,
            marginBottom: 20,
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            textAlign: 'center',
          }}
        >
          {title}
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 32,
            color: brandColors.secondary,
            opacity: subtitleOpacity * 0.7,
            marginBottom: 60,
            textAlign: 'center',
          }}
        >
          {subtitle}
        </p>

        {/* Features */}
        <div
          style={{
            display: 'flex',
            gap: 40,
            marginBottom: 60,
          }}
        >
          {features.slice(0, 3).map((feature, index) => {
            const featureDelay = featuresDelay + index * 20
            const featureOpacity = interpolate(
              frame,
              [featureDelay, featureDelay + 20],
              [0, 1],
              { extrapolateRight: 'clamp' }
            )
            const featureScale = spring({
              frame: frame - featureDelay,
              fps,
              config: { damping: 10, stiffness: 100 },
            })

            const IconComponent = iconMap[feature.icon] || Sparkles

            return (
              <div
                key={index}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  opacity: featureOpacity,
                  transform: `scale(${featureScale})`,
                  width: 300,
                }}
              >
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 20,
                    backgroundColor: brandColors.primary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 20,
                  }}
                >
                  <IconComponent
                    style={{ width: 40, height: 40, color: 'white' }}
                  />
                </div>
                <h3
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: brandColors.secondary,
                    marginBottom: 8,
                    textAlign: 'center',
                  }}
                >
                  {feature.title}
                </h3>
                <p
                  style={{
                    fontSize: 18,
                    color: brandColors.secondary,
                    opacity: 0.7,
                    textAlign: 'center',
                  }}
                >
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>

        {/* CTA Button */}
        <div
          style={{
            opacity: ctaOpacity,
            transform: `scale(${ctaScale})`,
          }}
        >
          <div
            style={{
              backgroundColor: brandColors.primary,
              color: 'white',
              padding: '20px 60px',
              borderRadius: 12,
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            {ctaText}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  )
}
