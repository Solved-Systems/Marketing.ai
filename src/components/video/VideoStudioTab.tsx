"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Camera,
  Clapperboard,
  Loader2,
  Monitor,
  Pause,
  Play,
  Scissors,
  Sparkles,
  Square,
  Upload,
  Video,
} from "lucide-react"

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message"
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputStatus,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface VideoStudioTabProps {
  brandId?: string
  brandName?: string | null
}

type CaptureMode = "screen" | "tab"

interface ShotPreset {
  id: string
  title: string
  description: string
  duration: number
  zoom: number
  rotate: number
  panX: number
  panY: number
}

interface TimelineClip {
  id: string
  name: string
  start: number
  end: number
  presetId: string
  color: string
  speed: number
  zoom: number
  cropX: number
  cropY: number
  cropWidth: number
  cropHeight: number
}

interface AssistantMessage {
  id: string
  role: "user" | "assistant"
  content: string
}

const SHOT_PRESETS: ShotPreset[] = [
  { id: "close-up-1", title: "Close up 1", description: "Subtle close-up on top", duration: 3, zoom: 1.08, rotate: 0.2, panX: 0, panY: -0.04 },
  { id: "close-up-2", title: "Close up 2", description: "Tilted close-up on side", duration: 3, zoom: 1.13, rotate: -3.2, panX: -0.03, panY: 0 },
  { id: "close-up-3", title: "Close up 3", description: "Subtle motion at corner", duration: 3, zoom: 1.11, rotate: 1.2, panX: 0.04, panY: -0.02 },
  { id: "close-up-4", title: "Close up 4", description: "Very subtle motion at center", duration: 2, zoom: 1.05, rotate: 0, panX: 0, panY: 0 },
  { id: "close-up-5", title: "Close up 5", description: "Top to bottom at center", duration: 4, zoom: 1.06, rotate: 0, panX: 0, panY: 0.06 },
  { id: "close-up-6", title: "Close up 6", description: "Extreme tilt close-up on top", duration: 8, zoom: 1.22, rotate: -8, panX: 0, panY: -0.08 },
  { id: "close-up-7", title: "Close up 7", description: "Zoomed-in close-up on a side", duration: 3, zoom: 1.26, rotate: 0, panX: 0.1, panY: 0 },
  { id: "close-up-8", title: "Close up 8", description: "Extreme top to bottom tilt", duration: 8, zoom: 1.2, rotate: -6, panX: 0, panY: 0.08 },
  { id: "close-up-9", title: "Close up 9", description: "Extreme tilt close-up on bottom", duration: 8, zoom: 1.2, rotate: 7, panX: 0, panY: 0.09 },
  { id: "close-up-10", title: "Close up 10", description: "Subtle rotation at center", duration: 4, zoom: 1.1, rotate: 2.5, panX: 0, panY: 0 },
  { id: "close-up-11", title: "Close up 11", description: "Very subtle motion at center", duration: 3, zoom: 1.07, rotate: -1, panX: 0, panY: 0 },
  { id: "close-up-12", title: "Close up 12", description: "Subtle rotation around center", duration: 2, zoom: 1.08, rotate: 1.5, panX: 0, panY: 0 },
  { id: "close-up-13", title: "Close up 13", description: "Top to bottom at a side", duration: 2, zoom: 1.12, rotate: 0, panX: 0.08, panY: 0.07 },
  { id: "close-up-14", title: "Close up 14", description: "Extreme tilt at a side", duration: 2.5, zoom: 1.22, rotate: 9, panX: 0.09, panY: 0 },
  { id: "close-up-15", title: "Close up 15", description: "Diagonal close-up sweep", duration: 3, zoom: 1.18, rotate: -10, panX: -0.06, panY: 0.04 },
]

const CLIP_COLORS = ["#3ABFF8", "#8B5CF6", "#F97316", "#22C55E", "#EAB308", "#EC4899", "#6366F1"]

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function getClipDuration(clip: TimelineClip) {
  return Math.max(0.2, clip.end - clip.start)
}

function getClipOutputDuration(clip: TimelineClip) {
  return getClipDuration(clip) / Math.max(0.25, clip.speed)
}

function getPresetById(presetId: string) {
  return SHOT_PRESETS.find((preset) => preset.id === presetId) ?? SHOT_PRESETS[0]
}

function getClipAtTime(clips: TimelineClip[], time: number) {
  return clips.find((clip) => time >= clip.start && time <= clip.end) ?? null
}

function createBaseClip(
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
  }
}

function getPreviewTransform(clip: TimelineClip | null) {
  if (!clip) return "scale(1)"
  const preset = getPresetById(clip.presetId)
  const zoom = preset.zoom * clip.zoom
  return `scale(${zoom}) translate(${preset.panX * 100}%, ${preset.panY * 100}%) rotate(${preset.rotate}deg)`
}

