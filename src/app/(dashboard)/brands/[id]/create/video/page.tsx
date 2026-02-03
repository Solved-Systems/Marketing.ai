'use client'

import { use, useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Sparkles, Video, Check } from 'lucide-react'
import { ChatVideoCreator } from '@/components/video/ChatVideoCreator'
import { VideoCreationPreview } from '@/components/video/VideoCreationPreview'
import type {
  VideoCreationState,
  Brand,
} from '@/types/video-creation'

const initialState: VideoCreationState = {
  phase: 'logo',
  logoUrl: null,
  logoAnalysis: null,
  backgroundPrompt: null,
  backgroundImages: [],
  selectedBackground: null,
  videoPrompt: null,
  videoSettings: {
    duration: 5,
    aspectRatio: '16:9',
    resolution: '720p',
  },
  videoId: null,
  videoUrl: null,
  videoStatus: 'idle',
  videoError: null,
  marketingCopy: null,
}

export default function CreateVideoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [brand, setBrand] = useState<Brand | null>(null)
  const [state, setState] = useState<VideoCreationState>(initialState)
  const [mobileTab, setMobileTab] = useState<'chat' | 'preview'>('chat')

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

  // Handle background selection
  const handleSelectBackground = (url: string) => {
    setState(prev => ({
      ...prev,
      selectedBackground: url,
      phase: 'video',
    }))
  }

  // Handle background regeneration
  const handleRegenerateBackgrounds = () => {
    // This will be triggered via chat
    setState(prev => ({
      ...prev,
      backgroundImages: [],
    }))
  }

  // Handle copy regeneration
  const handleRegenerateCopy = () => {
    setState(prev => ({
      ...prev,
      marketingCopy: null,
      phase: 'copy',
    }))
  }

  // Handle video download
  const handleDownloadVideo = () => {
    if (state.videoUrl) {
      window.open(state.videoUrl, '_blank')
    }
  }

  // Handle copy text copy
  const handleCopyCopy = (text: string) => {
    // Analytics or feedback could go here
    console.log('Copied:', text.substring(0, 50))
  }

  // Get phase progress
  const phases = [
    { key: 'logo', label: 'Logo', icon: '1' },
    { key: 'background', label: 'Background', icon: '2' },
    { key: 'video', label: 'Video', icon: '3' },
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
          <span className="text-primary">./brands/{id}/create/video</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold">Create AI Video</h1>
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
          <Video className="h-3 w-3 mr-1" />
          Preview
          {(state.logoUrl || state.backgroundImages.length > 0 || state.videoUrl) && (
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
              video_assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            <ChatVideoCreator
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
              <Video className="h-4 w-4 text-primary" />
              preview
              <span className="ml-auto text-xs text-muted-foreground font-normal">
                {state.phase === 'logo' && 'Logo'}
                {state.phase === 'background' && 'Backgrounds'}
                {state.phase === 'video' && 'Video'}
                {state.phase === 'copy' && 'Copy'}
                {state.phase === 'complete' && 'Complete'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-4 overflow-auto">
            <VideoCreationPreview
              state={state}
              brand={brand}
              onSelectBackground={handleSelectBackground}
              onRegenerateBackgrounds={handleRegenerateBackgrounds}
              onRegenerateCopy={handleRegenerateCopy}
              onDownloadVideo={handleDownloadVideo}
              onCopyCopy={handleCopyCopy}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
