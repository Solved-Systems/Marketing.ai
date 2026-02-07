'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Film,
  Loader2,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Scissors,
  Wand2,
  Download,
  X,
  Gauge,
  Volume2,
  VolumeX,
  RefreshCw,
  ImageIcon,
} from 'lucide-react'

// Video aspect ratios
const ASPECT_RATIOS = [
  { value: '16:9', label: 'Widescreen (16:9)' },
  { value: '9:16', label: 'Vertical (9:16)' },
  { value: '1:1', label: 'Square (1:1)' },
  { value: '4:3', label: 'Standard (4:3)' },
]

// Speed options
const SPEED_OPTIONS = [
  { value: 0.25, label: '0.25x' },
  { value: 0.5, label: '0.5x' },
  { value: 0.75, label: '0.75x' },
  { value: 1, label: '1x' },
  { value: 1.25, label: '1.25x' },
  { value: 1.5, label: '1.5x' },
  { value: 2, label: '2x' },
]

// Motion intensity options for re-animation
const MOTION_OPTIONS = [
  { value: 'subtle', label: 'Subtle', description: 'Minimal, gentle motion' },
  { value: 'moderate', label: 'Moderate', description: 'Smooth, natural motion' },
  { value: 'dynamic', label: 'Dynamic', description: 'Cinematic, expressive' },
]

interface VideoEditModalProps {
  isOpen: boolean
  onClose: () => void
  videoUrl: string
  originalImageUrl?: string // For re-animation
  onVideoEdited?: (newVideoUrl: string) => void
}

