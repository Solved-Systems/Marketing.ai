"use client"

import { useMemo } from "react"
import { PanelLeftClose, PanelLeftOpen, Search, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
  useVideoEditorStore,
  SHOT_PRESETS,
  PRESET_CATEGORIES,
  getPresetCategory,
} from "@/stores/video-editor"
import { legacyPresetToAnimation } from "@/lib/video-editor/animation-presets"
import { getClipDuration } from "@/stores/video-editor"

export function AnimationPanel() {
  const isAnimationsCollapsed = useVideoEditorStore((s) => s.isAnimationsCollapsed)
  const presetSearch = useVideoEditorStore((s) => s.presetSearch)
  const presetCategory = useVideoEditorStore((s) => s.presetCategory)
  const selectedPresetId = useVideoEditorStore((s) => s.selectedPresetId)
  const recordingUrl = useVideoEditorStore((s) => s.recordingUrl)
  const previewThumbnail = useVideoEditorStore((s) => s.previewThumbnail)
  const selectedClipId = useVideoEditorStore((s) => s.selectedClipId)
  const clips = useVideoEditorStore((s) => s.clips)
  const store = useVideoEditorStore

  const selectedClip = useMemo(
    () => clips.find((c) => c.id === selectedClipId) ?? null,
    [clips, selectedClipId]
  )

  const canPreviewAnimations = Boolean(recordingUrl)

  const visiblePresets = useMemo(() => {
    const normalizedSearch = presetSearch.trim().toLowerCase()
    return SHOT_PRESETS.filter((preset) => {
      const presetMatchesSearch =
        normalizedSearch.length === 0 ||
        preset.title.toLowerCase().includes(normalizedSearch) ||
        preset.description.toLowerCase().includes(normalizedSearch) ||
        preset.id.toLowerCase().includes(normalizedSearch)
      if (!presetMatchesSearch) return false
      if (presetCategory === "all") return true
      return getPresetCategory(preset) === presetCategory
    })
  }, [presetCategory, presetSearch])

  const presetCategoryCounts = useMemo(
    () => ({
      subtle: SHOT_PRESETS.filter((preset) => getPresetCategory(preset) === "subtle").length,
      medium: SHOT_PRESETS.filter((preset) => getPresetCategory(preset) === "medium").length,
      extreme: SHOT_PRESETS.filter((preset) => getPresetCategory(preset) === "extreme").length,
    }),
    []
  )

  const matchingPresetCount = visiblePresets.length
  const presetBadgeLabel =
    presetCategory === "all" && presetSearch.trim().length === 0
      ? `${SHOT_PRESETS.length}`
      : `${matchingPresetCount}/${SHOT_PRESETS.length}`

  const handleApplyPresetAsKeyframes = (presetId: string) => {
    if (!selectedClip) return
    const duration = getClipDuration(selectedClip)
    const animation = legacyPresetToAnimation(presetId, duration)
    if (animation) {
      store.getState().setClipAnimation(selectedClip.id, animation)
    }
  }

  return (
    <section className="order-2 flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-card/30 xl:order-1">
      <div className="flex items-center justify-between border-b border-border/50 px-3.5 py-2.5">
        {isAnimationsCollapsed ? (
          <Sparkles className="h-4 w-4 text-primary" />
        ) : (
          <>
            <p className="text-sm font-semibold">Animations</p>
            <Badge variant="secondary" className="font-mono text-[10px]">
              {presetBadgeLabel}
            </Badge>
          </>
        )}
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="ml-2"
          onClick={() => store.getState().setIsAnimationsCollapsed(!isAnimationsCollapsed)}
          aria-label={isAnimationsCollapsed ? "Expand animations panel" : "Collapse animations panel"}
          title={isAnimationsCollapsed ? "Expand animations panel" : "Collapse animations panel"}
        >
          {isAnimationsCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </div>

      {!isAnimationsCollapsed ? (
        <div className="space-y-2 border-b border-border/50 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={presetSearch}
                onChange={(event) => store.getState().setPresetSearch(event.target.value)}
                placeholder="Search presets"
                className="h-8 bg-background/70 pl-8 text-xs"
              />
            </div>
            <Select
              value={presetCategory}
              onValueChange={(value) => store.getState().setPresetCategory(value as "all" | "subtle" | "medium" | "extreme")}
            >
              <SelectTrigger size="sm" className="w-[130px] bg-background/70 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {PRESET_CATEGORIES.map((option) => {
                  const count =
                    option.value === "all" ? SHOT_PRESETS.length : presetCategoryCounts[option.value]
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      {`${option.label} (${count})`}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}

      <ScrollArea className="min-h-0 flex-1">
        {/* Static Presets Grid */}
        <div
          className={cn(
            "grid gap-2 p-3",
            isAnimationsCollapsed ? "grid-cols-1 p-2" : "grid-cols-2",
            !isAnimationsCollapsed && !canPreviewAnimations && "pt-2"
          )}
        >
          {visiblePresets.map((preset, index) => (
            <button
              key={preset.id}
              onClick={() => store.getState().setSelectedPresetId(preset.id)}
              onDoubleClick={() => handleApplyPresetAsKeyframes(preset.id)}
              aria-label={`${preset.title}: ${preset.description}`}
              title={selectedClip ? "Double-click to apply as keyframe animation" : preset.description}
              className={cn(
                "flex w-full rounded-lg border transition-colors",
                isAnimationsCollapsed
                  ? "items-center justify-center px-1.5 py-1.5"
                  : "flex-col gap-2 p-2 text-left",
                selectedPresetId === preset.id
                  ? "border-primary/60 bg-primary/12 shadow-[0_10px_24px_-22px_rgba(59,130,246,0.85)]"
                  : "border-border/40 bg-card/40 hover:border-border/70 hover:bg-muted/45"
              )}
            >
              <div
                className={cn(
                  "relative overflow-hidden rounded-md border border-border/30",
                  isAnimationsCollapsed ? "h-10 w-10 shrink-0" : "h-16 w-full"
                )}
              >
                {canPreviewAnimations && selectedPresetId === preset.id ? (
                  <video
                    src={recordingUrl ?? undefined}
                    className="h-full w-full object-cover"
                    style={{
                      transform: `scale(${preset.zoom}) translate(${preset.panX * 45}%, ${preset.panY * 45}%) rotate(${preset.rotate}deg)`,
                    }}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : canPreviewAnimations && previewThumbnail ? (
                  <img
                    src={previewThumbnail}
                    alt={preset.title}
                    className="h-full w-full object-cover"
                    style={{
                      transform: `scale(${preset.zoom}) translate(${preset.panX * 45}%, ${preset.panY * 45}%) rotate(${preset.rotate}deg)`,
                    }}
                  />
                ) : (
                  <div
                    className={cn(
                      "h-full w-full bg-gradient-to-br",
                      index % 3 === 0 && "from-cyan-300 via-indigo-500 to-pink-500",
                      index % 3 === 1 && "from-sky-400 via-blue-500 to-violet-600",
                      index % 3 === 2 && "from-indigo-400 via-fuchsia-500 to-rose-400"
                    )}
                  />
                )}
              </div>
              {!isAnimationsCollapsed ? (
                <div className="flex w-full items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{preset.title}</p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {preset.description}
                    </p>
                  </div>
                  <span className="rounded border border-border/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {preset.duration}s
                  </span>
                </div>
              ) : null}
            </button>
          ))}
          {visiblePresets.length === 0 ? (
            <div className="col-span-full rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 py-4 text-center text-xs text-muted-foreground">
              No presets matched your filter.
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </section>
  )
}
