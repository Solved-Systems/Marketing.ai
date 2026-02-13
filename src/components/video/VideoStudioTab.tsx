"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Loader2, PanelRightClose, PanelRightOpen, Sparkles, WandSparkles } from "lucide-react"

import {
  Conversation,
  ConversationContent,
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
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  useVideoEditorStore,
  SHOT_PRESETS,
  CLIP_COLORS,
  ASSISTANT_QUICK_ACTIONS,
  createId,
  clamp,
  createBaseClip,
  getClipOutputDuration,
  drawClipFrame,
  selectMimeType,
  parseNumber,
} from "@/stores/video-editor"
import type { AssistantMessage } from "@/stores/video-editor"
import { importVideoFile } from "@/lib/video-editor/media-import"
import { executeActions } from "@/lib/video-editor/action-executor"
import type { EditorAction } from "@/lib/video-editor/action-types"

import { AnimationPanel } from "./AnimationPanel"
import { EditorToolbar } from "./EditorToolbar"
import { VideoPreviewCanvas } from "./VideoPreviewCanvas"
import { MediaDropZone } from "./MediaDropZone"
import { TimelinePanel } from "./TimelinePanel"
import { ClipInspector } from "./ClipInspector"

interface VideoStudioTabProps {
  brandId?: string
  brandName?: string | null
}

const ACTION_CODE_BLOCK_REGEX = /```json\s*[\s\S]*?```/gi
const GENERIC_CODE_BLOCK_REGEX = /```(?:\w+)?\s*([\s\S]*?)```/g

