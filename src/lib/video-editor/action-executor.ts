import type { EditorAction, ActionExecutionResult } from "./action-types"
import { useVideoEditorStore } from "@/stores/video-editor"
import {
  SHOT_PRESETS,
  CLIP_COLORS,
  clamp,
  createId,
  createBaseClip,
} from "@/stores/video-editor"
import type { AnimatableProperty, EasingFunction } from "@/stores/video-editor"
import { generateAutoCutActions } from "./auto-cut"

export function executeActions(
  actions: EditorAction[],
  options?: { exportCallback?: () => void }
): ActionExecutionResult {
  const result: ActionExecutionResult = { executed: [], skipped: [], errors: [] }
  const store = useVideoEditorStore
  const temporal = store.temporal.getState()

  // Batch all actions into a single undo checkpoint
  temporal.pause()

  try {
    for (const action of actions) {
      try {
        const success = executeSingleAction(action, options)
        if (success) {
          result.executed.push(action.type)
        } else {
          result.skipped.push(action.type)
        }
      } catch (err) {
        result.errors.push(`${action.type}: ${err instanceof Error ? err.message : "Unknown error"}`)
      }
    }
  } finally {
    temporal.resume()
  }

  return result
}

function executeSingleAction(
  action: EditorAction,
  options?: { exportCallback?: () => void }
): boolean {
  const store = useVideoEditorStore
  const s = store.getState()

  switch (action.type) {
    case "set_preset": {
      if (!SHOT_PRESETS.some((p) => p.id === action.presetId)) return false
      s.setSelectedPresetId(action.presetId)
      return true
    }

    case "trim_clip": {
      const clip = s.clips.find((c) => c.id === action.clipId)
      if (!clip) return false
      const start = clamp(action.start ?? clip.start, 0, clip.end - 0.2)
      const end = clamp(action.end ?? clip.end, start + 0.2, s.videoDuration || clip.end)
      s.updateClip(action.clipId, {
        start: Number(start.toFixed(2)),
        end: Number(end.toFixed(2)),
      })
      return true
    }

    case "set_clip_speed": {
      const clip = s.clips.find((c) => c.id === action.clipId)
      if (!clip) return false
      s.updateClip(action.clipId, { speed: Number(clamp(action.speed, 0.25, 3).toFixed(2)) })
      return true
    }

    case "set_clip_zoom": {
      const clip = s.clips.find((c) => c.id === action.clipId)
      if (!clip) return false
      s.updateClip(action.clipId, { zoom: Number(clamp(action.zoom, 1, 3).toFixed(2)) })
      return true
    }

    case "crop_clip": {
      const clip = s.clips.find((c) => c.id === action.clipId)
      if (!clip) return false
      const nextX = clamp(action.x ?? clip.cropX, 0, 100)
      const nextY = clamp(action.y ?? clip.cropY, 0, 100)
      const nextW = clamp(action.width ?? clip.cropWidth, 1, 100 - nextX)
      const nextH = clamp(action.height ?? clip.cropHeight, 1, 100 - nextY)
      s.updateClip(action.clipId, {
        cropX: Number(nextX.toFixed(2)),
        cropY: Number(nextY.toFixed(2)),
        cropWidth: Number(nextW.toFixed(2)),
        cropHeight: Number(nextH.toFixed(2)),
      })
      return true
    }

    case "rename_clip": {
      const clip = s.clips.find((c) => c.id === action.clipId)
      if (!clip || !action.name.trim()) return false
      s.updateClip(action.clipId, { name: action.name.trim() })
      return true
    }

    case "split_clip": {
      const clip = s.clips.find((c) => c.id === action.clipId)
      if (!clip) return false
      s.splitClip(action.clipId, action.at)
      return true
    }

    case "add_clip": {
      const vd = s.videoDuration
      if (vd <= 0) return false
      const startCandidate = action.start ?? s.currentTime
      const durCandidate = action.duration ?? 3
      const endCandidate = action.end ?? startCandidate + durCandidate
      const start = clamp(startCandidate, 0, vd - 0.2)
      const end = clamp(endCandidate, start + 0.2, vd)
      const presetId = action.presetId && SHOT_PRESETS.some((p) => p.id === action.presetId)
        ? action.presetId
        : s.selectedPresetId
      const clips = s.clips

      const newClip = {
        ...createBaseClip({
          id: createId("clip"),
          name: action.name ?? `Scene ${clips.length + 1}`,
          start: Number(start.toFixed(2)),
          end: Number(end.toFixed(2)),
          presetId,
          color: CLIP_COLORS[clips.length % CLIP_COLORS.length],
        }),
        speed: Number(clamp(action.speed ?? 1, 0.25, 3).toFixed(2)),
        zoom: Number(clamp(action.zoom ?? 1, 1, 3).toFixed(2)),
      }
      s.addClip(newClip)
      s.selectClip(newClip.id)
      return true
    }

    case "remove_clip": {
      const clip = s.clips.find((c) => c.id === action.clipId)
      if (!clip) return false
      s.removeClip(action.clipId)
      return true
    }

    case "duplicate_clip": {
      const clip = s.clips.find((c) => c.id === action.clipId)
      if (!clip) return false
      s.duplicateClip(action.clipId)
      return true
    }

    case "reorder_clips": {
      if (action.fromIndex < 0 || action.fromIndex >= s.clips.length) return false
      if (action.toIndex < 0 || action.toIndex >= s.clips.length) return false
      s.reorderClips(action.fromIndex, action.toIndex)
      return true
    }

    case "add_keyframe": {
      const clip = s.clips.find((c) => c.id === action.clipId)
      if (!clip) return false
      const validProperties: AnimatableProperty[] = ["zoom", "rotate", "panX", "panY", "opacity", "cropX", "cropY", "cropWidth", "cropHeight"]
      const property = action.property as AnimatableProperty
      if (!validProperties.includes(property)) return false
      const easing = (action.easing as EasingFunction) ?? "linear"
      s.addKeyframe(action.clipId, property, action.time, action.value, easing)
      return true
    }

    case "remove_keyframe": {
      s.removeKeyframe(action.clipId, action.keyframeId)
      return true
    }

    case "auto_cut": {
      const vd = s.videoDuration
      if (vd <= 0) return false
      const autoCutActions = generateAutoCutActions(s.clips, vd, {
        strategy: action.strategy ?? "even",
        targetDuration: action.targetDuration,
        clipCount: action.clipCount ?? 3,
      })
      // Execute generated actions recursively (already inside temporal pause)
      for (const subAction of autoCutActions) {
        executeSingleAction(subAction, options)
      }
      return true
    }

    case "batch_trim": {
      if (s.clips.length === 0) return false
      for (const clip of s.clips) {
        const start = action.trimStart !== undefined
          ? clamp(clip.start + action.trimStart, 0, clip.end - 0.2)
          : clip.start
        const end = action.trimEnd !== undefined
          ? clamp(clip.end - action.trimEnd, start + 0.2, s.videoDuration || clip.end)
          : clip.end
        store.getState().updateClip(clip.id, {
          start: Number(start.toFixed(2)),
          end: Number(end.toFixed(2)),
        })
      }
      return true
    }

    case "apply_preset_all": {
      if (!SHOT_PRESETS.some((p) => p.id === action.presetId)) return false
      for (const clip of s.clips) {
        store.getState().applyPresetToClip(clip.id, action.presetId)
      }
      return true
    }

    case "toggle_loop": {
      s.setLoopSelectedClip(action.value)
      return true
    }

    case "undo": {
      store.temporal.getState().undo()
      return true
    }

    case "redo": {
      store.temporal.getState().redo()
      return true
    }

    case "export_video": {
      options?.exportCallback?.()
      return true
    }

    default:
      return false
  }
}
