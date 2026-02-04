'use client'

import { use, useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Sparkles, Image as ImageIcon, Check, Download, Copy, Video, RefreshCw } from 'lucide-react'
import { ChatContentCreator } from '@/components/video/ChatContentCreator'
import type {
  ContentCreationState,
  Brand,
} from '@/types/video-creation'
import { initialContentState } from '@/types/video-creation'

export default function CreateContentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [brand, setBrand] = useState<Brand | null>(null)
  const [state, setState] = useState<ContentCreationState>(initialContentState)
  const [mobileTab, setMobileTab] = useState<'chat' | 'preview'>('chat')
  const [copiedField, setCopiedField] = useState<string | null>(null)

  // Fetch brand data
  useEffect(() => {
    async function fetchBrand() {
      try {
        const response = await fetch(`/api/brands/${id}`)
        if (response.ok) {
          const data = await response.json()
          setBrand(data)
        }
      } catch (error) {
        console.error('Failed to fetch brand:', error)
      }
    }
    fetchBrand()
  }, [id])

  // Handle copy to clipboard
  const handleCopy = (field: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  // Handle download
  const handleDownload = (url: string, filename: string) => {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.target = '_blank'
    a.click()
  }

  // Get phase progress
  const phases = [
    { key: 'compose', label: 'Create', icon: '1' },
    { key: 'iterate', label: 'Refine', icon: '2' },
    { key: 'animate', label: 'Animate', icon: '3' },
    { key: 'copy', label: 'Copy', icon: '4' },
    { key: 'complete', label: 'Done', icon: '5' },
  ]

  const currentPhaseIndex = phases.findIndex(p => p.key === state.phase)

  return (
    <div className="p-4 md:p-8 h-[calc(100vh-1rem)] md:h-[calc(100vh-2rem)] flex flex-col">
      {/* Header */}
      <div className="mb-4 md:mb-6 flex-shrink-0">
        <Link
          href={`/brands/${id}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2 md:mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Brand
        </Link>
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono mb-1 md:mb-2">
          <span>$</span>
          <span className="text-primary">./brands/{id}/create/content</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold">Create AI Content</h1>
          {/* Phase Progress */}
          <div className="hidden md:flex items-center gap-1">
            {phases.map((phase, idx) => (
              <div key={phase.key} className="flex items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                    idx < currentPhaseIndex
                      ? 'bg-primary text-primary-foreground'
                      : idx === currentPhaseIndex
                        ? 'bg-primary/20 text-primary border border-primary'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {idx < currentPhaseIndex ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    phase.icon
                  )}
                </div>
                {idx < phases.length - 1 && (
                  <div
                    className={`w-8 h-0.5 transition-colors ${
                      idx < currentPhaseIndex ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="flex lg:hidden mb-3 gap-2 flex-shrink-0">
        <Button
          variant={mobileTab === 'chat' ? 'terminal' : 'outline'}
          size="sm"
          onClick={() => setMobileTab('chat')}
          className="flex-1 font-mono text-xs"
        >
          <Sparkles className="h-3 w-3 mr-1" />
          Assistant
        </Button>
        <Button
          variant={mobileTab === 'preview' ? 'terminal' : 'outline'}
          size="sm"
          onClick={() => setMobileTab('preview')}
          className="flex-1 font-mono text-xs"
        >
          <ImageIcon className="h-3 w-3 mr-1" />
          Preview
          {(state.generatedImages.length > 0 || state.videoUrl) && (
            <span className="ml-1 w-2 h-2 bg-primary rounded-full" />
          )}
        </Button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 flex-1 min-h-0">
        {/* Chat Panel */}
        <Card
          className={`terminal-border bg-card/50 flex flex-col overflow-hidden ${
            mobileTab !== 'chat' ? 'hidden lg:flex' : ''
          }`}
        >
          <CardHeader className="py-3 border-b border-border/50 flex-shrink-0">
            <CardTitle className="text-sm font-mono flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              content_assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            <ChatContentCreator
              brandId={id}
              brand={brand}
              state={state}
              onStateChange={setState}
            />
          </CardContent>
        </Card>

        {/* Preview Panel */}
        <Card
          className={`terminal-border bg-card/50 flex flex-col overflow-hidden ${
            mobileTab !== 'preview' ? 'hidden lg:flex' : ''
          }`}
        >
          <CardHeader className="py-3 border-b border-border/50 flex-shrink-0">
            <CardTitle className="text-sm font-mono flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" />
              preview
              <span className="ml-auto text-xs text-muted-foreground font-normal">
                {state.phase === 'compose' && 'Compose'}
                {state.phase === 'iterate' && 'Refine'}
                {state.phase === 'animate' && 'Animate'}
                {state.phase === 'copy' && 'Copy'}
                {state.phase === 'complete' && 'Complete'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-4 overflow-auto">
            {/* Preview Content based on phase */}
            <div className="space-y-6">
              {/* Uploaded Images */}
              {state.uploadedImages.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground font-mono mb-2">uploaded_images ({state.uploadedImages.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {state.uploadedImages.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt={`Uploaded ${idx + 1}`}
                        className="w-16 h-16 object-contain rounded border border-border bg-white/10"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Generated Images */}
              {state.generatedImages.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground font-mono mb-2">generated_images</p>
                  <div className="grid grid-cols-2 gap-3">
                    {state.generatedImages.map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setState(prev => ({ ...prev, selectedImage: url }))}
                        className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                          state.selectedImage === url
                            ? 'border-primary ring-2 ring-primary/20'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <img
                          src={url}
                          alt={`Generated ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {state.selectedImage === url && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <Check className="h-6 w-6 text-primary" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected Image Large Preview */}
              {state.selectedImage && (
                <div>
                  <p className="text-xs text-muted-foreground font-mono mb-2">selected_image</p>
                  <div className="relative aspect-video rounded-lg overflow-hidden border border-primary">
                    <img
                      src={state.selectedImage}
                      alt="Selected"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => handleDownload(state.selectedImage!, `${brand?.name || 'content'}-image.png`)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Image
                  </Button>
                </div>
              )}

              {/* Video Preview */}
              {state.videoUrl && (
                <div>
                  <p className="text-xs text-muted-foreground font-mono mb-2">animated_content</p>
                  <video
                    src={state.videoUrl}
                    controls
                    autoPlay
                    muted
                    loop
                    className="w-full rounded-lg"
                  />
                  <Button
                    variant="terminal"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => handleDownload(state.videoUrl!, `${brand?.name || 'content'}-video.mp4`)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Video
                  </Button>
                </div>
              )}

              {/* Marketing Copy */}
              {state.marketingCopy && (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground font-mono">marketing_copy</p>

                  <div className="p-3 bg-muted/30 rounded-lg space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Headline</span>
                        <button
                          type="button"
                          onClick={() => handleCopy('headline', state.marketingCopy!.headline)}
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          {copiedField === 'headline' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          {copiedField === 'headline' ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <p className="text-sm font-semibold">{state.marketingCopy.headline}</p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Body</span>
                        <button
                          type="button"
                          onClick={() => handleCopy('body', state.marketingCopy!.body)}
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          {copiedField === 'body' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          {copiedField === 'body' ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <p className="text-sm">{state.marketingCopy.body}</p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">CTA</span>
                        <button
                          type="button"
                          onClick={() => handleCopy('cta', state.marketingCopy!.cta)}
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          {copiedField === 'cta' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          {copiedField === 'cta' ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <p className="text-sm font-medium text-primary">{state.marketingCopy.cta}</p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Hashtags</span>
                        <button
                          type="button"
                          onClick={() => handleCopy('hashtags', state.marketingCopy!.hashtags.join(' '))}
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          {copiedField === 'hashtags' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          {copiedField === 'hashtags' ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {state.marketingCopy.hashtags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Copy All Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      const fullCopy = `${state.marketingCopy!.headline}\n\n${state.marketingCopy!.body}\n\n${state.marketingCopy!.cta}\n\n${state.marketingCopy!.hashtags.join(' ')}`
                      handleCopy('all', fullCopy)
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    {copiedField === 'all' ? 'Copied!' : 'Copy All'}
                  </Button>
                </div>
              )}

              {/* Empty State */}
              {state.generatedImages.length === 0 && !state.videoUrl && !state.marketingCopy && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ImageIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-sm font-medium">Content preview</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload images and describe what you want to create
                  </p>
                </div>
              )}

              {/* Complete State */}
              {state.phase === 'complete' && (
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
                  <Check className="h-6 w-6 text-green-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-green-500">Content ready!</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Download and share your content
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
