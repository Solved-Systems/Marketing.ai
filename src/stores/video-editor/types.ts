export type CaptureMode = "screen" | "tab"
export type PresetCategory = "all" | "subtle" | "medium" | "extreme"

export interface ShotPreset {
  id: string
  title: string
  description: string
  duration: number
  zoom: number
  rotate: number
  panX: number
  panY: number
}

export interface TimelineClip {
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
  animation: ClipAnimation | null
  mediaSourceId?: string
}

export interface ClipAnimation {
  id: string
  name: string
  tracks: KeyframeTrack[]
}

export type AnimatableProperty =
  | "zoom"
  | "rotate"
  | "panX"
  | "panY"
  | "opacity"
  | "cropX"
  | "cropY"
  | "cropWidth"
  | "cropHeight"

export type EasingFunction = "linear" | "easeIn" | "easeOut" | "easeInOut"

export interface Keyframe {
  id: string
  time: number
  value: number
  easing: EasingFunction
}

export interface KeyframeTrack {
  property: AnimatableProperty
  keyframes: Keyframe[]
}

export interface AssistantMessage {
  id: string
  role: "user" | "assistant"
  content: string
}

export interface AssistantQuickAction {
  id: string
  label: string
  prompt: string
  description: string
}

export interface MediaSource {
  id: string
  type: "recording" | "import"
  blob: Blob
  url: string
  duration: number
  width: number
  height: number
  filename?: string
}

export interface EditorSnapshot {
  brandId: string
  brandName: string
  selectedPresetId: string
  selectedClipId: string | null
  loopSelectedClip: boolean
  currentTime: number
  videoDuration: number
  clips: Array<{
    id: string
    name: string
    start: number
    end: number
    presetId: string
    speed: number
    zoom: number
    cropX: number
    cropY: number
    cropWidth: number
    cropHeight: number
    animation: ClipAnimation | null
  }>
}

/** Temporal (undo/redo) tracks only this subset. */
export interface TemporalState {
  clips: TimelineClip[]
}

export interface VideoEditorState extends TemporalState {
  selectedClipId: string | null
  selectedPresetId: string
  loopSelectedClip: boolean

  // UI panel state
  isAnimationsCollapsed: boolean
  isAssistantCollapsed: boolean
  presetSearch: string
  presetCategory: PresetCategory

  // Capture state
  selectedCaptureMode: CaptureMode
  recordCountdown: number | null
  isRecording: boolean
  recordingSeconds: number
  captureError: string | null
  livePreviewStream: MediaStream | null

  // Video/playback state
  recordingBlob: Blob | null
  recordingUrl: string | null
  videoDuration: number
  currentTime: number
  isPlaying: boolean
  previewThumbnail: string | null

  // Export state
  exportedBlob: Blob | null
  exportedUrl: string | null
  isExporting: boolean
  exportProgress: number
  exportStatus: string | null

  // Save state (persisting exported video to database)
  isSaving: boolean
  savedContentUrl: string | null
  saveError: string | null

  // Media sources
  mediaSources: MediaSource[]
}

export interface VideoEditorActions {
  // Clip actions
  setClips: (clips: TimelineClip[]) => void
  updateClip: (clipId: string, patch: Partial<TimelineClip>) => void
  addClip: (clip: TimelineClip) => void
  splitClip: (clipId: string, at: number) => void
  removeClip: (clipId: string) => void
  duplicateClip: (clipId: string) => void
  reorderClips: (fromIndex: number, toIndex: number) => void
  selectClip: (clipId: string | null) => void

  // Playback
  setCurrentTime: (time: number) => void
  setVideoDuration: (duration: number) => void
  setIsPlaying: (playing: boolean) => void

  // Presets
  setSelectedPresetId: (id: string) => void
  applyPresetToClip: (clipId: string, presetId: string) => void

  // Recording state
  setIsRecording: (recording: boolean) => void
  setRecordingSeconds: (seconds: number) => void
  setCaptureError: (error: string | null) => void
  setLivePreviewStream: (stream: MediaStream | null) => void
  setSelectedCaptureMode: (mode: CaptureMode) => void
  setRecordCountdown: (countdown: number | null) => void

  // Recording result
  setRecordingBlob: (blob: Blob | null) => void
  setRecordingUrl: (url: string | null) => void
  setPreviewThumbnail: (thumbnail: string | null) => void

  // Export state
  setExportedBlob: (blob: Blob | null) => void
  setExportedUrl: (url: string | null) => void
  setIsExporting: (exporting: boolean) => void
  setExportProgress: (progress: number) => void
  setExportStatus: (status: string | null) => void

  // Save state
  setIsSaving: (saving: boolean) => void
  setSavedContentUrl: (url: string | null) => void
  setSaveError: (error: string | null) => void

  // UI toggles
  setIsAnimationsCollapsed: (collapsed: boolean) => void
  setIsAssistantCollapsed: (collapsed: boolean) => void
  setPresetSearch: (search: string) => void
  setPresetCategory: (category: PresetCategory) => void
  setLoopSelectedClip: (loop: boolean) => void

  // Keyframe actions
  addKeyframe: (clipId: string, property: AnimatableProperty, time: number, value: number, easing: EasingFunction) => void
  updateKeyframe: (clipId: string, keyframeId: string, patch: Partial<Keyframe>) => void
  removeKeyframe: (clipId: string, keyframeId: string) => void
  setClipAnimation: (clipId: string, animation: ClipAnimation | null) => void

  // Media sources
  addMediaSource: (source: MediaSource) => void
  removeMediaSource: (sourceId: string) => void

  // Batch actions (single undo checkpoint)
  applyActions: (fn: () => void) => void

  // Reset
  resetTimeline: () => void
  resetAll: () => void
}