export function VideoEditModal({
  isOpen,
  onClose,
  videoUrl,
  originalImageUrl,
  onVideoEdited,
}: VideoEditModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [isMuted, setIsMuted] = useState(true)

  // Trim state
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(0)
  const [isTrimMode, setIsTrimMode] = useState(false)

  // Re-animation state
  const [isReanimating, setIsReanimating] = useState(false)
  const [reanimatePrompt, setReanimatePrompt] = useState('')
  const [reanimateDuration, setReanimateDuration] = useState(5)
  const [reanimateAspectRatio, setReanimateAspectRatio] = useState('16:9')
  const [reanimateMotion, setReanimateMotion] = useState('moderate')
  const [showReanimatePanel, setShowReanimatePanel] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Extract a frame from the current video position
  const [extractedFrame, setExtractedFrame] = useState<string | null>(null)

  // Initialize video
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed
    }
  }, [playbackSpeed])

  useEffect(() => {
    if (videoRef.current && duration > 0 && trimEnd === 0) {
      setTrimEnd(duration)
    }
  }, [duration, trimEnd])

  // Time update handler
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)

      // Loop within trim bounds if in trim mode
      if (isTrimMode && videoRef.current.currentTime >= trimEnd) {
        videoRef.current.currentTime = trimStart
      }
    }
  }, [isTrimMode, trimStart, trimEnd])

  // Loaded metadata handler
  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
      setTrimEnd(videoRef.current.duration)
    }
  }, [])

  // Play/Pause
  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        // Start from trim start if in trim mode
        if (isTrimMode && videoRef.current.currentTime < trimStart) {
          videoRef.current.currentTime = trimStart
        }
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }, [isPlaying, isTrimMode, trimStart])

  // Seek
  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }, [])

  // Skip forward/backward
  const skip = useCallback((seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds))
    }
  }, [duration])

  // Extract frame at current position
  const extractFrame = useCallback(() => {
    if (!videoRef.current) return

    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0)
      setExtractedFrame(canvas.toDataURL('image/png'))
    }
  }, [])

  // Re-animate from current frame or original image
  const handleReanimate = async () => {
    const imageToAnimate = extractedFrame || originalImageUrl
    if (!imageToAnimate) {
      setError('No image available for re-animation. Extract a frame first.')
      return
    }

    setIsReanimating(true)
    setError(null)

    try {
      const response = await fetch('/api/videos/animate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: imageToAnimate,
          prompt: reanimatePrompt || 'Animate this image with smooth, natural motion',
          duration: reanimateDuration,
          aspectRatio: reanimateAspectRatio,
          motionIntensity: reanimateMotion,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to start re-animation')
      }

      // Poll for completion
      const requestId = data.requestId
      let attempts = 0
      const maxAttempts = 60

      const pollInterval = setInterval(async () => {
        attempts++
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval)
          setError('Re-animation timed out')
          setIsReanimating(false)
          return
        }

        try {
          const statusRes = await fetch(`/api/videos/animate?requestId=${requestId}`)
          const statusData = await statusRes.json()

          if (statusData.videoUrl) {
            clearInterval(pollInterval)
            setIsReanimating(false)
            if (onVideoEdited) {
              onVideoEdited(statusData.videoUrl)
            }
            handleClose()
          } else if (statusData.status === 'failed') {
            clearInterval(pollInterval)
            setError(statusData.error || 'Re-animation failed')
            setIsReanimating(false)
          }
        } catch (pollError) {
          console.error('Poll error:', pollError)
        }
      }, 5000)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to re-animate')
      setIsReanimating(false)
    }
  }

  // Download video
  const handleDownload = useCallback(() => {
    const link = document.createElement('a')
    link.href = videoUrl
    link.download = `video-${Date.now()}.mp4`
    link.click()
  }, [videoUrl])

  // Format time as MM:SS
  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60)
    const secs = Math.floor(time % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleClose = () => {
    setIsPlaying(false)
    setCurrentTime(0)
    setTrimStart(0)
    setTrimEnd(0)
    setIsTrimMode(false)
    setShowReanimatePanel(false)
    setExtractedFrame(null)
    setReanimatePrompt('')
    setError(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono flex items-center gap-2">
            <Film className="h-5 w-5 text-primary" />
            Edit Video
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Video Player */}
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-contain"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
              muted={isMuted}
              playsInline
            />

            {/* Overlay controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              {/* Progress bar */}
              <div className="relative mb-3">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.01}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1.5 appearance-none bg-white/30 rounded-full cursor-pointer"
                  style={{
                    background: `linear-gradient(to right,
                      ${isTrimMode ? 'rgba(255,255,255,0.2)' : 'transparent'} 0%,
                      ${isTrimMode ? 'rgba(255,255,255,0.2)' : 'transparent'} ${(trimStart / duration) * 100}%,
                      var(--primary) ${(trimStart / duration) * 100}%,
                      var(--primary) ${(currentTime / duration) * 100}%,
                      rgba(255,255,255,0.3) ${(currentTime / duration) * 100}%,
                      rgba(255,255,255,0.3) ${(trimEnd / duration) * 100}%,
                      ${isTrimMode ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.3)'} ${(trimEnd / duration) * 100}%
                    )`
                  }}
                />

                {/* Trim handles */}
                {isTrimMode && (
                  <>
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-1 h-4 bg-primary rounded cursor-ew-resize"
                      style={{ left: `${(trimStart / duration) * 100}%` }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-1 h-4 bg-primary rounded cursor-ew-resize"
                      style={{ left: `${(trimEnd / duration) * 100}%` }}
                    />
                  </>
                )}
              </div>

              {/* Controls row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => skip(-5)}
                    className="text-white hover:bg-white/20 h-8 w-8 p-0"
                  >
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={togglePlay}
                    className="text-white hover:bg-white/20 h-10 w-10 p-0"
                  >
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => skip(5)}
                    className="text-white hover:bg-white/20 h-8 w-8 p-0"
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMuted(!isMuted)}
                    className="text-white hover:bg-white/20 h-8 w-8 p-0"
                  >
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                  <span className="text-white/80 text-xs font-mono ml-2">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Select value={String(playbackSpeed)} onValueChange={(v) => setPlaybackSpeed(parseFloat(v))}>
                    <SelectTrigger className="w-20 h-8 bg-white/10 border-white/20 text-white text-xs">
                      <Gauge className="h-3 w-3 mr-1" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SPEED_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={String(opt.value)}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={isTrimMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsTrimMode(!isTrimMode)}
              className="gap-1"
            >
              <Scissors className="h-4 w-4" />
              Trim
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={extractFrame}
              className="gap-1"
            >
              <ImageIcon className="h-4 w-4" />
              Extract Frame
            </Button>
            <Button
              variant={showReanimatePanel ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowReanimatePanel(!showReanimatePanel)}
              className="gap-1"
            >
              <RefreshCw className="h-4 w-4" />
              Re-animate
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="gap-1"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>

          {/* Trim Controls */}
          {isTrimMode && (
            <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-3">
              <div className="flex items-center gap-2">
                <Scissors className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Trim Video</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-muted-foreground">start_time</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={trimEnd - 0.1}
                      step={0.1}
                      value={trimStart.toFixed(1)}
                      onChange={(e) => setTrimStart(parseFloat(e.target.value) || 0)}
                      className="font-mono"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTrimStart(currentTime)}
                      className="text-xs"
                    >
                      Set Current
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-mono text-muted-foreground">end_time</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={trimStart + 0.1}
                      max={duration}
                      step={0.1}
                      value={trimEnd.toFixed(1)}
                      onChange={(e) => setTrimEnd(parseFloat(e.target.value) || duration)}
                      className="font-mono"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTrimEnd(currentTime)}
                      className="text-xs"
                    >
                      Set Current
                    </Button>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Selected duration: {formatTime(trimEnd - trimStart)} ({((trimEnd - trimStart) / duration * 100).toFixed(0)}% of original)
              </p>
            </div>
          )}

          {/* Extracted Frame Preview */}
          {extractedFrame && (
            <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Extracted Frame</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExtractedFrame(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <img
                src={extractedFrame}
                alt="Extracted frame"
                className="w-48 h-auto rounded border border-border"
              />
              <p className="text-xs text-muted-foreground">
                Frame extracted at {formatTime(currentTime)}. Use this for re-animation.
              </p>
            </div>
          )}

          {/* Re-animate Panel */}
          {showReanimatePanel && (
            <div className="p-4 rounded-lg border border-primary/50 bg-primary/5 space-y-4">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Re-animate Video</span>
              </div>

              <p className="text-xs text-muted-foreground">
                {extractedFrame
                  ? 'Re-animate from the extracted frame with new settings.'
                  : originalImageUrl
                    ? 'Re-animate from the original source image with new settings.'
                    : 'Extract a frame first to use for re-animation.'}
              </p>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-muted-foreground">motion_prompt</label>
                  <Input
                    value={reanimatePrompt}
                    onChange={(e) => setReanimatePrompt(e.target.value)}
                    placeholder="Describe the motion (optional)"
                    className="font-mono"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-mono text-muted-foreground">duration</label>
                    <Select value={String(reanimateDuration)} onValueChange={(v) => setReanimateDuration(parseInt(v))}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 seconds</SelectItem>
                        <SelectItem value="5">5 seconds</SelectItem>
                        <SelectItem value="8">8 seconds</SelectItem>
                        <SelectItem value="10">10 seconds</SelectItem>
                        <SelectItem value="15">15 seconds</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-mono text-muted-foreground">aspect_ratio</label>
                    <Select value={reanimateAspectRatio} onValueChange={setReanimateAspectRatio}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASPECT_RATIOS.map(ar => (
                          <SelectItem key={ar.value} value={ar.value}>
                            {ar.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-mono text-muted-foreground">motion</label>
                    <Select value={reanimateMotion} onValueChange={setReanimateMotion}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MOTION_OPTIONS.map(mo => (
                          <SelectItem key={mo.value} value={mo.value}>
                            {mo.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  variant="terminal"
                  onClick={handleReanimate}
                  disabled={isReanimating || (!extractedFrame && !originalImageUrl)}
                  className="w-full"
                >
                  {isReanimating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Re-animating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Generate New Animation
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Footer actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="ghost" onClick={handleClose}>
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
