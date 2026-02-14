"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ChevronDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  useVideoEditorStore,
  clamp,
  getPresetById,
  getClipDuration,
  getClipOutputDuration,
  formatTime,
} from "@/stores/video-editor"
import { getAnimationFactoryList, getAnimationFromFactory, legacyPresetToAnimation } from "@/lib/video-editor/animation-presets"
import { KeyframeEditor } from "./KeyframeEditor"

interface SliderNumberFieldProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  suffix?: string
  onChange: (value: number) => void
}

function SliderNumberField({
  label,
  value,
  min,
  max,
  step,
  suffix = "",
  onChange,
}: SliderNumberFieldProps) {
  return (
    <div className="rounded-md border border-border/50 bg-background/40 p-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <Input
          type="number"
          value={Number(value.toFixed(2))}
          min={min}
          max={max}
          step={step}
          onChange={(event) => {
            const parsed = Number(event.target.value)
            if (Number.isFinite(parsed)) onChange(parsed)
          }}
          className="h-8 w-24 text-right font-mono text-xs"
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(parseFloat(event.target.value))}
        className="h-2.5 w-full cursor-pointer appearance-none rounded-full bg-muted"
      />
      <p className="mt-1 text-right font-mono text-[11px] text-muted-foreground">
        {value.toFixed(2)}{suffix}
      </p>
    </div>
  )
}

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
  const animationFactories = useMemo(() => getAnimationFactoryList(), [])

  useEffect(() => {
    setClipName(selectedClip?.name ?? "")
  }, [selectedClip?.id, selectedClip?.name])

  const selectedPreset = selectedClip ? getPresetById(selectedClip.presetId) : null

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

  const handleApplyAnimationFactory = useCallback(
    (factoryId: string) => {
      if (!selectedClip) return
      const duration = getClipDuration(selectedClip)
      const animation = getAnimationFromFactory(factoryId, duration)
      if (animation) {
        store.getState().setClipAnimation(selectedClip.id, animation)
      }
    },
    [selectedClip]
  )

  const handleApplyPresetAsKeyframes = useCallback(() => {
    if (!selectedClip) return
    const duration = getClipDuration(selectedClip)
    const animation = legacyPresetToAnimation(selectedClip.presetId, duration)
    if (animation) {
      store.getState().setClipAnimation(selectedClip.id, animation)
    }
  }, [selectedClip])

  if (!selectedClip) return null

  return (
    <div className="space-y-3">
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
        <Badge variant="secondary">{selectedPreset?.title ?? "Unknown preset"}</Badge>
        <Badge variant="outline">Speed {selectedClip.speed.toFixed(2)}x</Badge>
        <Badge variant="outline">Zoom {selectedClip.zoom.toFixed(2)}x</Badge>
        <Badge variant="outline">
          Out {formatTime(getClipOutputDuration(selectedClip))}
        </Badge>
      </div>

      <details open className="rounded-lg border border-border/50 bg-muted/20 p-3">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold">
          Trim
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </summary>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <SliderNumberField
            label={`Clip Start (${formatTime(selectedClip.start)})`}
            value={selectedClip.start}
            min={0}
            max={videoDuration || selectedClip.end}
            step={0.05}
            onChange={handleTrimStart}
          />
          <SliderNumberField
            label={`Clip End (${formatTime(selectedClip.end)})`}
            value={selectedClip.end}
            min={0}
            max={videoDuration || selectedClip.end}
            step={0.05}
            onChange={handleTrimEnd}
          />
        </div>
      </details>

      <details open className="rounded-lg border border-border/50 bg-muted/20 p-3">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold">
          Speed & Zoom
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </summary>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <SliderNumberField
            label="Speed"
            value={selectedClip.speed}
            min={0.25}
            max={3}
            step={0.05}
            suffix="x"
            onChange={handleSpeedChange}
          />
          <SliderNumberField
            label="Zoom"
            value={selectedClip.zoom}
            min={1}
            max={3}
            step={0.05}
            suffix="x"
            onChange={handleZoomChange}
          />
        </div>
      </details>

      <details open className="rounded-lg border border-border/50 bg-muted/20 p-3">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold">
          Crop
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </summary>
        <div className="mt-3">
          <div className="mb-3 flex justify-end">
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
            <SliderNumberField
              label="Crop X"
              value={selectedClip.cropX}
              min={0}
              max={100}
              step={0.5}
              suffix="%"
              onChange={(value) => handleCropChange("cropX", value)}
            />
            <SliderNumberField
              label="Crop Y"
              value={selectedClip.cropY}
              min={0}
              max={100}
              step={0.5}
              suffix="%"
              onChange={(value) => handleCropChange("cropY", value)}
            />
            <SliderNumberField
              label="Crop Width"
              value={selectedClip.cropWidth}
              min={1}
              max={100}
              step={0.5}
              suffix="%"
              onChange={(value) => handleCropChange("cropWidth", value)}
            />
            <SliderNumberField
              label="Crop Height"
              value={selectedClip.cropHeight}
              min={1}
              max={100}
              step={0.5}
              suffix="%"
              onChange={(value) => handleCropChange("cropHeight", value)}
            />
          </div>
        </div>
      </details>

      <details open className="rounded-lg border border-border/50 bg-muted/20 p-3">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold">
          Animation
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </summary>
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleApplyPresetAsKeyframes}
            >
              Convert Preset To Keyframes
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-1.5 md:grid-cols-3">
            {animationFactories.map((factory) => (
              <Button
                key={factory.id}
                type="button"
                size="xs"
                variant="outline"
                className="h-7 justify-start text-[10px]"
                onClick={() => handleApplyAnimationFactory(factory.id)}
              >
                {factory.name}
              </Button>
            ))}
          </div>
          <KeyframeEditor clipId={selectedClip.id} animation={selectedClip.animation} />
        </div>
      </details>
    </div>
  )
}
