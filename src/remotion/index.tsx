import React from 'react'
import { Composition } from 'remotion'
import { FeatureAnnouncement, type FeatureAnnouncementProps } from './compositions/FeatureAnnouncement'
import { ProductDemo } from './compositions/ProductDemo'
import { SocialTeaser } from './compositions/SocialTeaser'
import { ReleaseNotes } from './compositions/ReleaseNotes'

// Default props for preview
const defaultProps: FeatureAnnouncementProps = {
  title: 'New Feature Launch',
  description: 'Introducing our latest innovation that will transform how you work.',
  features: ['Faster performance', 'Better UX', 'More features', 'Enterprise ready'],
  callToAction: 'Get Started',
  primaryColor: '#6366f1',
  secondaryColor: '#8b5cf6',
  accentColor: '#22c55e',
  brandName: 'MRKTCMD',
  style: 'Modern',
}

// Frame rates and durations
const FPS = 30
const DURATIONS = {
  '15 seconds': 15 * FPS,
  '30 seconds': 30 * FPS,
  '60 seconds': 60 * FPS,
}

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Feature Announcement */}
      <Composition
        id="FeatureAnnouncement-15"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={FeatureAnnouncement as any}
        durationInFrames={DURATIONS['15 seconds']}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={defaultProps}
      />
      <Composition
        id="FeatureAnnouncement-30"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={FeatureAnnouncement as any}
        durationInFrames={DURATIONS['30 seconds']}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={defaultProps}
      />
      <Composition
        id="FeatureAnnouncement-60"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={FeatureAnnouncement as any}
        durationInFrames={DURATIONS['60 seconds']}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={defaultProps}
      />

      {/* Product Demo */}
      <Composition
        id="ProductDemo-15"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={ProductDemo as any}
        durationInFrames={DURATIONS['15 seconds']}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={defaultProps}
      />
      <Composition
        id="ProductDemo-30"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={ProductDemo as any}
        durationInFrames={DURATIONS['30 seconds']}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={defaultProps}
      />
      <Composition
        id="ProductDemo-60"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={ProductDemo as any}
        durationInFrames={DURATIONS['60 seconds']}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={defaultProps}
      />

      {/* Social Teaser */}
      <Composition
        id="SocialTeaser-15"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={SocialTeaser as any}
        durationInFrames={DURATIONS['15 seconds']}
        fps={FPS}
        width={1080}
        height={1080}
        defaultProps={defaultProps}
      />
      <Composition
        id="SocialTeaser-30"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={SocialTeaser as any}
        durationInFrames={DURATIONS['30 seconds']}
        fps={FPS}
        width={1080}
        height={1080}
        defaultProps={defaultProps}
      />
      <Composition
        id="SocialTeaser-60"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={SocialTeaser as any}
        durationInFrames={DURATIONS['60 seconds']}
        fps={FPS}
        width={1080}
        height={1080}
        defaultProps={defaultProps}
      />

      {/* Release Notes */}
      <Composition
        id="ReleaseNotes-15"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={ReleaseNotes as any}
        durationInFrames={DURATIONS['15 seconds']}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={defaultProps}
      />
      <Composition
        id="ReleaseNotes-30"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={ReleaseNotes as any}
        durationInFrames={DURATIONS['30 seconds']}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={defaultProps}
      />
      <Composition
        id="ReleaseNotes-60"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={ReleaseNotes as any}
        durationInFrames={DURATIONS['60 seconds']}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={defaultProps}
      />
    </>
  )
}

// Export for use elsewhere
export { FeatureAnnouncement, ProductDemo, SocialTeaser, ReleaseNotes }
export type { FeatureAnnouncementProps } from './compositions/FeatureAnnouncement'
export type { ProductDemoProps } from './compositions/ProductDemo'
export type { SocialTeaserProps } from './compositions/SocialTeaser'
export type { ReleaseNotesProps } from './compositions/ReleaseNotes'
