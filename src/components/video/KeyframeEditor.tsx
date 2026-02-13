"use client"

import { useCallback, useMemo } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useVideoEditorStore } from "@/stores/video-editor"
import type { AnimatableProperty, EasingFunction, ClipAnimation } from "@/stores/video-editor"
import { getClipDuration } from "@/stores/video-editor"

const PROPERTY_LABELS: Record<AnimatableProperty, string> = {
  zoom: "Zoom",
  rotate: "Rotate",
  panX: "Pan X",
  panY: "Pan Y",
  opacity: "Opacity",
  cropX: "Crop X",
  cropY: "Crop Y",
  cropWidth: "Crop W",
  cropHeight: "Crop H",
}

const PROPERTY_COLORS: Record<AnimatableProperty, string> = {
  zoom: "bg-blue-500",
  rotate: "bg-purple-500",
  panX: "bg-green-500",
  panY: "bg-emerald-500",
  opacity: "bg-amber-500",
  cropX: "bg-rose-500",
  cropY: "bg-pink-500",
  cropWidth: "bg-orange-500",
  cropHeight: "bg-red-500",
}

const EASING_OPTIONS: EasingFunction[] = ["linear", "easeIn", "easeOut", "easeInOut"]

interface KeyframeEditorProps {
  clipId: string
  animation: ClipAnimation | null
}

export function KeyframeEditor({ clipId, animation }: KeyframeEditorProps) {
  const clip = useVideoEditorStore((s) => s.clips.find((c) => c.id === clipId))
  const addKeyframe = useVideoEditorStore((s) => s.addKeyframe)
  const removeKeyframe = useVideoEditorStore((s) => s.removeKeyframe)
  const updateKeyframe = useVideoEditorStore((s) => s.updateKeyframe)

  const clipDuration = clip ? getClipDuration(clip) : 0

  const handleAddKeyframe = useCallback(
    (property: AnimatableProperty) => {
      const defaultValues: Record<AnimatableProperty, number> = {
        zoom: 1,
        rotate: 0,
        panX: 0,
        panY: 0,
        opacity: 1,
        cropX: 0,
        cropY: 0,
        cropWidth: 100,
        cropHeight: 100,
      }
      addKeyframe(clipId, property, 0.5, defaultValues[property], "easeInOut")
    },
    [addKeyframe, clipId]
  )

  const existingProperties = useMemo(() => {
    if (!animation) return []
    return animation.tracks.map((t) => t.property)
  }, [animation])

  const availableProperties = useMemo(() => {
    const all: AnimatableProperty[] = ["zoom", "rotate", "panX", "panY", "opacity", "cropX", "cropY", "cropWidth", "cropHeight"]
    return all.filter((p) => !existingProperties.includes(p))
  }, [existingProperties])

  if (!clip) return null

  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium">Keyframe Animation</p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-[11px]">
              <Plus className="h-3 w-3" />
              Add Track
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {availableProperties.map((prop) => (
              <DropdownMenuItem key={prop} onClick={() => handleAddKeyframe(prop)}>
                <span className={cn("mr-2 h-2 w-2 rounded-full", PROPERTY_COLORS[prop])} />
                {PROPERTY_LABELS[prop]}
              </DropdownMenuItem>
            ))}
            {availableProperties.length === 0 && (
              <DropdownMenuItem disabled>All properties have tracks</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {!animation || animation.tracks.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          No keyframes. Add a track to create custom animations.
        </p>
      ) : (
        <div className="space-y-2">
          {animation.tracks.map((track) => (
            <div key={track.property} className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full", PROPERTY_COLORS[track.property])} />
                <span className="text-[11px] font-medium">{PROPERTY_LABELS[track.property]}</span>
                <Badge variant="outline" className="text-[9px]">
                  {track.keyframes.length} kf
                </Badge>
              </div>

              {/* Horizontal track visualization */}
              <div className="relative h-6 rounded border border-border/40 bg-background/50">
                {track.keyframes.map((kf) => {
                  const left = `${kf.time * 100}%`
                  return (
                    <button
                      key={kf.id}
                      className="group absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                      style={{ left }}
                      title={`t=${kf.time.toFixed(2)} val=${kf.value.toFixed(2)} (${kf.easing})`}
                    >
                      <span className={cn(
                        "block h-3 w-3 rotate-45 rounded-sm border border-white/60 shadow-sm transition-transform group-hover:scale-125",
                        PROPERTY_COLORS[track.property]
                      )} />
                    </button>
                  )
                })}
              </div>

              {/* Keyframe detail list */}
              <div className="flex flex-wrap gap-1">
                {track.keyframes.map((kf) => (
                  <div
                    key={kf.id}
                    className="flex items-center gap-1 rounded border border-border/40 bg-background/60 px-1.5 py-0.5"
                  >
                    <span className="text-[10px] text-muted-foreground">
                      t={kf.time.toFixed(2)}
                    </span>
                    <input
                      type="number"
                      step={0.01}
                      value={kf.value}
                      onChange={(e) => updateKeyframe(clipId, kf.id, { value: parseFloat(e.target.value) || 0 })}
                      className="h-5 w-14 rounded border border-border/40 bg-transparent px-1 text-[10px]"
                    />
                    <select
                      value={kf.easing}
                      onChange={(e) => updateKeyframe(clipId, kf.id, { easing: e.target.value as EasingFunction })}
                      className="h-5 rounded border border-border/40 bg-transparent px-0.5 text-[10px]"
                    >
                      {EASING_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="h-4 w-4"
                      onClick={() => removeKeyframe(clipId, kf.id)}
                    >
                      <Trash2 className="h-2.5 w-2.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
