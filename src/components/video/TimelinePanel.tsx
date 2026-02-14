"use client"

import { useCallback, useMemo } from "react"
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

const RULER_STOPS = [0, 0.25, 0.5, 0.75, 1]

export function TimelinePanel() {
  const clips = useVideoEditorStore((s) => s.clips)
  const selectedClipId = useVideoEditorStore((s) => s.selectedClipId)
  const selectedPresetId = useVideoEditorStore((s) => s.selectedPresetId)
  const loopSelectedClip = useVideoEditorStore((s) => s.loopSelectedClip)
  const videoDuration = useVideoEditorStore((s) => s.videoDuration)
  const currentTime = useVideoEditorStore((s) => s.currentTime)
  const store = useVideoEditorStore

  const selectedClip = useMemo(
    () => clips.find((c) => c.id === selectedClipId) ?? null,
    [clips, selectedClipId]
  )

  const selectedPreset = useMemo(
    () => SHOT_PRESETS.find((preset) => preset.id === selectedPresetId) ?? SHOT_PRESETS[0],
    [selectedPresetId]
  )

  const outputDuration = useMemo(() => {
    if (clips.length === 0) return videoDuration
    return clips.reduce((total, clip) => total + getClipOutputDuration(clip), 0)
  }, [clips, videoDuration])

  const hasVideo = videoDuration > 0
  const hasTimeline = hasVideo && clips.length > 0
  const canSplitClip = Boolean(selectedClip)
  const selectedClipIndex = useMemo(
    () => clips.findIndex((clip) => clip.id === selectedClipId),
    [clips, selectedClipId]
  )
  const canMoveClipLeft = selectedClipIndex > 0
  const canMoveClipRight = selectedClipIndex >= 0 && selectedClipIndex < clips.length - 1
  const selectedClipOutputDuration = selectedClip ? getClipOutputDuration(selectedClip) : 0

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
          <p className="text-[11px] text-muted-foreground">
            Arrange, sequence, and refine clips before export.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-[10px]">
            Clips {clips.length}
          </Badge>
          <Badge variant="secondary" className="font-mono text-[11px]">
            Final output {formatTime(outputDuration)}
          </Badge>
        </div>
      </div>

      {hasVideo ? (
        <div className="mb-3 space-y-2">
          <div className="flex flex-wrap gap-2">
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 bg-background/35 p-1.5">
              <span className="px-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Build</span>
              <Button
                size="sm"
                variant="default"
                onClick={addClipAtPlayhead}
                title="Create a new clip at the playhead."
              >
                <Clapperboard className="h-3.5 w-3.5" />
                Add Clip
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={splitSelectedClip}
                disabled={!canSplitClip}
                className="disabled:opacity-45"
                title={!canSplitClip ? "Select a clip to split it." : "Split selected clip at playhead."}
              >
                <Scissors className="h-3.5 w-3.5" />
                Split
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 bg-background/35 p-1.5">
              <span className="px-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Refine</span>
              <Button
                size="sm"
                variant="outline"
                onClick={applyPresetToSelectedClip}
                disabled={!selectedClip}
                className="disabled:opacity-45"
                title={!selectedClip ? "Select a clip to apply a preset." : "Apply the currently selected preset."}
              >
                Apply Preset
              </Button>
              <Button
                size="sm"
                variant={loopSelectedClip ? "default" : "outline"}
                onClick={() => store.getState().setLoopSelectedClip(!loopSelectedClip)}
                disabled={!selectedClip}
                className="disabled:opacity-45"
                title={!selectedClip ? "Select a clip to toggle loop preview." : "Loop the selected clip during preview."}
              >
                Loop Clip
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 bg-background/35 p-1.5">
              <span className="px-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Arrange</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => moveSelectedClip("left")}
                disabled={!canMoveClipLeft}
                className="disabled:opacity-45"
                title={!selectedClip ? "Select a clip to reorder it." : "Move selected clip earlier in output order."}
              >
                <StepBack className="h-3.5 w-3.5" />
                Move Left
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => moveSelectedClip("right")}
                disabled={!canMoveClipRight}
                className="disabled:opacity-45"
                title={!selectedClip ? "Select a clip to reorder it." : "Move selected clip later in output order."}
              >
                <StepForward className="h-3.5 w-3.5" />
                Move Right
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={deleteSelectedClip}
                disabled={!selectedClip}
                className="disabled:opacity-45"
                title={!selectedClip ? "Select a clip to delete it." : "Delete selected clip."}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Clip
              </Button>
            </div>
          </div>

          {selectedClip ? (
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-primary/30 bg-primary/8 px-2.5 py-2 text-[11px]">
              <Badge variant="outline" className="font-mono text-[10px]">
                Selected {selectedClipIndex + 1}/{clips.length}
              </Badge>
              <span className="font-medium text-foreground">{selectedClip.name}</span>
              <span className="text-muted-foreground">
                Source {formatTime(selectedClip.start)} to {formatTime(selectedClip.end)}
              </span>
              <span className="text-muted-foreground">Output {formatTime(selectedClipOutputDuration)}</span>
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border/60 bg-background/20 px-2.5 py-2 text-[11px] text-muted-foreground">
              Select a clip to refine, reorder, or delete it.
            </div>
          )}
        </div>
      ) : null}

      <div className="mb-1 flex items-end justify-between px-1">
        {RULER_STOPS.map((stop) => (
          <div key={stop} className="flex flex-col items-center gap-0.5">
            <span className="font-mono text-[10px] text-muted-foreground">{formatTime(videoDuration * stop)}</span>
            <span className="h-1.5 w-px bg-border/70" />
          </div>
        ))}
      </div>

      <div className="relative h-16 overflow-hidden rounded-lg border border-border/50 bg-muted/25">
        {hasTimeline && (
          <>
            <div
              className="pointer-events-none absolute top-0 bottom-0 z-10 w-px bg-white/85"
              style={{ left: `${(currentTime / videoDuration) * 100}%` }}
            />
            <div
              className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded bg-background/80 px-1.5 py-0.5 font-mono text-[10px] text-foreground"
              style={{ left: `${(currentTime / videoDuration) * 100}%` }}
            >
              {formatTime(currentTime)}
            </div>
          </>
        )}

        {hasTimeline ? (
          clips.map((clip, index) => {
            const widthPct = Math.max(((clip.end - clip.start) / videoDuration) * 100, 1.2)
            const left = `${(clip.start / videoDuration) * 100}%`
            const width = `${widthPct}%`
            const isActive = clip.id === selectedClipId
            const showMeta = widthPct > 11

            return (
              <button
                key={clip.id}
                onClick={() => store.getState().selectClip(clip.id)}
                className={cn(
                  "absolute top-6 h-8 overflow-hidden rounded-md border text-left text-[11px] font-medium text-white shadow-sm transition",
                  isActive
                    ? "border-white/95 ring-2 ring-primary/60"
                    : "border-white/20 hover:border-white/40"
                )}
                style={{ left, width, backgroundColor: clip.color }}
                title={`${clip.name} · #${index + 1} · ${formatTime(clip.end - clip.start)} source`}
              >
                <span className="flex items-center gap-1 truncate px-1.5 py-1">
                  <ArrowLeftRight className="h-3 w-3 shrink-0 text-white/85" />
                  <span className="shrink-0 font-mono text-[10px] text-white/90">{index + 1}.</span>
                  <span className="truncate">{clip.name}</span>
                  {showMeta ? (
                    <span className="ml-auto shrink-0 rounded bg-black/25 px-1 py-0.5 font-mono text-[10px]">
                      {formatTime(getClipOutputDuration(clip))}
                    </span>
                  ) : null}
                </span>
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
  )
}
