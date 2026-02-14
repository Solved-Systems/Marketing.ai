import { create } from "zustand"
import { temporal } from "zundo"
import { immer } from "zustand/middleware/immer"
import type {
  VideoEditorState,
  VideoEditorActions,
  TemporalState,
  TimelineClip,
  AnimatableProperty,
  EasingFunction,
  ClipAnimation,
  MediaSource,
  PresetCategory,
  CaptureMode,
} from "./types"
import { SHOT_PRESETS, CLIP_COLORS } from "./constants"
import { createId, clamp } from "./utils"

function areAnimationsEqual(a: ClipAnimation | null, b: ClipAnimation | null) {
  if (a === b) return true
  if (!a || !b) return false
  if (a.id !== b.id || a.name !== b.name) return false
  if (a.tracks.length !== b.tracks.length) return false

  for (let i = 0; i < a.tracks.length; i += 1) {
    const trackA = a.tracks[i]
    const trackB = b.tracks[i]
    if (trackA.property !== trackB.property) return false
    if (trackA.keyframes.length !== trackB.keyframes.length) return false

    for (let j = 0; j < trackA.keyframes.length; j += 1) {
      const kfA = trackA.keyframes[j]
      const kfB = trackB.keyframes[j]
      if (
        kfA.id !== kfB.id ||
        kfA.time !== kfB.time ||
        kfA.value !== kfB.value ||
        kfA.easing !== kfB.easing
      ) {
        return false
      }
    }
  }

  return true
}

function areClipsEqual(a: TimelineClip[], b: TimelineClip[]) {
  if (a === b) return true
  if (a.length !== b.length) return false

  for (let i = 0; i < a.length; i += 1) {
    const clipA = a[i]
    const clipB = b[i]
    if (
      clipA.id !== clipB.id ||
      clipA.name !== clipB.name ||
      clipA.start !== clipB.start ||
      clipA.end !== clipB.end ||
      clipA.presetId !== clipB.presetId ||
      clipA.color !== clipB.color ||
      clipA.speed !== clipB.speed ||
      clipA.zoom !== clipB.zoom ||
      clipA.cropX !== clipB.cropX ||
      clipA.cropY !== clipB.cropY ||
      clipA.cropWidth !== clipB.cropWidth ||
      clipA.cropHeight !== clipB.cropHeight ||
      clipA.mediaSourceId !== clipB.mediaSourceId ||
      !areAnimationsEqual(clipA.animation, clipB.animation)
    ) {
      return false
    }
  }

  return true
}

const initialState: VideoEditorState = {
  // Timeline state
  clips: [],
  selectedClipId: null,
  selectedPresetId: SHOT_PRESETS[0].id,
  loopSelectedClip: true,

  // UI panel state
  isAnimationsCollapsed: true,
  isAssistantCollapsed: false,
  presetSearch: "",
  presetCategory: "all" as PresetCategory,

  // Capture state
  selectedCaptureMode: "screen" as CaptureMode,
  recordCountdown: null,
  isRecording: false,
  recordingSeconds: 0,
  captureError: null,
  livePreviewStream: null,

  // Video/playback state
  recordingBlob: null,
  recordingUrl: null,
  videoDuration: 0,
  currentTime: 0,
  isPlaying: false,
  previewThumbnail: null,

  // Export state
  exportedBlob: null,
  exportedUrl: null,
  isExporting: false,
  exportProgress: 0,
  exportStatus: null,

  // Save state
  isSaving: false,
  savedContentUrl: null,
  saveError: null,

  // Media sources
  mediaSources: [],
}

