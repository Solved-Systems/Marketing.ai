import { Composition } from 'remotion'
import { FeatureAnnouncement, featureAnnouncementSchema } from './templates/FeatureAnnouncement'
import { ProductShowcase, productShowcaseSchema } from './templates/ProductShowcase'
import { SocialPromo, socialPromoSchema } from './templates/SocialPromo'

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="FeatureAnnouncement"
        component={FeatureAnnouncement}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
        schema={featureAnnouncementSchema}
        defaultProps={{
          title: 'New Feature',
          subtitle: 'Introducing our latest update',
          features: [
            {
              icon: 'zap',
              title: 'Lightning Fast',
              description: 'Optimized for speed',
            },
            {
              icon: 'shield',
              title: 'Secure',
              description: 'Enterprise-grade security',
            },
            {
              icon: 'sparkles',
              title: 'AI Powered',
              description: 'Smart automation',
            },
          ],
          brandColors: {
            primary: '#7c3aed',
            secondary: '#1e293b',
            background: '#ffffff',
          },
          logoUrl: '',
          ctaText: 'Try it now',
          ctaUrl: 'https://example.com',
        }}
      />

      <Composition
        id="ProductShowcase"
        component={ProductShowcase}
        durationInFrames={450}
        fps={30}
        width={1920}
        height={1080}
        schema={productShowcaseSchema}
        defaultProps={{
          productName: 'Amazing Product',
          tagline: 'The future is here',
          images: [],
          features: ['Feature 1', 'Feature 2', 'Feature 3'],
          brandColors: {
            primary: '#7c3aed',
            secondary: '#1e293b',
          },
          ctaText: 'Get Started',
        }}
      />

      <Composition
        id="SocialPromo"
        component={SocialPromo}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1080}
        schema={socialPromoSchema}
        defaultProps={{
          headline: 'Big News!',
          subheadline: 'Something amazing is coming',
          backgroundImage: '',
          logoUrl: '',
          brandColor: '#7c3aed',
        }}
      />
    </>
  )
}
