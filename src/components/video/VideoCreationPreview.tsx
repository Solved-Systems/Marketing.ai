'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Image as ImageIcon,
  Video,
  Download,
  Copy,
  Check,
  Loader2,
  Palette,
  RefreshCw,
} from 'lucide-react'
import type { VideoCreationState, Brand, LogoAnalysis, MarketingCopy } from '@/types/video-creation'
import { useState } from 'react'

interface VideoCreationPreviewProps {
  state: VideoCreationState
  brand: Brand | null
  availableLogos?: { path: string; downloadUrl: string }[]
  onSelectBackground?: (url: string) => void
  onSelectLogo?: (url: string) => void
  onRegenerateBackgrounds?: () => void
  onRegenerateCopy?: () => void
  onDownloadVideo?: () => void
  onCopyCopy?: (text: string) => void
}

export function VideoCreationPreview({
  state,
  brand,
  availableLogos = [],
  onSelectBackground,
  onSelectLogo,
  onRegenerateBackgrounds,
  onRegenerateCopy,
  onDownloadVideo,
  onCopyCopy,
}: VideoCreationPreviewProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const handleCopy = (field: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    onCopyCopy?.(text)
    setTimeout(() => setCopiedField(null), 2000)
  }

  // Phase 1: Logo + Color Analysis
  if (state.phase === 'logo') {
    return (
      <div className="space-y-6">
        {state.logoUrl ? (
          <>
            {/* Logo Preview */}
            <div className="flex flex-col items-center">
              <div className="w-32 h-32 rounded-xl overflow-hidden bg-muted/30 border border-border mb-4">
                <img
                  src={state.logoUrl}
                  alt="Logo"
                  className="w-full h-full object-contain p-2"
                />
              </div>
              <p className="text-sm text-muted-foreground">Logo uploaded</p>
            </div>

            {/* Color Palette */}
            {state.logoAnalysis && (
              <ColorPalette analysis={state.logoAnalysis} />
            )}
          </>
        ) : (
          <EmptyState
            icon={<ImageIcon className="h-12 w-12" />}
            title="Upload a logo"
            description="Start by uploading your brand logo or use your existing brand logo"
          />
        )}
      </div>
    )
  }

  // Phase 2: Background Selection
  if (state.phase === 'background') {
    return (
      <div className="space-y-6">
        {/* Logo section with selector if multiple logos available */}
        {state.logoUrl && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <img
                src={state.logoUrl}
                alt="Logo"
                className="w-10 h-10 rounded object-contain bg-white/10"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{brand?.name || 'Brand'}</p>
                <p className="text-xs text-muted-foreground">Logo ready</p>
              </div>
            </div>

            {/* Available logos selector */}
            {availableLogos.length > 1 && onSelectLogo && (
              <div className="p-3 bg-muted/20 rounded-lg">
                <p className="text-xs text-muted-foreground mb-2">
                  {availableLogos.length} logos available - click to select
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableLogos.map((logo, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onSelectLogo(logo.downloadUrl)}
                      className={`w-10 h-10 rounded border-2 overflow-hidden transition-all ${
                        state.logoUrl === logo.downloadUrl
                          ? 'border-primary ring-2 ring-primary/20'
                          : 'border-border hover:border-primary/50'
                      }`}
                      title={logo.path}
                    >
                      <img
                        src={logo.downloadUrl}
                        alt={logo.path}
                        className="w-full h-full object-contain bg-white/10"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Background Grid */}
        {state.backgroundImages.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Select a background</p>
              {onRegenerateBackgrounds && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRegenerateBackgrounds}
                  className="h-8 text-xs"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Regenerate
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {state.backgroundImages.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectBackground?.(url)}
                  className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                    state.selectedBackground === url
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <img
                    src={url}
                    alt={`Background ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {state.selectedBackground === url && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <Check className="h-6 w-6 text-primary" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState
            icon={<ImageIcon className="h-12 w-12" />}
            title="Generating backgrounds..."
            description="AI is creating background options based on your logo"
            loading
          />
        )}
      </div>
    )
  }

  // Phase 3: Video Generation
  if (state.phase === 'video') {
    return (
      <div className="space-y-6">
        {/* Selected background preview */}
        {state.selectedBackground && (
          <div className="relative aspect-video rounded-lg overflow-hidden border border-border">
            <img
              src={state.selectedBackground}
              alt="Selected background"
              className="w-full h-full object-cover"
            />
            {state.logoUrl && (
              <div className="absolute top-4 left-4 w-12 h-12 bg-white/90 rounded-lg p-1">
                <img
                  src={state.logoUrl}
                  alt="Logo"
                  className="w-full h-full object-contain"
                />
              </div>
            )}
          </div>
        )}

        {/* Video Settings */}
        <div className="p-4 bg-muted/30 rounded-lg space-y-2">
          <p className="text-xs font-mono text-muted-foreground">video_settings</p>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Duration</p>
              <p className="font-medium">{state.videoSettings.duration}s</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Aspect</p>
              <p className="font-medium">{state.videoSettings.aspectRatio}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Quality</p>
              <p className="font-medium">{state.videoSettings.resolution}</p>
            </div>
          </div>
        </div>

        {/* Video Status */}
        {state.videoStatus === 'generating' && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm font-medium">Generating video...</p>
            <p className="text-xs text-muted-foreground mt-1">This may take 1-3 minutes</p>
          </div>
        )}

        {state.videoStatus === 'complete' && state.videoUrl && (
          <div className="space-y-4">
            <video
              src={state.videoUrl}
              controls
              autoPlay
              muted
              loop
              className="w-full rounded-lg"
            />
            {onDownloadVideo && (
              <Button onClick={onDownloadVideo} className="w-full" variant="terminal">
                <Download className="h-4 w-4 mr-2" />
                Download Video
              </Button>
            )}
          </div>
        )}

        {state.videoStatus === 'failed' && (
          <div className="p-4 bg-destructive/10 rounded-lg text-center">
            <p className="text-sm text-destructive">
              {state.videoError || 'Video generation failed'}
            </p>
          </div>
        )}
      </div>
    )
  }

  // Phase 4: Marketing Copy
  if (state.phase === 'copy') {
    return (
      <div className="space-y-6">
        {/* Video thumbnail */}
        {state.videoUrl && (
          <div className="relative aspect-video rounded-lg overflow-hidden border border-border">
            <video
              src={state.videoUrl}
              className="w-full h-full object-cover"
              muted
              loop
              autoPlay
            />
          </div>
        )}

        {/* Marketing Copy */}
        {state.marketingCopy ? (
          <CopyPreview
            copy={state.marketingCopy}
            copiedField={copiedField}
            onCopy={handleCopy}
            onRegenerate={onRegenerateCopy}
          />
        ) : (
          <EmptyState
            icon={<Copy className="h-12 w-12" />}
            title="Generating copy..."
            description="AI is crafting marketing copy for your video"
            loading
          />
        )}
      </div>
    )
  }

  // Phase 5: Complete
  if (state.phase === 'complete') {
    return (
      <div className="space-y-6">
        {/* Final Video */}
        {state.videoUrl && (
          <div className="space-y-4">
            <video
              src={state.videoUrl}
              controls
              className="w-full rounded-lg"
            />
            {onDownloadVideo && (
              <Button onClick={onDownloadVideo} className="w-full" variant="terminal">
                <Download className="h-4 w-4 mr-2" />
                Download Video
              </Button>
            )}
          </div>
        )}

        {/* Marketing Copy Summary */}
        {state.marketingCopy && (
          <CopyPreview
            copy={state.marketingCopy}
            copiedField={copiedField}
            onCopy={handleCopy}
            compact
          />
        )}

        {/* Success Message */}
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
          <Check className="h-6 w-6 text-green-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-green-500">Video ready!</p>
          <p className="text-xs text-muted-foreground mt-1">
            Download your video and copy to share
          </p>
        </div>
      </div>
    )
  }

  return (
    <EmptyState
      icon={<Video className="h-12 w-12" />}
      title="Video preview"
      description="Your video will appear here as you progress"
    />
  )
}

// Helper Components

function EmptyState({
  icon,
  title,
  description,
  loading = false,
}: {
  icon: React.ReactNode
  title: string
  description: string
  loading?: boolean
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-muted-foreground mb-4">
        {loading ? <Loader2 className="h-12 w-12 animate-spin" /> : icon}
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  )
}

function ColorPalette({ analysis }: { analysis: LogoAnalysis }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Palette className="h-4 w-4 text-primary" />
        <p className="text-sm font-medium">Detected colors</p>
      </div>
      <div className="flex gap-2">
        {analysis.colors.dominant.slice(0, 5).map((color, idx) => (
          <div key={idx} className="flex flex-col items-center gap-1">
            <div
              className="w-10 h-10 rounded-lg border border-border"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs font-mono text-muted-foreground">
              {color}
            </span>
          </div>
        ))}
      </div>
      <div className="text-xs text-muted-foreground">
        <p><span className="font-medium">Style:</span> {analysis.style}</p>
        <p><span className="font-medium">Composition:</span> {analysis.composition}</p>
      </div>
    </div>
  )
}

function CopyPreview({
  copy,
  copiedField,
  onCopy,
  onRegenerate,
  compact = false,
}: {
  copy: MarketingCopy
  copiedField: string | null
  onCopy: (field: string, text: string) => void
  onRegenerate?: () => void
  compact?: boolean
}) {
  return (
    <div className="space-y-4">
      {!compact && (
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Marketing Copy</p>
          {onRegenerate && (
            <Button variant="ghost" size="sm" onClick={onRegenerate} className="h-8 text-xs">
              <RefreshCw className="h-3 w-3 mr-1" />
              Regenerate
            </Button>
          )}
        </div>
      )}

      <Card className="terminal-border bg-card/30">
        <CardContent className="p-4 space-y-4">
          {/* Headline */}
          <CopyField
            label="Headline"
            value={copy.headline}
            copied={copiedField === 'headline'}
            onCopy={() => onCopy('headline', copy.headline)}
          />

          {/* Body */}
          <CopyField
            label="Body"
            value={copy.body}
            copied={copiedField === 'body'}
            onCopy={() => onCopy('body', copy.body)}
            multiline
          />

          {/* CTA */}
          <CopyField
            label="Call to Action"
            value={copy.cta}
            copied={copiedField === 'cta'}
            onCopy={() => onCopy('cta', copy.cta)}
          />

          {/* Hashtags */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Hashtags</span>
              <button
                type="button"
                onClick={() => onCopy('hashtags', copy.hashtags.join(' '))}
                className="text-xs text-primary hover:underline"
              >
                {copiedField === 'hashtags' ? <Check className="h-3 w-3" /> : 'Copy'}
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {copy.hashtags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function CopyField({
  label,
  value,
  copied,
  onCopy,
  multiline = false,
}: {
  label: string
  value: string
  copied: boolean
  onCopy: () => void
  multiline?: boolean
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <button
          type="button"
          onClick={onCopy}
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p className={`text-sm ${multiline ? 'whitespace-pre-wrap' : ''}`}>{value}</p>
    </div>
  )
}