function formatAssistantSeconds(seconds: number) {
  if (!Number.isFinite(seconds)) return "0s"
  const rounded = Number(seconds.toFixed(1))
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}s`
}

function summarizeAssistantActions(payload: Record<string, unknown> | null) {
  if (!payload) return null
  const rawActions = Array.isArray(payload.actions) ? payload.actions : []
  const actions = rawActions.filter(
    (action): action is Record<string, unknown> => !!action && typeof action === "object"
  )
  if (actions.length === 0) return null

  const addClipActions = actions
    .map((action) => {
      const type = String(action.type ?? "").toLowerCase().trim()
      if (type !== "add_clip") return null

      const start = parseNumber(action.start)
      const endFromAction = parseNumber(action.end)
      const duration = parseNumber(action.duration)
      const end = endFromAction ?? (start !== null && duration !== null ? start + duration : null)
      if (start === null || end === null) return null

      const name = String(action.name ?? "").trim()
      return `${name || "Scene"} (${formatAssistantSeconds(start)} to ${formatAssistantSeconds(end)})`
    })
    .filter((detail): detail is string => Boolean(detail))

  const countByType = actions.reduce<Record<string, number>>((acc, action) => {
    const type = String(action.type ?? "").toLowerCase().trim()
    if (!type) return acc
    acc[type] = (acc[type] ?? 0) + 1
    return acc
  }, {})

  const summaryBits: string[] = []
  if (addClipActions.length > 0) {
    summaryBits.push(
      `Created ${addClipActions.length} clip${addClipActions.length === 1 ? "" : "s"}: ${addClipActions.join(", ")}`
    )
  }
  if (countByType.trim_clip) summaryBits.push(`Trimmed ${countByType.trim_clip} clip${countByType.trim_clip === 1 ? "" : "s"}`)
  if (countByType.split_clip) summaryBits.push(`Split ${countByType.split_clip} clip${countByType.split_clip === 1 ? "" : "s"}`)
  if (countByType.set_preset || countByType.select_preset || countByType.set_selected_preset) {
    const presetUpdates = (countByType.set_preset ?? 0) + (countByType.select_preset ?? 0) + (countByType.set_selected_preset ?? 0)
    summaryBits.push(`Updated preset ${presetUpdates === 1 ? "selection" : "selections"}`)
  }
  if (countByType.set_clip_speed || countByType.speed_clip) {
    const speedUpdates = (countByType.set_clip_speed ?? 0) + (countByType.speed_clip ?? 0)
    summaryBits.push(`Adjusted speed on ${speedUpdates} clip${speedUpdates === 1 ? "" : "s"}`)
  }
  if (countByType.export_video) summaryBits.push("Started export")

  if (summaryBits.length === 0) {
    return `Applied ${actions.length} edit action${actions.length === 1 ? "" : "s"}.`
  }
  return `Applied: ${summaryBits.join(" | ")}`
}

function buildAssistantMessageContent(content: string, payload: Record<string, unknown> | null) {
  const cleaned = content
    .replace(ACTION_CODE_BLOCK_REGEX, "")
    .replace(GENERIC_CODE_BLOCK_REGEX, (_match, code: string) => code.trim())
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim()

  const summary = summarizeAssistantActions(payload)
  if (cleaned && summary) return `${cleaned}\n\n${summary}`
  if (cleaned) return cleaned
  if (summary) return summary
  return "Applied the requested edits."
}

export function VideoStudioTab({ brandId, brandName }: VideoStudioTabProps) {
  const effectiveBrandId = brandId ?? "video-editor"

  // ── Refs (non-serializable, stay local) ──────────
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const captureStreamRef = useRef<MediaStream | null>(null)
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const assistantComposerRef = useRef<HTMLDivElement>(null)
  const assistantMessageEndRef = useRef<HTMLDivElement>(null)

  // ── Store selectors (only what this component needs) ──
  const clips = useVideoEditorStore((s) => s.clips)
  const selectedClipId = useVideoEditorStore((s) => s.selectedClipId)
  const selectedPresetId = useVideoEditorStore((s) => s.selectedPresetId)
  const isAnimationsCollapsed = useVideoEditorStore((s) => s.isAnimationsCollapsed)
  const isAssistantCollapsed = useVideoEditorStore((s) => s.isAssistantCollapsed)
  const isRecording = useVideoEditorStore((s) => s.isRecording)
  const recordCountdown = useVideoEditorStore((s) => s.recordCountdown)
  const recordingUrl = useVideoEditorStore((s) => s.recordingUrl)
  const videoDuration = useVideoEditorStore((s) => s.videoDuration)
  const isExporting = useVideoEditorStore((s) => s.isExporting)
  const exportedUrl = useVideoEditorStore((s) => s.exportedUrl)
  const store = useVideoEditorStore

  // ── AI assistant local state ──
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([])
  const [assistantInput, setAssistantInput] = useState("")
  const [assistantStatus, setAssistantStatus] = useState<PromptInputStatus>("ready")
  const [assistantComposerHeight, setAssistantComposerHeight] = useState(188)
  const hasUserMessage = useMemo(
    () => assistantMessages.some((message) => message.role === "user"),
    [assistantMessages]
  )

  // ── Layout ─────────────────────────────────────────
  const workspaceGridClass = useMemo(() => {
    if (isAnimationsCollapsed && isAssistantCollapsed) return "xl:grid-cols-[74px_minmax(0,1fr)_74px]"
    if (isAnimationsCollapsed) return "xl:grid-cols-[74px_minmax(0,1fr)_360px]"
    if (isAssistantCollapsed) return "xl:grid-cols-[280px_minmax(0,1fr)_74px]"
    return "xl:grid-cols-[280px_minmax(0,1fr)_360px]"
  }, [isAnimationsCollapsed, isAssistantCollapsed])

  // ── Undo / Redo keyboard shortcuts ─────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault()
        if (e.shiftKey) {
          useVideoEditorStore.temporal.getState().redo()
        } else {
          useVideoEditorStore.temporal.getState().undo()
        }
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  // ── Capture helpers ────────────────────────────────
  const clearRecordingTimer = useCallback(() => {
    if (!recordingTimerRef.current) return
    clearInterval(recordingTimerRef.current)
    recordingTimerRef.current = null
  }, [])

  const clearCountdownTimer = useCallback(() => {
    if (!countdownTimerRef.current) return
    clearInterval(countdownTimerRef.current)
    countdownTimerRef.current = null
  }, [])

  const stopCaptureTracks = useCallback(() => {
    const stream = captureStreamRef.current
    if (!stream) return
    stream.getTracks().forEach((track) => track.stop())
    captureStreamRef.current = null
    store.getState().setLivePreviewStream(null)
  }, [])

  const stopRecording = useCallback(() => {
    clearCountdownTimer()
    store.getState().setRecordCountdown(null)
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== "inactive") {
      recorder.stop()
      return
    }
    clearRecordingTimer()
    stopCaptureTracks()
    store.getState().setIsRecording(false)
  }, [clearCountdownTimer, clearRecordingTimer, stopCaptureTracks])

  const startCapture = useCallback(
    async (mode: string) => {
      if (isRecording) return
      const s = store.getState()
      s.setCaptureError(null)
      s.setRecordCountdown(null)

      if (!navigator.mediaDevices?.getDisplayMedia) {
        s.setCaptureError("Screen recording is not supported in this browser.")
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
        surfaceSwitching: "include",
        systemAudio: "include",
        ...(mode === "tab"
          ? { preferCurrentTab: true }
          : { selfBrowserSurface: "exclude" }),
      }

      try {
        const stream = await navigator.mediaDevices.getDisplayMedia(displayOptions)
        captureStreamRef.current = stream
        s.setLivePreviewStream(stream)
        s.setRecordingBlob(null)
        s.setRecordingUrl(null)

        const mimeType = selectMimeType()
        const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
        mediaRecorderRef.current = recorder
        recordedChunksRef.current = []

        recorder.ondataavailable = (event: BlobEvent) => {
          if (event.data.size > 0) recordedChunksRef.current.push(event.data)
        }

        recorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: mimeType || "video/webm" })
          const url = URL.createObjectURL(blob)
          const st = store.getState()
          const fallbackDuration = Math.max(0, st.recordingSeconds)
          st.setRecordingBlob(blob)
          st.setRecordingUrl(url)
          st.setVideoDuration(fallbackDuration)
          st.setCurrentTime(0)
          st.setIsPlaying(false)
          st.setClips([])
          st.selectClip(null)
          st.setExportedBlob(null)
          st.setExportedUrl(null)
          st.setExportProgress(0)
          st.setExportStatus(null)
          st.setIsRecording(false)
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

        s.setRecordingSeconds(0)
        clearRecordingTimer()
        recordingTimerRef.current = setInterval(() => {
          store.getState().setRecordingSeconds(store.getState().recordingSeconds + 1)
        }, 1000)

        recorder.start(250)
        s.setIsRecording(true)
      } catch (error) {
        const st = store.getState()
        st.setCaptureError(error instanceof Error ? error.message : "Could not start screen capture.")
        st.setIsRecording(false)
        st.setLivePreviewStream(null)
        clearRecordingTimer()
        stopCaptureTracks()
      }
    },
    [clearRecordingTimer, isRecording, stopCaptureTracks]
  )

  const startRecordingWithCountdown = useCallback(() => {
    if (isRecording) {
      stopRecording()
      return
    }
    if (recordCountdown !== null) {
      clearCountdownTimer()
      store.getState().setRecordCountdown(null)
      return
    }

    store.getState().setCaptureError(null)
    store.getState().setRecordCountdown(3)
    clearCountdownTimer()
    countdownTimerRef.current = setInterval(() => {
      const current = store.getState().recordCountdown
      if (current === null) return
      if (current <= 1) {
        clearCountdownTimer()
        void startCapture(store.getState().selectedCaptureMode)
        store.getState().setRecordCountdown(null)
      } else {
        store.getState().setRecordCountdown(current - 1)
      }
    }, 1000)
  }, [clearCountdownTimer, isRecording, recordCountdown, startCapture, stopRecording])

  // ── Initialize clips when video loads ──────────────
  useEffect(() => {
    if (videoDuration <= 0 || clips.length > 0) return
    store.getState().setClips([
      createBaseClip({
        id: createId("clip"),
        name: "Scene 1",
        start: 0,
        end: Number(videoDuration.toFixed(2)),
        presetId: selectedPresetId,
        color: CLIP_COLORS[0],
      }),
    ])
  }, [videoDuration, selectedPresetId, clips.length])

  useEffect(() => {
    if (selectedClipId || clips.length === 0) return
    store.getState().selectClip(clips[0].id)
  }, [clips, selectedClipId])

  // ── Cleanup ────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearCountdownTimer()
      clearRecordingTimer()
      stopCaptureTracks()
    }
  }, [clearCountdownTimer, clearRecordingTimer, stopCaptureTracks])

  // ── Thumbnail generation ───────────────────────────
  useEffect(() => {
    if (!recordingUrl) {
      store.getState().setPreviewThumbnail(null)
      return
    }

    let cancelled = false
    const video = document.createElement("video")
    video.src = recordingUrl
    video.muted = true
    video.playsInline = true
    video.preload = "auto"

    const handleSeeked = () => {
      if (cancelled) return
      try {
        const canvas = document.createElement("canvas")
        canvas.width = video.videoWidth || 320
        canvas.height = video.videoHeight || 180
        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          store.getState().setPreviewThumbnail(canvas.toDataURL("image/jpeg", 0.7))
        }
      } finally {
        video.pause()
        video.removeAttribute("src")
        video.load()
      }
    }

    const handleLoaded = () => {
      if (cancelled) return
      video.currentTime = Math.min(1, video.duration * 0.1)
    }

    video.addEventListener("loadeddata", handleLoaded, { once: true })
    video.addEventListener("seeked", handleSeeked, { once: true })

    return () => {
      cancelled = true
      video.pause()
      video.removeAttribute("src")
      video.load()
    }
  }, [recordingUrl])

  // ── Media import handler ───────────────────────────
  const handleFilesAccepted = useCallback(
    async (files: File[]) => {
      const file = files[0]
      if (!file) return

      try {
        const mediaSource = await importVideoFile(file)
        const s = store.getState()
        s.addMediaSource(mediaSource)
        s.setRecordingBlob(mediaSource.blob)
        s.setRecordingUrl(mediaSource.url)
        s.setVideoDuration(mediaSource.duration)
        s.setRecordingSeconds(Math.max(0, Math.round(mediaSource.duration)))
        s.setCurrentTime(0)
        s.setIsPlaying(false)
        s.setClips([])
        s.selectClip(null)
        s.setExportedBlob(null)
        s.setExportedUrl(null)
        s.setExportProgress(0)
        s.setExportStatus(null)
      } catch (error) {
        store.getState().setCaptureError(
          error instanceof Error ? error.message : "Failed to import video file."
        )
      }
    },
    []
  )

  // ── Export ─────────────────────────────────────────
  const exportEditedVideo = useCallback(async () => {
    if (!recordingUrl || clips.length === 0 || isExporting) return

    const s = store.getState()
    s.setIsExporting(true)
    s.setExportProgress(0)
    s.setExportStatus("Preparing export...")

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
        Math.ceil(exportClips.reduce((sum, clip) => sum + getClipOutputDuration(clip) * 30, 0))
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
            store.getState().setExportProgress(Math.round((renderedFrames / totalFrames) * 100))
          }
          await new Promise((resolve) => setTimeout(resolve, 0))
        }
      }

      recorder.stop()
      await stopped

      const blob = new Blob(chunks, { type: outputMimeType })
      const st = store.getState()
      st.setExportedBlob(blob)
      st.setExportedUrl(URL.createObjectURL(blob))
      st.setExportProgress(100)
      st.setExportStatus("Export complete.")
    } catch (error) {
      store.getState().setExportStatus(
        error instanceof Error ? `Export failed: ${error.message}` : "Export failed."
      )
    } finally {
      sourceVideo.pause()
      sourceVideo.removeAttribute("src")
      sourceVideo.load()
      store.getState().setIsExporting(false)
    }
  }, [clips, isExporting, recordingUrl])

  const downloadRecording = useCallback(() => {
    if (!recordingUrl) return
    const anchor = document.createElement("a")
    anchor.href = recordingUrl
    anchor.download = `${(brandName || "recording").replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.webm`
    anchor.click()
  }, [brandName, recordingUrl])

  const downloadEditedExport = useCallback(() => {
    if (!exportedUrl) return
    const anchor = document.createElement("a")
    anchor.href = exportedUrl
    anchor.download = `${(brandName || "edited-video").replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.webm`
    anchor.click()
  }, [brandName, exportedUrl])

  // ── AI Assistant ───────────────────────────────────
  const applyAssistantActions = useCallback(
    (actions: EditorAction[]) => {
      if (!actions || actions.length === 0) return
      executeActions(actions, { exportCallback: exportEditedVideo })
    },
    [exportEditedVideo]
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

      const s = store.getState()
      const editorSnapshot = {
        brandId: effectiveBrandId,
        brandName: brandName || "Brand",
        selectedPresetId: s.selectedPresetId,
        selectedClipId: s.selectedClipId,
        loopSelectedClip: s.loopSelectedClip,
        currentTime: Number(s.currentTime.toFixed(2)),
        videoDuration: Number(s.videoDuration.toFixed(2)),
        clips: s.clips.map((clip) => ({
          id: clip.id, name: clip.name, start: clip.start, end: clip.end,
          presetId: clip.presetId, speed: clip.speed, zoom: clip.zoom,
          cropX: clip.cropX, cropY: clip.cropY, cropWidth: clip.cropWidth, cropHeight: clip.cropHeight,
          animation: clip.animation,
        })),
      }

      try {
        const response = await fetch("/api/video-editor/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: nextHistory.map(({ role, content }) => ({ role, content })),
            editorState: editorSnapshot,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => null)
          throw new Error(errorData?.error || `Request failed (${response.status})`)
        }

        const data = await response.json()
        const content =
          typeof data?.content === "string" && data.content.trim().length > 0
            ? data.content
            : "Applied the requested edits."
        const actions: EditorAction[] = Array.isArray(data?.actions) ? data.actions : []

        // Build display message with action summary
        const actionsPayload = actions.length > 0 ? { actions } : null
        const displayContent = buildAssistantMessageContent(content, actionsPayload)

        const assistantMessage: AssistantMessage = {
          id: createId("assistant"),
          role: "assistant",
          content: displayContent,
        }
        setAssistantMessages((prev) => [...prev, assistantMessage])
        applyAssistantActions(actions)
        setAssistantStatus("ready")
      } catch (error) {
        setAssistantMessages((prev) => [
          ...prev,
          {
            id: createId("assistant"),
            role: "assistant",
            content: error instanceof Error ? `Edit assistant failed: ${error.message}` : "Edit assistant failed due to a network error.",
          },
        ])
        setAssistantStatus("error")
      }
    },
    [applyAssistantActions, assistantMessages, assistantStatus, effectiveBrandId, brandName]
  )

  const handleAssistantSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      void runAssistantPrompt(assistantInput)
    },
    [assistantInput, runAssistantPrompt]
  )

  useEffect(() => {
    const composerElement = assistantComposerRef.current
    if (!composerElement) return

    const updateComposerHeight = () => {
      setAssistantComposerHeight(composerElement.offsetHeight)
    }

    updateComposerHeight()
    if (typeof ResizeObserver === "undefined") return

    const observer = new ResizeObserver(() => updateComposerHeight())
    observer.observe(composerElement)
    return () => observer.disconnect()
  }, [assistantStatus, hasUserMessage])

  useEffect(() => {
    if (isAssistantCollapsed) return
    assistantMessageEndRef.current?.scrollIntoView({ block: "end", behavior: "auto" })
  }, [assistantComposerHeight, assistantMessages.length, assistantStatus, isAssistantCollapsed])

  // ── Render ─────────────────────────────────────────
  return (
    <div className={cn("grid h-full min-h-0 grid-cols-1 gap-3 p-3", workspaceGridClass)}>
      {/* Animations Panel */}
      <AnimationPanel />

      {/* Main Editor */}
      <section className="order-1 flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-card/20 xl:order-2">
        <EditorToolbar
          onStartRecording={startRecordingWithCountdown}
          onStartCapture={startCapture}
          onExport={() => void exportEditedVideo()}
          onDownloadOriginal={downloadRecording}
          onDownloadExport={downloadEditedExport}
          clearCountdownTimer={clearCountdownTimer}
        />

        <div className="flex-1 overflow-y-auto p-4 md:p-5">
          <div className="mx-auto max-w-5xl space-y-4">
            <MediaDropZone onFilesAccepted={handleFilesAccepted} disabled={isRecording}>
              <VideoPreviewCanvas
                brandName={brandName}
                videoRef={videoRef}
                onStartRecording={startRecordingWithCountdown}
              />
            </MediaDropZone>
            <TimelinePanel />
            <ClipInspector />
          </div>
        </div>
      </section>

      {/* AI Assistant Panel */}
      <section className="order-3 flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-gradient-to-b from-card/35 via-card/20 to-card/8">
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
          {isAssistantCollapsed ? (
            <Sparkles className="h-4 w-4 text-primary" />
          ) : (
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">AI Video Editor</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Tell the AI what to edit.
              </p>
            </div>
          )}
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={() => store.getState().setIsAssistantCollapsed(!isAssistantCollapsed)}
            aria-label={isAssistantCollapsed ? "Expand AI panel" : "Collapse AI panel"}
            title={isAssistantCollapsed ? "Expand AI panel" : "Collapse AI panel"}
          >
            {isAssistantCollapsed ? <PanelRightOpen className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
          </Button>
        </div>

        {isAssistantCollapsed ? (
          <div className="flex flex-1 items-center justify-center p-3">
            <div className="rounded-lg border border-border/60 bg-background/70 px-2 py-4 text-center">
              <WandSparkles className="mx-auto h-4 w-4 text-primary" />
              <p className="mt-2 text-[10px] text-muted-foreground">AI Tools</p>
            </div>
          </div>
        ) : (
          <div className="relative flex-1 min-h-0">
            <Conversation className="h-full">
              <ConversationContent
                className="space-y-3"
                style={{ paddingBottom: `${assistantComposerHeight + 16}px` }}
              >
                {assistantMessages.map((message) => (
                  <Message from={message.role} key={message.id}>
                    <MessageContent>
                      <MessageResponse>{message.content}</MessageResponse>
                    </MessageContent>
                  </Message>
                ))}
                <div ref={assistantMessageEndRef} className="h-px w-full" />
              </ConversationContent>
              <ConversationScrollButton
                style={{ bottom: `${assistantComposerHeight + 12}px` }}
              />
            </Conversation>

            <div
              ref={assistantComposerRef}
              className="absolute inset-x-0 bottom-0 border-t border-border/50 bg-card/95 p-3 backdrop-blur"
            >
              {!hasUserMessage ? (
                <p className="mb-2 text-[11px] text-muted-foreground">
                  Tip: Trim scene 1 to 4s, split at 2.5s, then apply close-up-7.
                </p>
              ) : null}
              <PromptInput onSubmit={handleAssistantSubmit}>
                <PromptInputBody>
                  <PromptInputTextarea
                    value={assistantInput}
                    onChange={(event) => setAssistantInput(event.target.value)}
                    placeholder="Describe the edit you want..."
                  />
                </PromptInputBody>
                <PromptInputFooter>
                  <PromptInputTools>
                    {ASSISTANT_QUICK_ACTIONS.map((action, index) => (
                      <Button
                        key={`quick-action-${action.id}`}
                        type="button"
                        size="sm"
                        variant={index === 0 ? "secondary" : "ghost"}
                        onClick={() => void runAssistantPrompt(action.prompt)}
                        title={action.description}
                        aria-label={action.label}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </PromptInputTools>
                  <PromptInputSubmit
                    status={assistantStatus}
                    disabled={!assistantInput.trim() || assistantStatus === "streaming" || assistantStatus === "submitted"}
                    title="Send"
                    aria-label="Send"
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
          </div>
        )}
      </section>
    </div>
  )
}
