export type EditorAction =
  | { type: "set_preset"; presetId: string }
  | { type: "trim_clip"; clipId: string; start?: number; end?: number }
  | { type: "set_clip_speed"; clipId: string; speed: number }
  | { type: "set_clip_zoom"; clipId: string; zoom: number }
  | { type: "crop_clip"; clipId: string; x?: number; y?: number; width?: number; height?: number }
  | { type: "rename_clip"; clipId: string; name: string }
  | { type: "split_clip"; clipId: string; at: number }
  | { type: "add_clip"; start?: number; end?: number; duration?: number; name?: string; presetId?: string; speed?: number; zoom?: number }
  | { type: "remove_clip"; clipId: string }
  | { type: "duplicate_clip"; clipId: string }
  | { type: "reorder_clips"; fromIndex: number; toIndex: number }
  | { type: "add_keyframe"; clipId: string; property: string; time: number; value: number; easing?: string }
  | { type: "remove_keyframe"; clipId: string; keyframeId: string }
  | { type: "auto_cut"; strategy?: "even" | "proportional"; targetDuration?: number; clipCount?: number }
  | { type: "batch_trim"; trimStart?: number; trimEnd?: number }
  | { type: "apply_preset_all"; presetId: string }
  | { type: "toggle_loop"; value: boolean }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "export_video" }

export interface EditorActionsPayload {
  actions: EditorAction[]
}

export interface ActionExecutionResult {
  executed: string[]
  skipped: string[]
  errors: string[]
}
