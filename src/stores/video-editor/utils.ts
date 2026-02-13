import type { TimelineClip, ShotPreset, PresetCategory, ClipAnimation } from "./types"
import { SHOT_PRESETS } from "./constants"

export function createId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function getClipDuration(clip: TimelineClip) {
  return Math.max(0.2, clip.end - clip.start)
}

export function getClipOutputDuration(clip: TimelineClip) {
  return getClipDuration(clip) / Math.max(0.25, clip.speed)
}

export function getPresetCategory(preset: ShotPreset): Exclude<PresetCategory, "all"> {
  const intensity =
    (preset.zoom - 1) * 100 +
    Math.abs(preset.rotate) * 0.8 +
    (Math.abs(preset.panX) + Math.abs(preset.panY)) * 35
  if (intensity <= 13) return "subtle"
  if (intensity <= 24) return "medium"
  return "extreme"
}

export function getPresetById(presetId: string) {
  return SHOT_PRESETS.find((preset) => preset.id === presetId) ?? SHOT_PRESETS[0]
}

export function getClipAtTime(clips: TimelineClip[], time: number) {
  return clips.find((clip) => time >= clip.start && time <= clip.end) ?? null
}

export function createBaseClip(
  partial: Pick<TimelineClip, "id" | "name" | "start" | "end" | "presetId" | "color">
): TimelineClip {
  return {
    ...partial,
    speed: 1,
    zoom: 1,
    cropX: 0,
    cropY: 0,
    cropWidth: 100,
    cropHeight: 100,
    animation: null,
  }
}

export function getPreviewTransform(clip: TimelineClip | null, animation?: ClipAnimation | null, time?: number, duration?: number) {
  if (!clip) return "scale(1)"

  if (clip.animation && time !== undefined && duration !== undefined) {
    // Dynamic import would be needed here - for now fall through to static
    // Keyframe evaluation is handled in the rendering layer
  }

  const preset = getPresetById(clip.presetId)
  const zoom = preset.zoom * clip.zoom
  return `scale(${zoom}) translate(${preset.panX * 100}%, ${preset.panY * 100}%) rotate(${preset.rotate}deg)`
}

export function getCropRect(clip: TimelineClip, sourceWidth: number, sourceHeight: number) {
  const cropX = clamp(clip.cropX, 0, 100)
  const cropY = clamp(clip.cropY, 0, 100)
  const cropWidth = clamp(clip.cropWidth, 1, 100 - cropX)
  const cropHeight = clamp(clip.cropHeight, 1, 100 - cropY)

  return {
    x: (cropX / 100) * sourceWidth,
    y: (cropY / 100) * sourceHeight,
    width: (cropWidth / 100) * sourceWidth,
    height: (cropHeight / 100) * sourceHeight,
  }
}

export function drawClipFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  clip: TimelineClip,
  canvasWidth: number,
  canvasHeight: number
) {
  const preset = getPresetById(clip.presetId)
  const crop = getCropRect(clip, video.videoWidth, video.videoHeight)
  const zoom = preset.zoom * clip.zoom
  const rotation = (preset.rotate * Math.PI) / 180

  const coverScale = Math.max(canvasWidth / crop.width, canvasHeight / crop.height)
  const drawWidth = crop.width * coverScale * zoom
  const drawHeight = crop.height * coverScale * zoom
  const x = (canvasWidth - drawWidth) / 2 + preset.panX * canvasWidth
  const y = (canvasHeight - drawHeight) / 2 + preset.panY * canvasHeight

  ctx.save()
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)
  ctx.fillStyle = "black"
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)
  ctx.translate(canvasWidth / 2, canvasHeight / 2)
  ctx.rotate(rotation)
  ctx.translate(-canvasWidth / 2, -canvasHeight / 2)
  ctx.drawImage(video, crop.x, crop.y, crop.width, crop.height, x, y, drawWidth, drawHeight)
  ctx.restore()
}

export function parseNumber(value: unknown): number | null {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "00:00.0"
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const tenth = Math.floor((seconds % 1) * 10)
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${tenth}`
}

export function selectMimeType() {
  if (typeof MediaRecorder === "undefined") return ""
  const preferred = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ]
  return preferred.find((type) => MediaRecorder.isTypeSupported(type)) ?? ""
}

export function parseAssistantJSON(content: string): Record<string, unknown> | null {
  const blockMatch = content.match(/```json\s*([\s\S]*?)\s*```/i)
  const candidate = blockMatch?.[1] ?? content

  try {
    const parsed = JSON.parse(candidate)
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>
    }
    return null
  } catch {
    return null
  }
}
