"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  useVideoEditorStore,
  clamp,
  getClipOutputDuration,
  formatTime,
} from "@/stores/video-editor"
import { KeyframeEditor } from "./KeyframeEditor"

export function ClipInspector() {
  const clips = useVideoEditorStore((s) => s.clips)
  const selectedClipId = useVideoEditorStore((s) => s.selectedClipId)
  const videoDuration = useVideoEditorStore((s) => s.videoDuration)
  const store = useVideoEditorStore

  const selectedClip = useMemo(
    () => clips.find((c) => c.id === selectedClipId) ?? null,
    [clips, selectedClipId]
  )

  const [clipName, setClipName] = useState("")

  useEffect(() => {
    setClipName(selectedClip?.name ?? "")
  }, [selectedClip?.id, selectedClip?.name])

  const saveClipName = useCallback(() => {
    if (!selectedClipId) return
    const nextName = clipName.trim()
    if (!nextName) return
    store.getState().updateClip(selectedClipId, { name: nextName })
  }, [selectedClipId, clipName])

  const handleTrimStart = useCallback(
    (value: number) => {
      if (!selectedClipId || !selectedClip) return
      const start = clamp(value, 0, selectedClip.end - 0.2)
      store.getState().updateClip(selectedClipId, { start: Number(start.toFixed(2)) })
    },
    [selectedClipId, selectedClip]
  )

  const handleTrimEnd = useCallback(
    (value: number) => {
      if (!selectedClipId || !selectedClip) return
      const end = clamp(value, selectedClip.start + 0.2, videoDuration || selectedClip.end)
      store.getState().updateClip(selectedClipId, { end: Number(end.toFixed(2)) })
    },
    [selectedClipId, selectedClip, videoDuration]
  )

  const handleSpeedChange = useCallback(
    (value: number) => {
      if (!selectedClipId) return
      store.getState().updateClip(selectedClipId, { speed: Number(clamp(value, 0.25, 3).toFixed(2)) })
    },
    [selectedClipId]
  )

  const handleZoomChange = useCallback(
    (value: number) => {
      if (!selectedClipId) return
      store.getState().updateClip(selectedClipId, { zoom: Number(clamp(value, 1, 3).toFixed(2)) })
    },
    [selectedClipId]
  )

  const handleCropChange = useCallback(
    (field: "cropX" | "cropY" | "cropWidth" | "cropHeight", value: number) => {
      if (!selectedClipId || !selectedClip) return

      let cropX = selectedClip.cropX
      let cropY = selectedClip.cropY
      let cropWidth = selectedClip.cropWidth
      let cropHeight = selectedClip.cropHeight

      if (field === "cropX") cropX = clamp(value, 0, 99)
      if (field === "cropY") cropY = clamp(value, 0, 99)
      if (field === "cropWidth") cropWidth = clamp(value, 1, 100)
      if (field === "cropHeight") cropHeight = clamp(value, 1, 100)

      cropWidth = clamp(cropWidth, 1, 100 - cropX)
      cropHeight = clamp(cropHeight, 1, 100 - cropY)

      store.getState().updateClip(selectedClipId, {
        cropX: Number(cropX.toFixed(2)),
        cropY: Number(cropY.toFixed(2)),
        cropWidth: Number(cropWidth.toFixed(2)),
        cropHeight: Number(cropHeight.toFixed(2)),
      })
    },
    [selectedClipId, selectedClip]
  )

  if (!selectedClip) return null

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={clipName}
          onChange={(event) => setClipName(event.target.value)}
          onBlur={saveClipName}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              saveClipName()
            }
          }}
          className="h-9 max-w-xs"
        />
        <Badge variant="secondary">{selectedClip.presetId}</Badge>
        <Badge variant="outline">Speed {selectedClip.speed.toFixed(2)}x</Badge>
        <Badge variant="outline">Zoom {selectedClip.zoom.toFixed(2)}x</Badge>
        <Badge variant="outline">
          Out {formatTime(getClipOutputDuration(selectedClip))}
        </Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-xs text-muted-foreground">
          Clip Start: {formatTime(selectedClip.start)}
          <input
            type="range"
            min={0}
            max={videoDuration || 0}
            step={0.05}
            value={selectedClip.start}
            onChange={(event) => handleTrimStart(parseFloat(event.target.value))}
            className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Clip End: {formatTime(selectedClip.end)}
          <input
            type="range"
            min={0}
            max={videoDuration || 0}
            step={0.05}
            value={selectedClip.end}
            onChange={(event) => handleTrimEnd(parseFloat(event.target.value))}
            className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted"
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-xs text-muted-foreground">
          Speed: {selectedClip.speed.toFixed(2)}x
          <input
            type="range"
            min={0.25}
            max={3}
            step={0.05}
            value={selectedClip.speed}
            onChange={(event) => handleSpeedChange(parseFloat(event.target.value))}
            className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Zoom: {selectedClip.zoom.toFixed(2)}x
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={selectedClip.zoom}
            onChange={(event) => handleZoomChange(parseFloat(event.target.value))}
            className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted"
          />
        </label>
      </div>

      {/* Crop controls */}
      <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium">Crop</p>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[11px]"
            onClick={() => {
              store.getState().updateClip(selectedClipId!, {
                cropX: 0,
                cropY: 0,
                cropWidth: 100,
                cropHeight: 100,
              })
            }}
          >
            Reset Crop
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs text-muted-foreground">
            X: {selectedClip.cropX.toFixed(1)}%
            <input
              type="range" min={0} max={100} step={0.5}
              value={selectedClip.cropX}
              onChange={(event) => handleCropChange("cropX", parseFloat(event.target.value))}
              className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Y: {selectedClip.cropY.toFixed(1)}%
            <input
              type="range" min={0} max={100} step={0.5}
              value={selectedClip.cropY}
              onChange={(event) => handleCropChange("cropY", parseFloat(event.target.value))}
              className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Width: {selectedClip.cropWidth.toFixed(1)}%
            <input
              type="range" min={1} max={100} step={0.5}
              value={selectedClip.cropWidth}
              onChange={(event) => handleCropChange("cropWidth", parseFloat(event.target.value))}
              className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Height: {selectedClip.cropHeight.toFixed(1)}%
            <input
              type="range" min={1} max={100} step={0.5}
              value={selectedClip.cropHeight}
              onChange={(event) => handleCropChange("cropHeight", parseFloat(event.target.value))}
              className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted"
            />
          </label>
        </div>
      </div>

      {/* Keyframe Editor */}
      <KeyframeEditor clipId={selectedClip.id} animation={selectedClip.animation} />
    </div>
  )
}
