"use client"

import { useCallback, useMemo } from "react"
import { Clapperboard, Scissors } from "lucide-react"
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

  const outputDuration = useMemo(
    () => {
      if (clips.length === 0) return videoDuration
      return clips.reduce((total, clip) => total + getClipOutputDuration(clip), 0)
    },
    [clips, videoDuration]
  )

  const hasVideo = videoDuration > 0
  const hasTimeline = hasVideo && clips.length > 0
  const canSplitClip = Boolean(selectedClip)

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

  return (
    <div className="rounded-xl border border-border/60 bg-card/20 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Timeline</p>
          <p className="text-[11px] text-muted-foreground">
            Arrange and refine clips, then export the final cut.
          </p>
        </div>
        <Badge variant="secondary" className="font-mono text-[11px]">
          Final output {formatTime(outputDuration)}
        </Badge>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {hasVideo ? (
          <>
            <Button
              size="sm"
              variant="default"
              onClick={addClipAtPlayhead}
              title="Create a new clip at the playhead."
            >
              <Clapperboard className="h-3.5 w-3.5" />
              Add Clip
            </Button>
            {clips.length > 0 ? (
              <>
                <span title={!canSplitClip ? "Select a clip to split it." : ""} className={cn(!canSplitClip && "cursor-not-allowed")}>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={splitSelectedClip}
                    disabled={!canSplitClip}
                    className="disabled:opacity-45"
                  >
                    <Scissors className="h-3.5 w-3.5" />
                    Split
                  </Button>
                </span>
                <span title={!selectedClip ? "Select a clip to apply a preset." : ""} className={cn(!selectedClip && "cursor-not-allowed")}>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={applyPresetToSelectedClip}
                    disabled={!selectedClip}
                    className="disabled:opacity-45"
                  >
                    Apply Preset
                  </Button>
                </span>
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
              </>
            ) : null}
          </>
        ) : null}
      </div>

      {/* Timeline Track */}
      <div className="relative h-14 overflow-hidden rounded-lg border border-border/50 bg-muted/30">
        {/* Playhead */}
        {hasTimeline && (
          <div
            className="absolute top-0 bottom-0 z-10 w-px bg-white/80"
            style={{ left: `${(currentTime / videoDuration) * 100}%` }}
          />
        )}
        {hasTimeline ? (
          clips.map((clip) => {
            const left = `${(clip.start / videoDuration) * 100}%`
            const width = `${Math.max(((clip.end - clip.start) / videoDuration) * 100, 1.2)}%`
            const isActive = clip.id === selectedClipId

            return (
              <button
                key={clip.id}
                onClick={() => store.getState().selectClip(clip.id)}
                className={cn(
                  "absolute top-1.5 h-10 overflow-hidden rounded-md border text-left text-[11px] font-medium text-white shadow-sm transition",
                  isActive ? "border-white/90 ring-2 ring-primary/60" : "border-white/20"
                )}
                style={{ left, width, backgroundColor: clip.color }}
              >
                <span className="block truncate px-2 py-2">{clip.name}</span>
              </button>
            )
          })
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            {hasVideo ? "No clips yet. Use Add Clip to start editing." : ""}
          </div>
        )}
      </div>
    </div>
  )
}
