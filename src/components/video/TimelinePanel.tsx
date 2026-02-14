"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeftRight, Clapperboard, Scissors, StepBack, StepForward, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  useVideoEditorStore,
  SHOT_PRESETS,
  CLIP_COLORS,
  createId,
  clamp,
  createBaseClip,
  getClipOutputDuration,
  formatTime,
} from "@/stores/video-editor"

interface OutputSegment {
  clipId: string
  outputStart: number
  outputEnd: number
  outputDuration: number
}

export function TimelinePanel() {
  const clips = useVideoEditorStore((s) => s.clips)
  const selectedClipId = useVideoEditorStore((s) => s.selectedClipId)
  const selectedPresetId = useVideoEditorStore((s) => s.selectedPresetId)
  const loopSelectedClip = useVideoEditorStore((s) => s.loopSelectedClip)
  const videoDuration = useVideoEditorStore((s) => s.videoDuration)
  const currentTime = useVideoEditorStore((s) => s.currentTime)
  const previewThumbnail = useVideoEditorStore((s) => s.previewThumbnail)
  const store = useVideoEditorStore

  const [dragClipId, setDragClipId] = useState<string | null>(null)
  const [dropClipId, setDropClipId] = useState<string | null>(null)
  const [isScrubbing, setIsScrubbing] = useState(false)
  const timelineSurfaceRef = useRef<HTMLDivElement | null>(null)

  const selectedClip = useMemo(
    () => clips.find((c) => c.id === selectedClipId) ?? null,
    [clips, selectedClipId]
  )

  const selectedPreset = useMemo(
    () => SHOT_PRESETS.find((preset) => preset.id === selectedPresetId) ?? SHOT_PRESETS[0],
    [selectedPresetId]
  )

  const outputSegments = useMemo<OutputSegment[]>(() => {
    let outputCursor = 0
    return clips.map((clip) => {
      const outputDuration = getClipOutputDuration(clip)
      const segment = {
        clipId: clip.id,
        outputStart: outputCursor,
        outputEnd: outputCursor + outputDuration,
        outputDuration,
      }
      outputCursor += outputDuration
      return segment
    })
  }, [clips])

  const outputDuration = useMemo(
    () => (outputSegments.length > 0 ? outputSegments[outputSegments.length - 1].outputEnd : videoDuration),
    [outputSegments, videoDuration]
  )

  const safeTimelineDuration = Math.max(outputDuration, 0.2)
  const hasVideo = videoDuration > 0
  const hasTimeline = hasVideo && clips.length > 0
  const canSplitClip = Boolean(selectedClip)
  const selectedClipIndex = useMemo(
    () => clips.findIndex((clip) => clip.id === selectedClipId),
    [clips, selectedClipId]
  )
  const canMoveClipLeft = selectedClipIndex > 0
  const canMoveClipRight = selectedClipIndex >= 0 && selectedClipIndex < clips.length - 1

  const sourceTimeFromOutputTime = useCallback(
    (nextOutputTime: number) => {
      if (outputSegments.length === 0) return clamp(nextOutputTime, 0, videoDuration)
      const clampedOutputTime = clamp(nextOutputTime, 0, safeTimelineDuration)
      const segment =
        outputSegments.find((candidate) => clampedOutputTime >= candidate.outputStart && clampedOutputTime < candidate.outputEnd) ??
        outputSegments[outputSegments.length - 1]
      const clip = clips.find((candidate) => candidate.id === segment.clipId)
      if (!clip) return 0
      const offsetWithinSegment = clampedOutputTime - segment.outputStart
      return clamp(clip.start + offsetWithinSegment * clip.speed, clip.start, clip.end)
    },
    [clips, outputSegments, safeTimelineDuration, videoDuration]
  )

  const outputTimeFromSourceTime = useCallback(
    (sourceTime: number) => {
      if (outputSegments.length === 0) return clamp(sourceTime, 0, safeTimelineDuration)

      for (let i = 0; i < clips.length; i += 1) {
        const clip = clips[i]
        const segment = outputSegments[i]
        if (!segment) continue
        if (sourceTime >= clip.start && sourceTime <= clip.end) {
          return clamp(
            segment.outputStart + (sourceTime - clip.start) / Math.max(clip.speed, 0.25),
            0,
            safeTimelineDuration
          )
        }
      }

      if (sourceTime <= clips[0].start) return 0
      return safeTimelineDuration
    },
    [clips, outputSegments, safeTimelineDuration]
  )

  const currentOutputTime = useMemo(
    () => (hasTimeline ? outputTimeFromSourceTime(currentTime) : currentTime),
    [currentTime, hasTimeline, outputTimeFromSourceTime]
  )

  const rulerStops = useMemo(() => {
    const step = 5
    const values: number[] = [0]
    for (let time = step; time < safeTimelineDuration; time += step) {
      values.push(time)
    }
    if (values[values.length - 1] !== safeTimelineDuration) {
      values.push(safeTimelineDuration)
    }
    return values
  }, [safeTimelineDuration])

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const timelineSurface = timelineSurfaceRef.current
      if (!timelineSurface) return
      const rect = timelineSurface.getBoundingClientRect()
      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1)
      const nextOutputTime = safeTimelineDuration * ratio
      const nextSourceTime = hasTimeline ? sourceTimeFromOutputTime(nextOutputTime) : nextOutputTime
      store.getState().setCurrentTime(nextSourceTime)
    },
    [hasTimeline, safeTimelineDuration, sourceTimeFromOutputTime]
  )

  useEffect(() => {
    if (!isScrubbing) return

    const handleMove = (event: MouseEvent) => {
      seekFromClientX(event.clientX)
    }

    const handleUp = () => {
      setIsScrubbing(false)
    }

    window.addEventListener("mousemove", handleMove)
    window.addEventListener("mouseup", handleUp)
    return () => {
      window.removeEventListener("mousemove", handleMove)
      window.removeEventListener("mouseup", handleUp)
    }
  }, [isScrubbing, seekFromClientX])

  const addClipAtPlayhead = useCallback(() => {
    if (videoDuration <= 0) return
    const baseDuration = selectedPreset.duration
    const start = clamp(currentTime, 0, videoDuration - 0.2)
    const end = clamp(start + baseDuration, start + 0.2, videoDuration)

    const nextClip = createBaseClip({
      id: createId("clip"),
      name: `Scene ${clips.length + 1}`,
      start: Number(start.toFixed(2)),
      end: Number(end.toFixed(2)),
      presetId: selectedPresetId,
      color: CLIP_COLORS[clips.length % CLIP_COLORS.length],
    })

    store.getState().addClip(nextClip)
    store.getState().selectClip(nextClip.id)
  }, [clips.length, currentTime, selectedPreset.duration, selectedPresetId, videoDuration])

  const splitSelectedClip = useCallback(() => {
    if (!selectedClip) return
    store.getState().splitClip(selectedClip.id, currentTime)
  }, [currentTime, selectedClip])

  const applyPresetToSelectedClip = useCallback(() => {
    if (!selectedClipId) return
    store.getState().applyPresetToClip(selectedClipId, selectedPresetId)
  }, [selectedClipId, selectedPresetId])

  const moveSelectedClip = useCallback(
    (direction: "left" | "right") => {
      if (selectedClipIndex < 0) return
      const targetIndex = direction === "left" ? selectedClipIndex - 1 : selectedClipIndex + 1
      if (targetIndex < 0 || targetIndex >= clips.length) return
      store.getState().reorderClips(selectedClipIndex, targetIndex)
    },
    [clips.length, selectedClipIndex]
  )

  const deleteSelectedClip = useCallback(() => {
    if (!selectedClipId) return
    store.getState().removeClip(selectedClipId)
  }, [selectedClipId])

  return (
    <div className="rounded-xl border border-border/60 bg-card/20 p-3.5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Timeline</p>
          <p className="text-[11px] text-muted-foreground">Directly manipulate sequence, timing, and order.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-[10px]">{clips.length} clips</Badge>
          <Badge variant="secondary" className="font-mono text-[11px]">Final output {formatTime(outputDuration)}</Badge>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-1.5 rounded-md border border-border/60 bg-background/30 p-1.5">
        <Button size="sm" variant="default" onClick={addClipAtPlayhead} title="Add clip at playhead">
          <Clapperboard className="h-3.5 w-3.5" />
          Add Clip
        </Button>
        <Button size="icon-sm" variant="outline" onClick={splitSelectedClip} disabled={!canSplitClip} title="Split selected clip">
          <Scissors className="h-3.5 w-3.5" />
          <span className="sr-only">Split</span>
        </Button>
        <Button size="icon-sm" variant="outline" onClick={applyPresetToSelectedClip} disabled={!selectedClip} title="Apply selected preset to selected clip">
          <ArrowLeftRight className="h-3.5 w-3.5" />
          <span className="sr-only">Apply Preset</span>
        </Button>
        <Button
          size="sm"
          variant={loopSelectedClip ? "default" : "outline"}
          onClick={() => store.getState().setLoopSelectedClip(!loopSelectedClip)}
          disabled={!selectedClip}
          title="Toggle loop selected clip"
        >
          Loop
        </Button>
        <div className="mx-1 h-5 w-px bg-border/70" />
        <Button size="icon-sm" variant="outline" onClick={() => moveSelectedClip("left")} disabled={!canMoveClipLeft} title="Move selected clip left">
          <StepBack className="h-3.5 w-3.5" />
          <span className="sr-only">Move Left</span>
        </Button>
        <Button size="icon-sm" variant="outline" onClick={() => moveSelectedClip("right")} disabled={!canMoveClipRight} title="Move selected clip right">
          <StepForward className="h-3.5 w-3.5" />
          <span className="sr-only">Move Right</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={deleteSelectedClip}
          disabled={!selectedClip}
          title="Delete selected clip"
          className="border-destructive/40 text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
      </div>

      <div className="mb-2 flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {clips.map((clip, index) => {
          const isActive = clip.id === selectedClipId
          return (
            <button
              key={clip.id}
              onClick={() => {
                store.getState().selectClip(clip.id)
                store.getState().setCurrentTime(clip.start)
              }}
              className={cn(
                "shrink-0 rounded-full border px-2 py-1 text-[11px] transition",
                isActive
                  ? "border-primary/70 bg-primary/15 text-foreground"
                  : "border-border/60 bg-background/20 text-muted-foreground hover:border-border"
              )}
              title={`Select ${clip.name}`}
            >
              {index + 1}. {clip.name}
            </button>
          )
        })}
      </div>

      <div ref={timelineSurfaceRef} className="space-y-2" onMouseDown={(event) => seekFromClientX(event.clientX)}>
        <div
          className="relative rounded-md border border-border/60 bg-background/20 px-1.5 py-1"
          role="button"
          aria-label="Seek timeline"
          title="Click to move playhead"
        >
          <div className="flex items-end justify-between gap-2 overflow-hidden">
            {rulerStops.map((stop) => (
              <div key={stop} className="flex flex-col items-center gap-0.5">
                <span className="font-mono text-[10px] text-muted-foreground">{formatTime(stop)}</span>
                <span className="h-2 w-px bg-border/80" />
              </div>
            ))}
          </div>

          {hasTimeline && (
            <div
              className="absolute -top-0.5 z-20 cursor-ew-resize"
              style={{ left: `${(currentOutputTime / safeTimelineDuration) * 100}%` }}
              onMouseDown={(event) => {
                event.stopPropagation()
                setIsScrubbing(true)
                seekFromClientX(event.clientX)
              }}
            >
              <div className="-translate-x-1/2">
                <div className="mx-auto h-0 w-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-[#FF4444]" />
                <div className="mx-auto h-8 w-[2px] bg-[#FF4444] shadow-[0_0_8px_rgba(255,68,68,0.65)]" />
              </div>
            </div>
          )}
        </div>

        <div className="relative h-[240px] overflow-hidden rounded-lg border border-border/50 bg-gradient-to-b from-muted/40 to-muted/20">
          {hasTimeline ? (
            <div
              className="pointer-events-none absolute top-0 bottom-0 z-20 w-[2px] bg-[#FF4444] shadow-[0_0_8px_rgba(255,68,68,0.65)]"
              style={{ left: `${(currentOutputTime / safeTimelineDuration) * 100}%` }}
            />
          ) : null}
          {hasTimeline ? (
            outputSegments.map((segment, index) => {
              const clip = clips[index]
              if (!clip) return null

              const widthPct = Math.max((segment.outputDuration / safeTimelineDuration) * 100, 3)
              const left = `${(segment.outputStart / safeTimelineDuration) * 100}%`
              const width = `${widthPct}%`
              const isActive = clip.id === selectedClipId
              const isDropTarget = dropClipId === clip.id && dragClipId !== clip.id
              const showExtendedMeta = widthPct >= 13
              const showThumbnail = widthPct >= 18 && Boolean(previewThumbnail)

              return (
                <button
                  key={clip.id}
                  draggable
                  onDragStart={(event) => {
                    setDragClipId(clip.id)
                    setDropClipId(null)
                    event.dataTransfer.effectAllowed = "move"
                    event.dataTransfer.setData("text/plain", clip.id)
                  }}
                  onDragOver={(event) => {
                    event.preventDefault()
                    setDropClipId(clip.id)
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    const draggedId = dragClipId ?? event.dataTransfer.getData("text/plain")
                    if (!draggedId || draggedId === clip.id) {
                      setDropClipId(null)
                      setDragClipId(null)
                      return
                    }
                    const fromIndex = clips.findIndex((candidate) => candidate.id === draggedId)
                    const toIndex = clips.findIndex((candidate) => candidate.id === clip.id)
                    if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
                      store.getState().reorderClips(fromIndex, toIndex)
                    }
                    setDropClipId(null)
                    setDragClipId(null)
                  }}
                  onDragEnd={() => {
                    setDropClipId(null)
                    setDragClipId(null)
                  }}
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation()
                    store.getState().selectClip(clip.id)
                    store.getState().setCurrentTime(clip.start)
                  }}
                  className={cn(
                    "absolute top-5 h-[140px] overflow-hidden rounded-md border text-left text-[11px] text-white shadow-sm transition",
                    isActive
                      ? "border-[#ffaa00] ring-2 ring-[#ffaa00]/50"
                      : "border-white/20 hover:border-white/50",
                    isDropTarget && "ring-2 ring-sky-300/70"
                  )}
                  style={{
                    left,
                    width,
                    backgroundColor: clip.color,
                    backgroundImage: previewThumbnail
                      ? `linear-gradient(to bottom, rgba(15,23,42,0.18), rgba(15,23,42,0.74)), url(${previewThumbnail})`
                      : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                  title={`${clip.name} · Output ${formatTime(segment.outputDuration)} · Drag to reorder`}
                >
                  <span className="flex items-center gap-1.5 px-2 pt-1.5">
                    <ArrowLeftRight className="h-3.5 w-3.5 shrink-0 text-white/85" />
                    <span className="shrink-0 font-mono text-[10px] text-white/90">{index + 1}</span>
                    <span className="truncate text-xs font-semibold">{clip.name}</span>
                    <span className="ml-auto shrink-0 rounded bg-black/30 px-1 py-0.5 font-mono text-[10px]">
                      {formatTime(segment.outputDuration)}
                    </span>
                  </span>

                  {showThumbnail ? (
                    <div className="mt-2 flex items-start gap-2 px-2">
                      <img
                        src={previewThumbnail ?? undefined}
                        alt={clip.name}
                        className="h-[90px] w-[90px] rounded border border-white/25 object-cover"
                        draggable={false}
                      />
                      {showExtendedMeta ? (
                        <div className="min-w-0 text-[10px] leading-4 text-white/90">
                          <p className="truncate font-mono">Source {formatTime(clip.start)} - {formatTime(clip.end)}</p>
                          <p className="truncate font-mono">Speed {clip.speed.toFixed(2)}x</p>
                        </div>
                      ) : null}
                    </div>
                  ) : showExtendedMeta ? (
                    <span className="mt-2 block truncate px-2 font-mono text-[10px] text-white/85">
                      Source {formatTime(clip.start)} to {formatTime(clip.end)}
                    </span>
                  ) : null}
                </button>
              )
            })
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              {hasVideo ? "No clips yet. Use Add Clip to start editing." : "Record or import a video to begin."}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
