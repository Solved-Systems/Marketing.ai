"use client"

import { useCallback, useEffect, useMemo } from "react"
import { Pause, Play, Video } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  useVideoEditorStore,
  getClipAtTime,
  getPresetById,
  getPreviewTransform,
  formatTime,
  clamp,
} from "@/stores/video-editor"

interface VideoPreviewCanvasProps {
  brandName?: string | null
  videoRef: React.RefObject<HTMLVideoElement | null>
  onStartRecording: () => void
}

export function VideoPreviewCanvas({ brandName, videoRef, onStartRecording }: VideoPreviewCanvasProps) {
  const recordingUrl = useVideoEditorStore((s) => s.recordingUrl)
  const livePreviewStream = useVideoEditorStore((s) => s.livePreviewStream)
  const isRecording = useVideoEditorStore((s) => s.isRecording)
  const isPlaying = useVideoEditorStore((s) => s.isPlaying)
  const recordCountdown = useVideoEditorStore((s) => s.recordCountdown)
  const recordingSeconds = useVideoEditorStore((s) => s.recordingSeconds)
  const videoDuration = useVideoEditorStore((s) => s.videoDuration)
  const currentTime = useVideoEditorStore((s) => s.currentTime)
  const clips = useVideoEditorStore((s) => s.clips)
  const selectedClipId = useVideoEditorStore((s) => s.selectedClipId)
  const store = useVideoEditorStore

  const selectedClip = useMemo(
    () => clips.find((c) => c.id === selectedClipId) ?? null,
    [clips, selectedClipId]
  )
  const currentTimelineClip = useMemo(() => getClipAtTime(clips, currentTime), [clips, currentTime])
  const previewClip = selectedClip ?? currentTimelineClip
  const activeClipPreset = previewClip ? getPresetById(previewClip.presetId) : null

  const previewObjectPosition = previewClip
    ? `${previewClip.cropX + previewClip.cropWidth / 2}% ${previewClip.cropY + previewClip.cropHeight / 2}%`
    : "50% 50%"

  const hasVideoPreview = Boolean(recordingUrl || livePreviewStream)

  const syncDuration = useCallback(
    (rawDuration: number, fallbackTime = 0) => {
      const resolvedDuration = Number.isFinite(rawDuration) && rawDuration > 0
        ? rawDuration
        : Math.max(recordingSeconds, fallbackTime, store.getState().videoDuration)

      if (!Number.isFinite(resolvedDuration) || resolvedDuration <= 0) return

      const roundedDuration = Number(resolvedDuration.toFixed(2))
      if (Math.abs(roundedDuration - store.getState().videoDuration) > 0.04) {
        store.getState().setVideoDuration(roundedDuration)
      }
    },
    [recordingSeconds]
  )

  // Live preview stream binding
  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement) return

    if (livePreviewStream) {
      videoElement.srcObject = livePreviewStream
      void videoElement.play().catch(() => {})
    } else if (videoElement.srcObject) {
      videoElement.pause()
      videoElement.srcObject = null
    }

    return () => {
      if (videoElement.srcObject) {
        videoElement.pause()
        videoElement.srcObject = null
      }
    }
  }, [livePreviewStream, videoRef])

  const handleLoadedMetadata = useCallback(
    (event: React.SyntheticEvent<HTMLVideoElement>) => {
      syncDuration(event.currentTarget.duration, event.currentTarget.currentTime)
    },
    [syncDuration]
  )

  const handleTimeUpdate = useCallback(() => {
    const videoElement = videoRef.current
    if (!videoElement) return

    let nextTime = videoElement.currentTime
    const clipAtTime = getClipAtTime(store.getState().clips, nextTime)
    videoElement.playbackRate = clipAtTime?.speed ?? 1

    const sc = store.getState()
    const selClip = sc.clips.find((c) => c.id === sc.selectedClipId) ?? null
    if (sc.loopSelectedClip && selClip && nextTime >= selClip.end - 0.04) {
      videoElement.currentTime = selClip.start
      nextTime = selClip.start
    }

    store.getState().setCurrentTime(nextTime)
    syncDuration(videoElement.duration, nextTime)
  }, [syncDuration, videoRef])

  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement) return
    videoElement.playbackRate = previewClip?.speed ?? 1
  }, [previewClip?.id, previewClip?.speed, videoRef])

  const handleSeek = useCallback(
    (value: number) => {
      const videoElement = videoRef.current
      if (!videoElement) return
      const nextValue = clamp(value, 0, videoDuration || 0)
      videoElement.currentTime = nextValue
      store.getState().setCurrentTime(nextValue)
    },
    [videoDuration, videoRef]
  )

  const togglePlayback = useCallback(async () => {
    const videoElement = videoRef.current
    if (!videoElement) return

    if (videoElement.paused) {
      await videoElement.play()
      store.getState().setIsPlaying(true)
    } else {
      videoElement.pause()
      store.getState().setIsPlaying(false)
    }
  }, [videoRef])

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card/20 p-3">
      <div className="relative mx-auto aspect-video w-full overflow-hidden rounded-lg bg-black">
        {activeClipPreset ? (
          <Badge variant="outline" className="absolute right-3 top-3 z-10 text-[11px] backdrop-blur">
            {activeClipPreset.title}
          </Badge>
        ) : null}

        {hasVideoPreview ? (
          <>
            <video
              ref={videoRef}
              src={recordingUrl ?? undefined}
              className="h-full w-full object-cover transition-transform duration-500"
              style={
                recordingUrl
                  ? {
                      transform: getPreviewTransform(previewClip),
                      objectPosition: previewObjectPosition,
                    }
                  : undefined
              }
              onLoadedMetadata={recordingUrl ? handleLoadedMetadata : undefined}
              onDurationChange={recordingUrl ? handleLoadedMetadata : undefined}
              onTimeUpdate={recordingUrl ? handleTimeUpdate : undefined}
              onEnded={() => store.getState().setIsPlaying(false)}
              playsInline
              muted
            />
            {recordingUrl && !isRecording && !isPlaying ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Button
                  type="button"
                  size="icon-lg"
                  variant="secondary"
                  onClick={() => void togglePlayback()}
                  className="h-14 w-14 rounded-full border border-border/60 bg-background/70 backdrop-blur"
                  aria-label="Play recording"
                >
                  <Play className="h-6 w-6" />
                </Button>
              </div>
            ) : null}
            {isRecording ? (
              <Badge variant="destructive" className="absolute left-3 top-3 font-mono text-[10px]">
                REC {formatTime(recordingSeconds)}
              </Badge>
            ) : null}
            <div className="pointer-events-none absolute inset-0 border border-white/10" />
          </>
        ) : (
          <div className="relative flex h-full w-full flex-col items-center justify-center gap-3 overflow-hidden text-center text-muted-foreground">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(56,189,248,0.18),transparent_45%),radial-gradient(circle_at_75%_70%,rgba(139,92,246,0.16),transparent_40%)]" />
            {recordCountdown !== null ? (
              <>
                <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full border border-primary/40 bg-primary/15 text-2xl font-semibold text-primary">
                  {recordCountdown}
                </div>
                <p className="relative z-10 text-sm">Get ready. Recording will start automatically.</p>
              </>
            ) : (
              <>
                <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-black/45 shadow-[0_0_0_12px_rgba(15,23,42,0.24)]">
                  <Video className="h-8 w-8 animate-pulse text-primary" />
                </div>
                <p className="relative z-10 text-sm font-medium text-foreground">
                  Start with a recording or drop a video file.
                </p>
                <Button
                  type="button"
                  size="sm"
                  onClick={onStartRecording}
                  className="relative z-10 mt-1"
                  title={brandName ? `Start recording for ${brandName}` : "Start recording"}
                >
                  <Video className="h-4 w-4" />
                  Start Recording
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Button size="icon-sm" variant="outline" onClick={togglePlayback} disabled={!recordingUrl}>
          <span className="sr-only">{isPlaying ? "Pause" : "Play"}</span>
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={videoDuration || Math.max(recordingSeconds, currentTime, 0)}
            step={0.05}
            value={currentTime}
            onChange={(event) => handleSeek(parseFloat(event.target.value))}
            disabled={!recordingUrl}
            className="h-8 w-full cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed disabled:opacity-45 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-background [&::-moz-range-thumb]:bg-primary [&::-moz-range-track]:h-2.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-muted [&::-webkit-slider-runnable-track]:h-2.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-muted [&::-webkit-slider-thumb]:mt-[-3px] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:bg-primary"
          />
        </div>
        <p className="w-28 text-right font-mono text-xs text-muted-foreground">
          {formatTime(currentTime)} / {formatTime(videoDuration || Math.max(recordingSeconds, currentTime, 0))}
        </p>
      </div>
    </div>
  )
}
