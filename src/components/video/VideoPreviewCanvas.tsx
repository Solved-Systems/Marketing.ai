"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Pause, Play, Video } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  useVideoEditorStore,
  getClipAtTime,
  getClipOutputDuration,
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
  const mediaSources = useVideoEditorStore((s) => s.mediaSources)
  const exportedUrl = useVideoEditorStore((s) => s.exportedUrl)
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
  const [previewMode, setPreviewMode] = useState<"original" | "edited">("original")
  const [editedPreviewTime, setEditedPreviewTime] = useState(0)
  const editedTimeRef = useRef(0)
  const previousSourceTimeRef = useRef<number | null>(null)

  const latestMediaSourceUrl = useMemo(() => mediaSources[mediaSources.length - 1]?.url ?? null, [mediaSources])
  const sourceVideoUrl = recordingUrl ?? latestMediaSourceUrl
  const canPreviewOriginal = Boolean(sourceVideoUrl)
  const canPreviewEdited = Boolean(sourceVideoUrl || exportedUrl)
  const isShowingExport = previewMode === "edited" ? Boolean(exportedUrl) : false
  const shouldApplyLiveEdits = previewMode === "edited" && !isShowingExport
  const activeVideoUrl = isShowingExport ? exportedUrl : sourceVideoUrl

  const selectedClip = useMemo(
    () => clips.find((c) => c.id === selectedClipId) ?? null,
    [clips, selectedClipId]
  )
  const currentTimelineClip = useMemo(() => getClipAtTime(clips, currentTime), [clips, currentTime])
  const previewClip = selectedClip ?? currentTimelineClip
  const activeClipPreset = previewClip ? getPresetById(previewClip.presetId) : null

  const editedSegments = useMemo(() => {
    let outputCursor = 0
    return clips.map((clip) => {
      const outputDuration = getClipOutputDuration(clip)
      const segment = {
        clipId: clip.id,
        sourceStart: clip.start,
        sourceEnd: clip.end,
        speed: clip.speed,
        outputStart: outputCursor,
        outputEnd: outputCursor + outputDuration,
      }
      outputCursor += outputDuration
      return segment
    })
  }, [clips])

  const editedDuration = useMemo(
    () => (editedSegments.length > 0 ? editedSegments[editedSegments.length - 1].outputEnd : 0),
    [editedSegments]
  )

  const sourceTimeFromEditedTime = useCallback(
    (editedTime: number) => {
      if (editedSegments.length === 0) return 0
      const clampedEditedTime = clamp(editedTime, 0, editedDuration)
      const segment =
        editedSegments.find((candidate) => clampedEditedTime >= candidate.outputStart && clampedEditedTime < candidate.outputEnd) ??
        editedSegments[editedSegments.length - 1]
      const offsetWithinSegment = clampedEditedTime - segment.outputStart
      return clamp(
        segment.sourceStart + offsetWithinSegment * segment.speed,
        segment.sourceStart,
        segment.sourceEnd
      )
    },
    [editedDuration, editedSegments]
  )

  const editedTimeFromSourceTime = useCallback(
    (sourceTime: number) => {
      if (editedSegments.length === 0) return 0

      const containingSegment = editedSegments.find(
        (segment) => sourceTime >= segment.sourceStart && sourceTime <= segment.sourceEnd
      )
      if (containingSegment) {
        return clamp(
          containingSegment.outputStart + (sourceTime - containingSegment.sourceStart) / Math.max(0.25, containingSegment.speed),
          0,
          editedDuration
        )
      }

      if (sourceTime <= editedSegments[0].sourceStart) return 0
      return editedDuration
    },
    [editedDuration, editedSegments]
  )

  const previewObjectPosition = previewClip
    ? `${previewClip.cropX + previewClip.cropWidth / 2}% ${previewClip.cropY + previewClip.cropHeight / 2}%`
    : "50% 50%"

  const hasVideoPreview = Boolean(activeVideoUrl || livePreviewStream)
  const cropOverlayStyle = previewClip
    ? {
        left: `${previewClip.cropX}%`,
        top: `${previewClip.cropY}%`,
        width: `${previewClip.cropWidth}%`,
        height: `${previewClip.cropHeight}%`,
      }
    : null
  const shouldShowCropOverlay = Boolean(
    cropOverlayStyle &&
      activeVideoUrl &&
      !isShowingExport &&
      (previewClip?.cropX !== 0 ||
        previewClip?.cropY !== 0 ||
        previewClip?.cropWidth !== 100 ||
        previewClip?.cropHeight !== 100)
  )

  const syncDuration = useCallback(
    (rawDuration: number, fallbackTime = 0) => {
      const state = store.getState()
      const resolvedDuration = Number.isFinite(rawDuration) && rawDuration > 0
        ? rawDuration
        : Math.max(recordingSeconds, fallbackTime, state.videoDuration)

      if (!Number.isFinite(resolvedDuration) || resolvedDuration <= 0) return

      const roundedDuration = Number(resolvedDuration.toFixed(2))
      const previousDuration = state.videoDuration
      if (Math.abs(roundedDuration - previousDuration) > 0.04) {
        state.setVideoDuration(roundedDuration)

        // Keep the initial full-length clip synced when metadata refines duration.
        if (state.clips.length === 1) {
          const onlyClip = state.clips[0]
          if (Math.abs(onlyClip.start) < 0.02 && Math.abs(onlyClip.end - previousDuration) <= 0.1) {
            state.updateClip(onlyClip.id, { end: roundedDuration })
          }
        }
      }
    },
    [recordingSeconds]
  )

  useEffect(() => {
    if (!canPreviewEdited && previewMode === "edited") {
      setPreviewMode("original")
    }
  }, [canPreviewEdited, previewMode])

  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement) return
    if (!shouldApplyLiveEdits) {
      previousSourceTimeRef.current = null
      return
    }

    const mappedEditedTime = editedTimeFromSourceTime(currentTime)
    const mappedSourceTime = sourceTimeFromEditedTime(mappedEditedTime)

    editedTimeRef.current = mappedEditedTime
    setEditedPreviewTime(mappedEditedTime)
    previousSourceTimeRef.current = mappedSourceTime

    if (Math.abs(videoElement.currentTime - mappedSourceTime) > 0.03) {
      videoElement.currentTime = mappedSourceTime
    }

    const segment =
      editedSegments.find((candidate) => mappedEditedTime >= candidate.outputStart && mappedEditedTime < candidate.outputEnd) ??
      editedSegments[editedSegments.length - 1]
    videoElement.playbackRate = segment?.speed ?? 1
  }, [currentTime, editedSegments, editedTimeFromSourceTime, shouldApplyLiveEdits, sourceTimeFromEditedTime, videoRef])

  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement || shouldApplyLiveEdits) return
    if (Math.abs(videoElement.currentTime - currentTime) > 0.08) {
      videoElement.currentTime = currentTime
    }
  }, [currentTime, shouldApplyLiveEdits, videoRef])

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

    if (shouldApplyLiveEdits) {
      if (editedSegments.length === 0) {
        videoElement.playbackRate = 1
        store.getState().setCurrentTime(nextTime)
        syncDuration(videoElement.duration, nextTime)
        return
      }

      const currentEditedTime = clamp(editedTimeRef.current, 0, editedDuration)
      let currentSegmentIndex = editedSegments.findIndex(
        (segment) => currentEditedTime >= segment.outputStart && currentEditedTime < segment.outputEnd
      )
      if (currentSegmentIndex === -1) currentSegmentIndex = editedSegments.length - 1
      const currentSegment = editedSegments[currentSegmentIndex]

      videoElement.playbackRate = currentSegment.speed

      if (nextTime >= currentSegment.sourceEnd - 0.04) {
        const nextSegment = editedSegments[currentSegmentIndex + 1]
        if (nextSegment) {
          videoElement.currentTime = nextSegment.sourceStart
          nextTime = nextSegment.sourceStart
          editedTimeRef.current = nextSegment.outputStart
          setEditedPreviewTime(nextSegment.outputStart)
          previousSourceTimeRef.current = nextSegment.sourceStart
          store.getState().setCurrentTime(nextTime)
          return
        }

        editedTimeRef.current = editedDuration
        setEditedPreviewTime(editedDuration)
        previousSourceTimeRef.current = currentSegment.sourceEnd
        store.getState().setCurrentTime(currentSegment.sourceEnd)
        videoElement.pause()
        store.getState().setIsPlaying(false)
        return
      }

      const previousSourceTime = previousSourceTimeRef.current ?? nextTime
      const sourceDelta = Math.max(0, nextTime - previousSourceTime)
      const nextEditedTime = clamp(
        editedTimeRef.current + sourceDelta / Math.max(0.25, currentSegment.speed),
        0,
        editedDuration
      )
      editedTimeRef.current = nextEditedTime
      setEditedPreviewTime(nextEditedTime)
      previousSourceTimeRef.current = nextTime
    }

    store.getState().setCurrentTime(nextTime)
    syncDuration(videoElement.duration, nextTime)
  }, [editedDuration, editedSegments, shouldApplyLiveEdits, syncDuration, videoRef])

  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement) return
    videoElement.playbackRate = shouldApplyLiveEdits ? (previewClip?.speed ?? 1) : 1
  }, [shouldApplyLiveEdits, previewClip?.id, previewClip?.speed, videoRef])

  const handleSeek = useCallback(
    (value: number) => {
      const videoElement = videoRef.current
      if (!videoElement) return
      if (shouldApplyLiveEdits) {
        const nextEditedTime = clamp(value, 0, editedDuration)
        const sourceTime = sourceTimeFromEditedTime(nextEditedTime)
        editedTimeRef.current = nextEditedTime
        setEditedPreviewTime(nextEditedTime)
        previousSourceTimeRef.current = sourceTime
        videoElement.currentTime = sourceTime
        store.getState().setCurrentTime(sourceTime)
        return
      }

      const nextSourceTime = clamp(value, 0, videoDuration || 0)
      videoElement.currentTime = nextSourceTime
      store.getState().setCurrentTime(nextSourceTime)
    },
    [editedDuration, shouldApplyLiveEdits, sourceTimeFromEditedTime, videoDuration, videoRef]
  )

  const togglePlayback = useCallback(async () => {
    const videoElement = videoRef.current
    if (!videoElement) return

    if (videoElement.paused) {
      if (shouldApplyLiveEdits && editedDuration > 0) {
        if (editedTimeRef.current >= editedDuration - 0.02) {
          const restartSourceTime = sourceTimeFromEditedTime(0)
          editedTimeRef.current = 0
          setEditedPreviewTime(0)
          previousSourceTimeRef.current = restartSourceTime
          videoElement.currentTime = restartSourceTime
          store.getState().setCurrentTime(restartSourceTime)
        } else {
          previousSourceTimeRef.current = videoElement.currentTime
        }
      }
      await videoElement.play()
      store.getState().setIsPlaying(true)
    } else {
      videoElement.pause()
      store.getState().setIsPlaying(false)
    }
  }, [editedDuration, shouldApplyLiveEdits, sourceTimeFromEditedTime, videoRef])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-card/20 p-3">
      {(canPreviewOriginal || canPreviewEdited) && (
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="inline-flex rounded-md border border-border/50 bg-background/60 p-0.5">
            <Button
              type="button"
              size="sm"
              variant={previewMode === "original" ? "default" : "ghost"}
              className="h-7 rounded-sm px-2.5 text-xs"
              onClick={() => setPreviewMode("original")}
              disabled={!canPreviewOriginal}
            >
              Original
            </Button>
            <Button
              type="button"
              size="sm"
              variant={previewMode === "edited" ? "default" : "ghost"}
              className="h-7 rounded-sm px-2.5 text-xs"
              onClick={() => setPreviewMode("edited")}
              disabled={!canPreviewEdited}
            >
              Edited
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {exportedUrl ? "Compare original and exported cut" : "Compare original and live edited preview"}
          </p>
        </div>
      )}
      <div className="relative mx-auto min-h-[220px] w-full flex-1 overflow-hidden rounded-lg bg-black">
        {isShowingExport ? (
          <Badge variant="secondary" className="absolute right-3 top-3 z-10 text-[11px] backdrop-blur">
            Exported Preview
          </Badge>
        ) : activeClipPreset && activeClipPreset.id !== "none" ? (
          <Badge variant="outline" className="absolute right-3 top-3 z-10 text-[11px] backdrop-blur">
            {activeClipPreset.title}
          </Badge>
        ) : null}

        {hasVideoPreview ? (
          <>
            <video
              ref={videoRef}
              src={activeVideoUrl ?? undefined}
              className="h-full w-full object-cover transition-transform duration-500"
              style={
                activeVideoUrl && shouldApplyLiveEdits
                  ? {
                      transform: getPreviewTransform(previewClip),
                      objectPosition: previewObjectPosition,
                    }
                  : undefined
              }
              onLoadedMetadata={activeVideoUrl ? handleLoadedMetadata : undefined}
              onDurationChange={activeVideoUrl ? handleLoadedMetadata : undefined}
              onTimeUpdate={activeVideoUrl ? handleTimeUpdate : undefined}
              onEnded={() => store.getState().setIsPlaying(false)}
              playsInline
              muted
            />
            {activeVideoUrl && !isRecording && !isPlaying ? (
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
            {shouldShowCropOverlay && cropOverlayStyle ? (
              <div
                className="pointer-events-none absolute border-2 border-primary/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
                style={cropOverlayStyle}
              />
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
        <Button size="icon-sm" variant="outline" onClick={togglePlayback} disabled={!activeVideoUrl}>
          <span className="sr-only">{isPlaying ? "Pause" : "Play"}</span>
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={shouldApplyLiveEdits ? editedDuration : videoDuration || Math.max(recordingSeconds, currentTime, 0)}
            step={0.05}
            value={shouldApplyLiveEdits ? editedPreviewTime : currentTime}
            onChange={(event) => handleSeek(parseFloat(event.target.value))}
            disabled={!activeVideoUrl}
            className="h-8 w-full cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed disabled:opacity-45 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-background [&::-moz-range-thumb]:bg-primary [&::-moz-range-track]:h-2.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-muted [&::-webkit-slider-runnable-track]:h-2.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-muted [&::-webkit-slider-thumb]:mt-[-3px] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:bg-primary"
          />
        </div>
        <p className="w-28 text-right font-mono text-xs text-muted-foreground">
          {formatTime(shouldApplyLiveEdits ? editedPreviewTime : currentTime)} / {formatTime(shouldApplyLiveEdits ? editedDuration : videoDuration || Math.max(recordingSeconds, currentTime, 0))}
        </p>
      </div>
    </div>
  )
}