export const useVideoEditorStore = create<VideoEditorState & VideoEditorActions>()(
  temporal(
    immer((set) => ({
      ...initialState,

      // ── Clip actions ──────────────────────────────────
      setClips: (clips: TimelineClip[]) =>
        set((state) => {
          state.clips = clips
        }),

      updateClip: (clipId: string, patch: Partial<TimelineClip>) =>
        set((state) => {
          const index = state.clips.findIndex((c) => c.id === clipId)
          if (index !== -1) {
            Object.assign(state.clips[index], patch)
          }
        }),

      addClip: (clip: TimelineClip) =>
        set((state) => {
          state.clips.push(clip)
        }),

      splitClip: (clipId: string, at: number) =>
        set((state) => {
          const index = state.clips.findIndex((c) => c.id === clipId)
          if (index === -1) return

          const target = state.clips[index]
          const splitAt = clamp(at, target.start + 0.2, target.end - 0.2)
          if (splitAt <= target.start || splitAt >= target.end) return

          const firstId = createId("clip")
          const secondId = createId("clip")
          const colorIndex = CLIP_COLORS.indexOf(target.color)
          const firstColor = target.color
          const secondColor =
            CLIP_COLORS[(colorIndex >= 0 ? colorIndex + 1 : index + 1) % CLIP_COLORS.length]

          const first: TimelineClip = {
            ...target,
            id: firstId,
            name: `${target.name} A`,
            end: Number(splitAt.toFixed(2)),
            color: firstColor,
          }
          const second: TimelineClip = {
            ...target,
            id: secondId,
            name: `${target.name} B`,
            start: Number(splitAt.toFixed(2)),
            color: secondColor,
          }

          state.clips.splice(index, 1, first, second)
          state.selectedClipId = firstId
        }),

      removeClip: (clipId: string) =>
        set((state) => {
          state.clips = state.clips.filter((c) => c.id !== clipId)
          if (state.selectedClipId === clipId) {
            state.selectedClipId = state.clips[0]?.id ?? null
          }
        }),

      duplicateClip: (clipId: string) =>
        set((state) => {
          const index = state.clips.findIndex((c) => c.id === clipId)
          if (index === -1) return

          const source = state.clips[index]
          const newId = createId("clip")
          const duplicate: TimelineClip = {
            ...source,
            id: newId,
            name: `${source.name} (copy)`,
            color: CLIP_COLORS[(index + 1) % CLIP_COLORS.length],
          }
          state.clips.splice(index + 1, 0, duplicate)
          state.selectedClipId = newId
        }),

      reorderClips: (fromIndex: number, toIndex: number) =>
        set((state) => {
          const [removed] = state.clips.splice(fromIndex, 1)
          if (removed) state.clips.splice(toIndex, 0, removed)
        }),

      selectClip: (clipId: string | null) =>
        set((state) => {
          state.selectedClipId = clipId
        }),

      // ── Playback ─────────────────────────────────────
      setCurrentTime: (time: number) =>
        set((state) => {
          state.currentTime = time
        }),

      setVideoDuration: (duration: number) =>
        set((state) => {
          state.videoDuration = duration
        }),

      setIsPlaying: (playing: boolean) =>
        set((state) => {
          state.isPlaying = playing
        }),

      // ── Presets ───────────────────────────────────────
      setSelectedPresetId: (id: string) =>
        set((state) => {
          if (SHOT_PRESETS.some((p) => p.id === id)) {
            state.selectedPresetId = id
          }
        }),

      applyPresetToClip: (clipId: string, presetId: string) =>
        set((state) => {
          const clip = state.clips.find((c) => c.id === clipId)
          if (clip && SHOT_PRESETS.some((p) => p.id === presetId)) {
            clip.presetId = presetId
          }
        }),

      // ── Recording state ──────────────────────────────
      setIsRecording: (recording: boolean) =>
        set((state) => {
          state.isRecording = recording
        }),

      setRecordingSeconds: (seconds: number) =>
        set((state) => {
          state.recordingSeconds = seconds
        }),

      setCaptureError: (error: string | null) =>
        set((state) => {
          state.captureError = error
        }),

      setLivePreviewStream: (stream: MediaStream | null) =>
        set((state) => {
          state.livePreviewStream = stream
        }),

      setSelectedCaptureMode: (mode: CaptureMode) =>
        set((state) => {
          state.selectedCaptureMode = mode
        }),

      setRecordCountdown: (countdown: number | null) =>
        set((state) => {
          state.recordCountdown = countdown
        }),

      // ── Recording result ─────────────────────────────
      setRecordingBlob: (blob: Blob | null) =>
        set((state) => {
          state.recordingBlob = blob
        }),

      setRecordingUrl: (url: string | null) =>
        set((state) => {
          if (state.recordingUrl && state.recordingUrl !== url) {
            const isTrackedMediaSource = state.mediaSources.some((source) => source.url === state.recordingUrl)
            if (!isTrackedMediaSource) {
              URL.revokeObjectURL(state.recordingUrl)
            }
          }
          state.recordingUrl = url
        }),

      setPreviewThumbnail: (thumbnail: string | null) =>
        set((state) => {
          state.previewThumbnail = thumbnail
        }),

      // ── Export state ─────────────────────────────────
      setExportedBlob: (blob: Blob | null) =>
        set((state) => {
          state.exportedBlob = blob
        }),

      setExportedUrl: (url: string | null) =>
        set((state) => {
          if (state.exportedUrl) URL.revokeObjectURL(state.exportedUrl)
          state.exportedUrl = url
        }),

      setIsExporting: (exporting: boolean) =>
        set((state) => {
          state.isExporting = exporting
        }),

      setExportProgress: (progress: number) =>
        set((state) => {
          state.exportProgress = progress
        }),

      setExportStatus: (status: string | null) =>
        set((state) => {
          state.exportStatus = status
        }),

      // ── Save state ──────────────────────────────────
      setIsSaving: (saving: boolean) =>
        set((state) => {
          state.isSaving = saving
        }),

      setSavedContentUrl: (url: string | null) =>
        set((state) => {
          state.savedContentUrl = url
        }),

      setSaveError: (error: string | null) =>
        set((state) => {
          state.saveError = error
        }),

      // ── UI toggles ──────────────────────────────────
      setIsAnimationsCollapsed: (collapsed: boolean) =>
        set((state) => {
          state.isAnimationsCollapsed = collapsed
        }),

      setIsAssistantCollapsed: (collapsed: boolean) =>
        set((state) => {
          state.isAssistantCollapsed = collapsed
        }),

      setPresetSearch: (search: string) =>
        set((state) => {
          state.presetSearch = search
        }),

      setPresetCategory: (category: PresetCategory) =>
        set((state) => {
          state.presetCategory = category
        }),

      setLoopSelectedClip: (loop: boolean) =>
        set((state) => {
          state.loopSelectedClip = loop
        }),

      // ── Keyframe actions ─────────────────────────────
      addKeyframe: (clipId: string, property: AnimatableProperty, time: number, value: number, easing: EasingFunction) =>
        set((state) => {
          const clip = state.clips.find((c) => c.id === clipId)
          if (!clip) return

          if (!clip.animation) {
            clip.animation = { id: createId("anim"), name: "Custom", tracks: [] }
          }

          let track = clip.animation.tracks.find((t) => t.property === property)
          if (!track) {
            track = { property, keyframes: [] }
            clip.animation.tracks.push(track)
          }

          track.keyframes.push({
            id: createId("kf"),
            time,
            value,
            easing,
          })
          track.keyframes.sort((a, b) => a.time - b.time)
        }),

      updateKeyframe: (clipId: string, keyframeId: string, patch) =>
        set((state) => {
          const clip = state.clips.find((c) => c.id === clipId)
          if (!clip?.animation) return

          for (const track of clip.animation.tracks) {
            const kf = track.keyframes.find((k) => k.id === keyframeId)
            if (kf) {
              Object.assign(kf, patch)
              track.keyframes.sort((a, b) => a.time - b.time)
              break
            }
          }
        }),

      removeKeyframe: (clipId: string, keyframeId: string) =>
        set((state) => {
          const clip = state.clips.find((c) => c.id === clipId)
          if (!clip?.animation) return

          for (const track of clip.animation.tracks) {
            const index = track.keyframes.findIndex((k) => k.id === keyframeId)
            if (index !== -1) {
              track.keyframes.splice(index, 1)
              break
            }
          }

          // Clean up empty tracks
          clip.animation.tracks = clip.animation.tracks.filter((t) => t.keyframes.length > 0)
          if (clip.animation.tracks.length === 0) {
            clip.animation = null
          }
        }),

      setClipAnimation: (clipId: string, animation: ClipAnimation | null) =>
        set((state) => {
          const clip = state.clips.find((c) => c.id === clipId)
          if (clip) clip.animation = animation
        }),

      // ── Media sources ────────────────────────────────
      addMediaSource: (source: MediaSource) =>
        set((state) => {
          state.mediaSources.push(source)
        }),

      removeMediaSource: (sourceId: string) =>
        set((state) => {
          const source = state.mediaSources.find((s) => s.id === sourceId)
          if (source) URL.revokeObjectURL(source.url)
          state.mediaSources = state.mediaSources.filter((s) => s.id !== sourceId)
        }),

      // ── Batch actions ────────────────────────────────
      applyActions: (fn: () => void) => {
        const temporal = useVideoEditorStore.temporal.getState()
        temporal.pause()
        fn()
        temporal.resume()
      },

      // ── Reset ────────────────────────────────────────
      resetTimeline: () =>
        set((state) => {
          state.clips = []
          state.selectedClipId = null
          state.currentTime = 0
          state.isPlaying = false
        }),

      resetAll: () =>
        set(() => ({ ...initialState })),
    })),
    {
      // Only track timeline-relevant state for undo/redo
      partialize: (state): TemporalState => ({
        clips: state.clips,
      }),
      equality: (pastState, currentState) => areClipsEqual(pastState.clips, currentState.clips),
      limit: 50,
    }
  )
)