function getCropRect(clip: TimelineClip, sourceWidth: number, sourceHeight: number) {
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

function drawClipFrame(
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

function parseNumber(value: unknown): number | null {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "00:00.0"
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const tenth = Math.floor((seconds % 1) * 10)
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${tenth}`
}

function selectMimeType() {
  if (typeof MediaRecorder === "undefined") return ""
  const preferred = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ]
  return preferred.find((type) => MediaRecorder.isTypeSupported(type)) ?? ""
}

function parseAssistantJSON(content: string): Record<string, unknown> | null {
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

export function VideoStudioTab({ brandId, brandName }: VideoStudioTabProps) {
  const effectiveBrandId = brandId ?? "video-editor"
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const captureStreamRef = useRef<MediaStream | null>(null)
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])

  const [selectedPresetId, setSelectedPresetId] = useState(SHOT_PRESETS[0].id)

  const [captureMode, setCaptureMode] = useState<CaptureMode | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [captureError, setCaptureError] = useState<string | null>(null)

  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null)
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null)
  const [videoDuration, setVideoDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null)
  const [exportedUrl, setExportedUrl] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportStatus, setExportStatus] = useState<string | null>(null)

  const [clips, setClips] = useState<TimelineClip[]>([])
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null)
  const [selectedClipName, setSelectedClipName] = useState("")
  const [loopSelectedClip, setLoopSelectedClip] = useState(true)

  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([
    {
      id: createId("assistant"),
      role: "assistant",
      content:
        "Describe the edit you want. Example: trim the first scene to 4 seconds, set close-up-7, and split at 2.5s.",
    },
  ])
  const [assistantInput, setAssistantInput] = useState("")
  const [assistantStatus, setAssistantStatus] = useState<PromptInputStatus>("ready")

  const selectedPreset = useMemo(
    () => SHOT_PRESETS.find((preset) => preset.id === selectedPresetId) ?? SHOT_PRESETS[0],
    [selectedPresetId]
  )

  const selectedClip = useMemo(
    () => clips.find((clip) => clip.id === selectedClipId) ?? null,
    [clips, selectedClipId]
  )
  const currentTimelineClip = useMemo(() => getClipAtTime(clips, currentTime), [clips, currentTime])
  const previewClip = selectedClip ?? currentTimelineClip
  const outputDuration = useMemo(
    () => clips.reduce((total, clip) => total + getClipOutputDuration(clip), 0),
    [clips]
  )

  useEffect(() => {
    setSelectedClipName(selectedClip?.name ?? "")
  }, [selectedClip?.id, selectedClip?.name])

  const clearRecordingTimer = useCallback(() => {
    if (!recordingTimerRef.current) return
    clearInterval(recordingTimerRef.current)
    recordingTimerRef.current = null
  }, [])

  const stopCaptureTracks = useCallback(() => {
    const stream = captureStreamRef.current
    if (!stream) return
    stream.getTracks().forEach((track) => track.stop())
    captureStreamRef.current = null
  }, [])

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== "inactive") {
      recorder.stop()
      return
    }

    clearRecordingTimer()
    stopCaptureTracks()
    setIsRecording(false)
    setCaptureMode(null)
  }, [clearRecordingTimer, stopCaptureTracks])

  const startCapture = useCallback(
    async (mode: CaptureMode) => {
      if (isRecording) return

      setCaptureError(null)
      setCaptureMode(mode)

      if (!navigator.mediaDevices?.getDisplayMedia) {
        setCaptureError("Screen recording is not supported in this browser.")
        setCaptureMode(null)
        return
      }

      const displayOptions: DisplayMediaStreamOptions & {
        preferCurrentTab?: boolean
        selfBrowserSurface?: string
        surfaceSwitching?: string
        systemAudio?: string
      } = {
        video: {
          frameRate: 30,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          displaySurface: mode === "tab" ? "browser" : "monitor",
        },
        audio: true,
        preferCurrentTab: mode === "tab",
        selfBrowserSurface: "exclude",
        surfaceSwitching: "include",
        systemAudio: "include",
      }

      try {
        const stream = await navigator.mediaDevices.getDisplayMedia(displayOptions)
        captureStreamRef.current = stream

        const mimeType = selectMimeType()
        const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
        mediaRecorderRef.current = recorder
        recordedChunksRef.current = []

        recorder.ondataavailable = (event: BlobEvent) => {
          if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data)
          }
        }

        recorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, {
            type: mimeType || "video/webm",
          })

          setRecordingBlob(blob)
          setRecordingUrl((previous) => {
            if (previous) URL.revokeObjectURL(previous)
            return URL.createObjectURL(blob)
          })

          setVideoDuration(0)
          setCurrentTime(0)
          setIsPlaying(false)
          setClips([])
          setSelectedClipId(null)
          setSelectedClipName("")
          setExportedBlob(null)
          setExportedUrl((previous) => {
            if (previous) URL.revokeObjectURL(previous)
            return null
          })
          setExportProgress(0)
          setExportStatus(null)

          setIsRecording(false)
          setCaptureMode(null)
          clearRecordingTimer()
          stopCaptureTracks()
        }

        const [videoTrack] = stream.getVideoTracks()
        if (videoTrack) {
          videoTrack.addEventListener(
            "ended",
            () => {
              if (mediaRecorderRef.current?.state === "recording") {
                mediaRecorderRef.current.stop()
              }
            },
            { once: true }
          )
        }

        setRecordingSeconds(0)
        clearRecordingTimer()
        recordingTimerRef.current = setInterval(() => {
          setRecordingSeconds((seconds) => seconds + 1)
        }, 1000)

        recorder.start(250)
        setIsRecording(true)
      } catch (error) {
        setCaptureError(error instanceof Error ? error.message : "Could not start screen capture.")
        setCaptureMode(null)
        setIsRecording(false)
        clearRecordingTimer()
        stopCaptureTracks()
      }
    },
    [clearRecordingTimer, isRecording, stopCaptureTracks]
  )

  useEffect(() => {
    if (videoDuration <= 0) return

    setClips((previous) => {
      if (previous.length > 0) return previous

      return [
        createBaseClip({
          id: createId("clip"),
          name: "Scene 1",
          start: 0,
          end: Number(videoDuration.toFixed(2)),
          presetId: selectedPresetId,
          color: CLIP_COLORS[0],
        }),
      ]
    })
  }, [videoDuration, selectedPresetId])

  useEffect(() => {
    if (selectedClipId || clips.length === 0) return
    setSelectedClipId(clips[0].id)
  }, [clips, selectedClipId])

  useEffect(() => {
    return () => {
      clearRecordingTimer()
      stopCaptureTracks()
    }
  }, [clearRecordingTimer, stopCaptureTracks])

  useEffect(() => {
    return () => {
      if (recordingUrl) URL.revokeObjectURL(recordingUrl)
    }
  }, [recordingUrl])

  useEffect(() => {
    return () => {
      if (exportedUrl) URL.revokeObjectURL(exportedUrl)
    }
  }, [exportedUrl])

  const splitClipById = useCallback(
    (clipId: string, at: number) => {
      setClips((previous) => {
        const target = previous.find((clip) => clip.id === clipId)
        if (!target) return previous

        const splitAt = clamp(at, target.start + 0.2, target.end - 0.2)
        if (splitAt <= target.start || splitAt >= target.end) return previous

        const firstId = createId("clip")
        const secondId = createId("clip")
        setSelectedClipId(firstId)

        return previous.flatMap((clip) => {
          if (clip.id !== clipId) return [clip]

          return [
            { ...clip, id: firstId, name: `${clip.name} A`, end: Number(splitAt.toFixed(2)) },
            { ...clip, id: secondId, name: `${clip.name} B`, start: Number(splitAt.toFixed(2)) },
          ]
        })
      })
    },
    []
  )

  const exportEditedVideo = useCallback(async () => {
    if (!recordingUrl || clips.length === 0 || isExporting) return

    setIsExporting(true)
    setExportProgress(0)
    setExportStatus("Preparing export...")

    const sourceVideo = document.createElement("video")
    sourceVideo.src = recordingUrl
    sourceVideo.muted = true
    sourceVideo.playsInline = true
    sourceVideo.crossOrigin = "anonymous"
    sourceVideo.preload = "auto"

    try {
      await new Promise<void>((resolve, reject) => {
        sourceVideo.onloadedmetadata = () => resolve()
        sourceVideo.onerror = () => reject(new Error("Failed to load source video for export."))
      })

      const exportClips = [...clips].sort((a, b) => a.start - b.start)
      const totalFrames = Math.max(
        1,
        Math.ceil(
          exportClips.reduce((sum, clip) => sum + getClipOutputDuration(clip) * 30, 0)
        )
      )
      const width = sourceVideo.videoWidth || 1280
      const height = sourceVideo.videoHeight || 720

      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Could not initialize export canvas context.")

      const outputMimeType = selectMimeType() || "video/webm"
      const stream = canvas.captureStream(30)
      const recorder = new MediaRecorder(stream, { mimeType: outputMimeType })
      const chunks: Blob[] = []

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) chunks.push(event.data)
      }

      const stopped = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve()
      })

      recorder.start(250)

      let renderedFrames = 0
      const waitForSeek = async (time: number) => {
        await new Promise<void>((resolve, reject) => {
          const targetTime = clamp(time, 0, sourceVideo.duration || time)
          if (Math.abs(sourceVideo.currentTime - targetTime) < 0.001) {
            resolve()
            return
          }

          const onSeeked = () => {
            sourceVideo.removeEventListener("seeked", onSeeked)
            sourceVideo.removeEventListener("error", onError)
            resolve()
          }
          const onError = () => {
            sourceVideo.removeEventListener("seeked", onSeeked)
            sourceVideo.removeEventListener("error", onError)
            reject(new Error("Failed while seeking source video during export."))
          }
          sourceVideo.addEventListener("seeked", onSeeked, { once: true })
          sourceVideo.addEventListener("error", onError, { once: true })
          sourceVideo.currentTime = targetTime
        })
      }

      for (const clip of exportClips) {
        const clipOutputDuration = getClipOutputDuration(clip)
        const step = 1 / 30
        for (let outTime = 0; outTime < clipOutputDuration; outTime += step) {
          const sourceTime = clip.start + outTime * clip.speed
          await waitForSeek(sourceTime)
          drawClipFrame(ctx, sourceVideo, clip, width, height)

          renderedFrames += 1
          if (renderedFrames % 4 === 0 || renderedFrames === totalFrames) {
            setExportProgress(Math.round((renderedFrames / totalFrames) * 100))
          }

          // Give the media encoder time to consume frames.
          await new Promise((resolve) => setTimeout(resolve, 0))
        }
      }

      recorder.stop()
      await stopped

      const blob = new Blob(chunks, { type: outputMimeType })
      setExportedBlob(blob)
      setExportedUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous)
        return URL.createObjectURL(blob)
      })
      setExportProgress(100)
      setExportStatus("Export complete.")
    } catch (error) {
      setExportStatus(
        error instanceof Error ? `Export failed: ${error.message}` : "Export failed."
      )
    } finally {
      setIsExporting(false)
    }
  }, [clips, isExporting, recordingUrl])

  const downloadEditedExport = useCallback(() => {
    if (!exportedUrl) return
    const anchor = document.createElement("a")
    anchor.href = exportedUrl
    anchor.download = `${(brandName || "edited-video").replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.webm`
    anchor.click()
  }, [brandName, exportedUrl])

  const applyAssistantActions = useCallback(
    (payload: Record<string, unknown> | null) => {
      if (!payload) return
      const actions = Array.isArray(payload.actions) ? payload.actions : []

      for (const rawAction of actions) {
        if (!rawAction || typeof rawAction !== "object") continue
        const action = rawAction as Record<string, unknown>
        const actionType = String(action.type ?? "").toLowerCase().trim()
        const clipId = typeof action.clipId === "string" ? action.clipId : selectedClipId

        if (actionType === "set_preset" || actionType === "set_selected_preset" || actionType === "select_preset") {
          const presetId = String(action.presetId ?? action.preset ?? "").trim()
          if (SHOT_PRESETS.some((preset) => preset.id === presetId)) {
            setSelectedPresetId(presetId)
          }
          continue
        }

        if (actionType === "trim_clip" && clipId) {
          setClips((previous) =>
            previous.map((clip) => {
              if (clip.id !== clipId) return clip

              const rawStart = parseNumber(action.start)
              const rawEnd = parseNumber(action.end)
              const nextStart = clamp(rawStart ?? clip.start, 0, clip.end - 0.2)
              const nextEnd = clamp(rawEnd ?? clip.end, nextStart + 0.2, videoDuration || clip.end)
              return {
                ...clip,
                start: Number(nextStart.toFixed(2)),
                end: Number(nextEnd.toFixed(2)),
              }
            })
          )
          continue
        }

        if ((actionType === "set_clip_speed" || actionType === "speed_clip") && clipId) {
          const speed = parseNumber(action.speed)
          if (speed !== null) {
            setClips((previous) =>
              previous.map((clip) =>
                clip.id === clipId
                  ? { ...clip, speed: Number(clamp(speed, 0.25, 3).toFixed(2)) }
                  : clip
              )
            )
          }
          continue
        }

        if ((actionType === "set_clip_zoom" || actionType === "zoom_clip") && clipId) {
          const zoom = parseNumber(action.zoom)
          if (zoom !== null) {
            setClips((previous) =>
              previous.map((clip) =>
                clip.id === clipId
                  ? { ...clip, zoom: Number(clamp(zoom, 1, 3).toFixed(2)) }
                  : clip
              )
            )
          }
          continue
        }

        if ((actionType === "crop_clip" || actionType === "set_crop") && clipId) {
          const cropX = parseNumber(action.cropX ?? action.x)
          const cropY = parseNumber(action.cropY ?? action.y)
          const cropWidth = parseNumber(action.cropWidth ?? action.width)
          const cropHeight = parseNumber(action.cropHeight ?? action.height)
          setClips((previous) =>
            previous.map((clip) => {
              if (clip.id !== clipId) return clip

              const nextX = clamp(cropX ?? clip.cropX, 0, 100)
              const nextY = clamp(cropY ?? clip.cropY, 0, 100)
              const nextWidth = clamp(cropWidth ?? clip.cropWidth, 1, 100 - nextX)
              const nextHeight = clamp(cropHeight ?? clip.cropHeight, 1, 100 - nextY)

              return {
                ...clip,
                cropX: Number(nextX.toFixed(2)),
                cropY: Number(nextY.toFixed(2)),
                cropWidth: Number(nextWidth.toFixed(2)),
                cropHeight: Number(nextHeight.toFixed(2)),
              }
            })
          )
          continue
        }

        if (actionType === "rename_clip" && clipId) {
          const name = String(action.name ?? "").trim()
          if (name) {
            setClips((previous) =>
              previous.map((clip) => (clip.id === clipId ? { ...clip, name } : clip))
            )
          }
          continue
        }

        if (actionType === "split_clip" && clipId) {
          const at = parseNumber(action.at ?? action.time)
          if (at !== null) {
            splitClipById(clipId, at)
          }
          continue
        }

        if (actionType === "add_clip") {
          const startCandidate = parseNumber(action.start) ?? currentTime
          const durationCandidate = parseNumber(action.duration) ?? selectedPreset.duration
          const endCandidate = parseNumber(action.end) ?? startCandidate + durationCandidate
          if ((videoDuration || 0) <= 0) continue

          const start = clamp(startCandidate, 0, videoDuration - 0.2)
          const end = clamp(endCandidate, start + 0.2, videoDuration)
          const presetId = String(action.presetId ?? selectedPresetId)
          const nextClipId = createId("clip")

          setClips((previous) => [
            ...previous,
            {
              ...createBaseClip({
                id: nextClipId,
                name: String(action.name ?? `Scene ${previous.length + 1}`),
                start: Number(start.toFixed(2)),
                end: Number(end.toFixed(2)),
                presetId: SHOT_PRESETS.some((preset) => preset.id === presetId) ? presetId : selectedPresetId,
                color: CLIP_COLORS[previous.length % CLIP_COLORS.length],
              }),
              speed: Number(clamp(parseNumber(action.speed) ?? 1, 0.25, 3).toFixed(2)),
              zoom: Number(clamp(parseNumber(action.zoom) ?? 1, 1, 3).toFixed(2)),
            },
          ])
          setSelectedClipId(nextClipId)
          continue
        }

        if (actionType === "toggle_loop") {
          const value = action.value
          if (typeof value === "boolean") {
            setLoopSelectedClip(value)
          } else if (typeof value === "string") {
            setLoopSelectedClip(value.toLowerCase() === "true")
          }
          continue
        }

        if (actionType === "export_video") {
          void exportEditedVideo()
        }
      }
    },
    [
      currentTime,
      exportEditedVideo,
      selectedClipId,
      selectedPreset.duration,
      selectedPresetId,
      splitClipById,
      videoDuration,
    ]
  )

  const runAssistantPrompt = useCallback(
    async (prompt: string) => {
      const text = prompt.trim()
      if (!text || assistantStatus === "submitted" || assistantStatus === "streaming") return

      const userMessage: AssistantMessage = { id: createId("assistant"), role: "user", content: text }
      const nextHistory = [...assistantMessages, userMessage]

      setAssistantMessages(nextHistory)
      setAssistantStatus("streaming")
      setAssistantInput("")

      const editorSnapshot = {
        brandId: effectiveBrandId,
        brandName: brandName || "Brand",
        selectedPresetId,
        selectedClipId,
        loopSelectedClip,
        currentTime: Number(currentTime.toFixed(2)),
        videoDuration: Number(videoDuration.toFixed(2)),
        clips: clips.map((clip) => ({
          id: clip.id,
          name: clip.name,
          start: clip.start,
          end: clip.end,
          presetId: clip.presetId,
          speed: clip.speed,
          zoom: clip.zoom,
          cropX: clip.cropX,
          cropY: clip.cropY,
          cropWidth: clip.cropWidth,
          cropHeight: clip.cropHeight,
        })),
      }

      const systemPrompt = `You are a video editing copilot.
Keep responses brief and specific.

When edits are requested, include one JSON code block with this shape:
\`\`\`json
{
  "actions": [
    { "type": "set_preset", "presetId": "close-up-7" },
    { "type": "trim_clip", "clipId": "clip-id", "start": 0.4, "end": 3.8 },
    { "type": "set_clip_speed", "clipId": "clip-id", "speed": 1.35 },
    { "type": "set_clip_zoom", "clipId": "clip-id", "zoom": 1.45 },
    { "type": "crop_clip", "clipId": "clip-id", "x": 8, "y": 4, "width": 86, "height": 88 },
    { "type": "split_clip", "clipId": "clip-id", "at": 2.5 },
    { "type": "rename_clip", "clipId": "clip-id", "name": "Intro Beat" },
    { "type": "add_clip", "start": 4, "end": 7.5, "name": "Hook", "presetId": "close-up-3" },
    { "type": "toggle_loop", "value": true },
    { "type": "export_video" }
  ]
}
\`\`\`

Rules:
- Use only these preset IDs: ${SHOT_PRESETS.map((preset) => preset.id).join(", ")}
- Times are seconds as numbers.
- Never reference unknown clip IDs.
- If no concrete edits are needed, do not include JSON.

Current editor state:
${JSON.stringify(editorSnapshot, null, 2)}`

      try {
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: nextHistory.map(({ role, content }) => ({ role, content })),
            system: systemPrompt,
          }),
        })

        const data = await response.json()
        const content =
          typeof data?.content === "string" && data.content.trim().length > 0
            ? data.content
            : "I could not complete that edit request."

        const assistantMessage: AssistantMessage = {
          id: createId("assistant"),
          role: "assistant",
          content,
        }
        setAssistantMessages((previous) => [...previous, assistantMessage])
        applyAssistantActions(parseAssistantJSON(content))
        setAssistantStatus("ready")
      } catch (error) {
        setAssistantMessages((previous) => [
          ...previous,
          {
            id: createId("assistant"),
            role: "assistant",
            content:
              error instanceof Error
                ? `Edit assistant failed: ${error.message}`
                : "Edit assistant failed due to a network error.",
          },
        ])
        setAssistantStatus("error")
      }
    },
    [
      applyAssistantActions,
      assistantMessages,
      assistantStatus,
      effectiveBrandId,
      brandName,
      clips,
      currentTime,
      loopSelectedClip,
      selectedClipId,
      selectedPresetId,
      videoDuration,
    ]
  )

  const handleAssistantSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      void runAssistantPrompt(assistantInput)
    },
    [assistantInput, runAssistantPrompt]
  )

  const handleLoadedMetadata = useCallback((event: React.SyntheticEvent<HTMLVideoElement>) => {
    const nextDuration = event.currentTarget.duration
    if (!Number.isFinite(nextDuration) || nextDuration <= 0) return
    setVideoDuration(nextDuration)
  }, [])

  const handleTimeUpdate = useCallback(() => {
    const videoElement = videoRef.current
    if (!videoElement) return

    let nextTime = videoElement.currentTime
    const clipAtTime = getClipAtTime(clips, nextTime)
    videoElement.playbackRate = clipAtTime?.speed ?? 1
    if (loopSelectedClip && selectedClip && nextTime >= selectedClip.end - 0.04) {
      videoElement.currentTime = selectedClip.start
      nextTime = selectedClip.start
    }

    setCurrentTime(nextTime)
  }, [clips, loopSelectedClip, selectedClip])

  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement) return
    videoElement.playbackRate = previewClip?.speed ?? 1
  }, [previewClip?.id, previewClip?.speed])

  const handleSeek = useCallback(
    (value: number) => {
      const videoElement = videoRef.current
      if (!videoElement) return
      const nextValue = clamp(value, 0, videoDuration || 0)
      videoElement.currentTime = nextValue
      setCurrentTime(nextValue)
    },
    [videoDuration]
  )

  const togglePlayback = useCallback(async () => {
    const videoElement = videoRef.current
    if (!videoElement) return

    if (videoElement.paused) {
      await videoElement.play()
      setIsPlaying(true)
    } else {
      videoElement.pause()
      setIsPlaying(false)
    }
  }, [])

  const handleTrimStart = useCallback(
    (value: number) => {
      if (!selectedClipId) return
      setClips((previous) =>
        previous.map((clip) => {
          if (clip.id !== selectedClipId) return clip
          const start = clamp(value, 0, clip.end - 0.2)
          return { ...clip, start: Number(start.toFixed(2)) }
        })
      )
    },
    [selectedClipId]
  )

  const handleTrimEnd = useCallback(
    (value: number) => {
      if (!selectedClipId) return
      setClips((previous) =>
        previous.map((clip) => {
          if (clip.id !== selectedClipId) return clip
          const end = clamp(value, clip.start + 0.2, videoDuration || clip.end)
          return { ...clip, end: Number(end.toFixed(2)) }
        })
      )
    },
    [selectedClipId, videoDuration]
  )

  const handleClipSpeedChange = useCallback(
    (value: number) => {
      if (!selectedClipId) return
      setClips((previous) =>
        previous.map((clip) =>
          clip.id === selectedClipId
            ? { ...clip, speed: Number(clamp(value, 0.25, 3).toFixed(2)) }
            : clip
        )
      )
    },
    [selectedClipId]
  )

  const handleClipZoomChange = useCallback(
    (value: number) => {
      if (!selectedClipId) return
      setClips((previous) =>
        previous.map((clip) =>
          clip.id === selectedClipId
            ? { ...clip, zoom: Number(clamp(value, 1, 3).toFixed(2)) }
            : clip
        )
      )
    },
    [selectedClipId]
  )

  const handleClipCropChange = useCallback(
    (field: "cropX" | "cropY" | "cropWidth" | "cropHeight", value: number) => {
      if (!selectedClipId) return
      setClips((previous) =>
        previous.map((clip) => {
          if (clip.id !== selectedClipId) return clip

          let cropX = clip.cropX
          let cropY = clip.cropY
          let cropWidth = clip.cropWidth
          let cropHeight = clip.cropHeight

          if (field === "cropX") cropX = clamp(value, 0, 99)
          if (field === "cropY") cropY = clamp(value, 0, 99)
          if (field === "cropWidth") cropWidth = clamp(value, 1, 100)
          if (field === "cropHeight") cropHeight = clamp(value, 1, 100)

          cropWidth = clamp(cropWidth, 1, 100 - cropX)
          cropHeight = clamp(cropHeight, 1, 100 - cropY)

          return {
            ...clip,
            cropX: Number(cropX.toFixed(2)),
            cropY: Number(cropY.toFixed(2)),
            cropWidth: Number(cropWidth.toFixed(2)),
            cropHeight: Number(cropHeight.toFixed(2)),
          }
        })
      )
    },
    [selectedClipId]
  )

  const addClipAtPlayhead = useCallback(() => {
    if (videoDuration <= 0) return
    const baseDuration = selectedPreset.duration
    const start = clamp(currentTime, 0, videoDuration - 0.2)
    const end = clamp(start + baseDuration, start + 0.2, videoDuration)

    const nextClip: TimelineClip = {
      ...createBaseClip({
        id: createId("clip"),
        name: `Scene ${clips.length + 1}`,
        start: Number(start.toFixed(2)),
        end: Number(end.toFixed(2)),
        presetId: selectedPresetId,
        color: CLIP_COLORS[clips.length % CLIP_COLORS.length],
      }),
    }

    setClips((previous) => [...previous, nextClip])
    setSelectedClipId(nextClip.id)
  }, [clips.length, currentTime, selectedPreset.duration, selectedPresetId, videoDuration])

  const splitSelectedClip = useCallback(() => {
    if (!selectedClip) return
    splitClipById(selectedClip.id, currentTime)
  }, [currentTime, selectedClip, splitClipById])

  const applyPresetToSelectedClip = useCallback(() => {
    if (!selectedClipId) return
    setClips((previous) =>
      previous.map((clip) => (clip.id === selectedClipId ? { ...clip, presetId: selectedPresetId } : clip))
    )
  }, [selectedClipId, selectedPresetId])

  const saveSelectedClipName = useCallback(() => {
    if (!selectedClipId) return
    const nextName = selectedClipName.trim()
    if (!nextName) return
    setClips((previous) =>
      previous.map((clip) => (clip.id === selectedClipId ? { ...clip, name: nextName } : clip))
    )
  }, [selectedClipId, selectedClipName])

  const downloadRecording = useCallback(() => {
    if (!recordingUrl) return
    const anchor = document.createElement("a")
    anchor.href = recordingUrl
    anchor.download = `${(brandName || "recording").replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.webm`
    anchor.click()
  }, [brandName, recordingUrl])

  const activeClipPreset = previewClip ? getPresetById(previewClip.presetId) : selectedPreset
  const previewObjectPosition = previewClip
    ? `${previewClip.cropX + previewClip.cropWidth / 2}% ${previewClip.cropY + previewClip.cropHeight / 2}%`
    : "50% 50%"

  return (
    <div className="grid h-full min-h-0 grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
      <section className="order-2 flex min-h-0 flex-col border-y border-border/50 bg-card/20 xl:order-1 xl:border-y-0 xl:border-r">
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
          <p className="text-sm font-semibold">Close-ups</p>
          <Badge variant="secondary" className="font-mono text-[10px]">
            {SHOT_PRESETS.length}
          </Badge>
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-2 p-3">
            {SHOT_PRESETS.map((preset, index) => (
              <button
                key={preset.id}
                onClick={() => setSelectedPresetId(preset.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border px-2.5 py-2 text-left transition-colors",
                  selectedPresetId === preset.id
                    ? "border-primary/60 bg-primary/10"
                    : "border-border/40 bg-card/40 hover:bg-muted/50"
                )}
              >
                <div
                  className={cn(
                    "h-14 w-20 shrink-0 rounded-md border border-border/30 bg-gradient-to-br",
                    index % 3 === 0 && "from-cyan-300 via-indigo-500 to-pink-500",
                    index % 3 === 1 && "from-sky-400 via-blue-500 to-violet-600",
                    index % 3 === 2 && "from-indigo-400 via-fuchsia-500 to-rose-400"
                  )}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{preset.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{preset.description}</p>
                </div>
                <span className="ml-auto text-xs text-muted-foreground">{preset.duration}s</span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </section>

      <section className="order-1 flex min-h-0 flex-col xl:order-2">
        <div className="border-b border-border/50 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => void startCapture("screen")}
              disabled={isRecording}
              variant={captureMode === "screen" && isRecording ? "destructive" : "outline"}
            >
              <Monitor className="h-4 w-4" />
              Record Screen
            </Button>
            <Button
              onClick={() => void startCapture("tab")}
              disabled={isRecording}
              variant={captureMode === "tab" && isRecording ? "destructive" : "outline"}
            >
              <Camera className="h-4 w-4" />
              Record Tab
            </Button>
            <Button onClick={stopRecording} disabled={!isRecording} variant="destructive">
              <Square className="h-4 w-4" />
              Stop
            </Button>
            <Button onClick={downloadRecording} disabled={!recordingBlob} variant="ghost">
              <Upload className="h-4 w-4" />
              Download
            </Button>
            <Button onClick={() => void exportEditedVideo()} disabled={!recordingUrl || clips.length === 0 || isExporting} variant="default">
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Export Edited
            </Button>
            <Button onClick={downloadEditedExport} disabled={!exportedBlob} variant="ghost">
              <Upload className="h-4 w-4" />
              Download Edited
            </Button>
            {isRecording && (
              <Badge variant="destructive" className="font-mono text-xs">
                REC {formatTime(recordingSeconds)}
              </Badge>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            To capture another Chrome tab, click <strong>Record Tab</strong> and choose that tab in the browser picker.
          </p>
          {captureError ? (
            <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
              {captureError}
            </p>
          ) : null}
          {isExporting ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Exporting edited video... {exportProgress}%
            </p>
          ) : null}
          {exportStatus ? (
            <p className="mt-1 text-xs text-muted-foreground">{exportStatus}</p>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-5">
          <div className="mx-auto max-w-5xl space-y-4">
            <div className="overflow-hidden rounded-xl border border-border/60 bg-card/20">
              <div className="border-b border-border/50 px-4 py-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {brandName ? `${brandName} Video Studio` : "Video Studio"}
                  </p>
                  <Badge variant="outline" className="text-[11px]">
                    {activeClipPreset.title}
                  </Badge>
                </div>
              </div>

              <div className="p-3">
                <div className="relative mx-auto aspect-video w-full overflow-hidden rounded-lg bg-black">
                  {recordingUrl ? (
                    <>
                      <video
                        ref={videoRef}
                        src={recordingUrl}
                        className="h-full w-full object-cover transition-transform duration-500"
                        style={{
                          transform: getPreviewTransform(previewClip),
                          objectPosition: previewObjectPosition,
                        }}
                        onLoadedMetadata={handleLoadedMetadata}
                        onTimeUpdate={handleTimeUpdate}
                        onEnded={() => setIsPlaying(false)}
                        playsInline
                        muted
                      />
                      <div className="pointer-events-none absolute inset-0 border border-white/10" />
                    </>
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                      <Video className="h-8 w-8" />
                      <p className="text-sm">Record your screen or another browser tab to begin editing.</p>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Button size="icon-sm" variant="outline" onClick={togglePlayback} disabled={!recordingUrl}>
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <div className="flex-1">
                    <input
                      type="range"
                      min={0}
                      max={videoDuration || 0}
                      step={0.05}
                      value={currentTime}
                      onChange={(event) => handleSeek(parseFloat(event.target.value))}
                      disabled={!recordingUrl}
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted"
                    />
                  </div>
                  <p className="w-28 text-right font-mono text-xs text-muted-foreground">
                    {formatTime(currentTime)} / {formatTime(videoDuration)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-card/20 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">Timeline</p>
                  <p className="text-[11px] text-muted-foreground">
                    Output length: {formatTime(outputDuration)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" onClick={addClipAtPlayhead} disabled={!recordingUrl}>
                    <Clapperboard className="h-3.5 w-3.5" />
                    Add Clip
                  </Button>
                  <Button size="sm" variant="outline" onClick={splitSelectedClip} disabled={!selectedClip}>
                    <Scissors className="h-3.5 w-3.5" />
                    Split
                  </Button>
                  <Button size="sm" variant="outline" onClick={applyPresetToSelectedClip} disabled={!selectedClip}>
                    Apply Preset
                  </Button>
                  <Button
                    size="sm"
                    variant={loopSelectedClip ? "default" : "outline"}
                    onClick={() => setLoopSelectedClip((value) => !value)}
                    disabled={!selectedClip}
                  >
                    Loop Clip
                  </Button>
                </div>
              </div>

              <div className="relative h-14 overflow-hidden rounded-lg border border-border/50 bg-muted/30">
                {videoDuration > 0 && clips.length > 0 ? (
                  clips.map((clip) => {
                    const left = `${(clip.start / videoDuration) * 100}%`
                    const width = `${Math.max(((clip.end - clip.start) / videoDuration) * 100, 1.2)}%`
                    const isActive = clip.id === selectedClipId

                    return (
                      <button
                        key={clip.id}
                        onClick={() => setSelectedClipId(clip.id)}
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
                    Timeline appears after recording.
                  </div>
                )}
              </div>

              {selectedClip ? (
                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      value={selectedClipName}
                      onChange={(event) => setSelectedClipName(event.target.value)}
                      onBlur={saveSelectedClipName}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault()
                          saveSelectedClipName()
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
                        onChange={(event) => handleClipSpeedChange(parseFloat(event.target.value))}
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
                        onChange={(event) => handleClipZoomChange(parseFloat(event.target.value))}
                        className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted"
                      />
                    </label>
                  </div>

                  <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-medium">Crop</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => {
                          handleClipCropChange("cropX", 0)
                          handleClipCropChange("cropY", 0)
                          handleClipCropChange("cropWidth", 100)
                          handleClipCropChange("cropHeight", 100)
                        }}
                      >
                        Reset Crop
                      </Button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="text-xs text-muted-foreground">
                        X: {selectedClip.cropX.toFixed(1)}%
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={0.5}
                          value={selectedClip.cropX}
                          onChange={(event) => handleClipCropChange("cropX", parseFloat(event.target.value))}
                          className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted"
                        />
                      </label>
                      <label className="text-xs text-muted-foreground">
                        Y: {selectedClip.cropY.toFixed(1)}%
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={0.5}
                          value={selectedClip.cropY}
                          onChange={(event) => handleClipCropChange("cropY", parseFloat(event.target.value))}
                          className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted"
                        />
                      </label>
                      <label className="text-xs text-muted-foreground">
                        Width: {selectedClip.cropWidth.toFixed(1)}%
                        <input
                          type="range"
                          min={1}
                          max={100}
                          step={0.5}
                          value={selectedClip.cropWidth}
                          onChange={(event) => handleClipCropChange("cropWidth", parseFloat(event.target.value))}
                          className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted"
                        />
                      </label>
                      <label className="text-xs text-muted-foreground">
                        Height: {selectedClip.cropHeight.toFixed(1)}%
                        <input
                          type="range"
                          min={1}
                          max={100}
                          step={0.5}
                          value={selectedClip.cropHeight}
                          onChange={(event) => handleClipCropChange("cropHeight", parseFloat(event.target.value))}
                          className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="order-3 flex min-h-0 flex-col border-t border-border/50 bg-card/10 xl:border-t-0 xl:border-l">
        <div className="border-b border-border/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">AI Video Editor</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Chat-edit clips, presets, and timing using natural language.
          </p>
        </div>

        <div className="flex-1 min-h-0">
          <Conversation>
            <ConversationContent className="space-y-3">
              {assistantMessages.length === 0 ? (
                <ConversationEmptyState
                  title="Edit with AI"
                  description="Ask for trims, splits, timing changes, and close-up preset swaps."
                  icon={<Sparkles className="h-6 w-6" />}
                />
              ) : (
                assistantMessages.map((message) => (
                  <Message from={message.role} key={message.id}>
                    <MessageContent>
                      <MessageResponse>{message.content}</MessageResponse>
                    </MessageContent>
                  </Message>
                ))
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        </div>

        <div className="border-t border-border/50 p-3">
          <PromptInput onSubmit={handleAssistantSubmit}>
            <PromptInputBody>
              <PromptInputTextarea
                value={assistantInput}
                onChange={(event) => setAssistantInput(event.target.value)}
                placeholder="e.g. Split at 2.2s, crop to center, speed up to 1.5x, zoom to 1.4x, then export"
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => void runAssistantPrompt("Tighten pacing and create 3 clips of 3 to 4 seconds each.")}
                >
                  Tighten
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => void runAssistantPrompt("Apply subtle close-up presets across the existing clips.")}
                >
                  Presets
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => void runAssistantPrompt("Speed up quiet parts to 1.35x, add gentle zoom, and export.")}
                >
                  Speed + Export
                </Button>
              </PromptInputTools>
              <PromptInputSubmit
                status={assistantStatus}
                disabled={!assistantInput.trim() || assistantStatus === "streaming" || assistantStatus === "submitted"}
              />
            </PromptInputFooter>
          </PromptInput>
          {assistantStatus === "streaming" ? (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Applying edit suggestions...
            </p>
          ) : null}
        </div>
      </section>
    </div>
  )
}
