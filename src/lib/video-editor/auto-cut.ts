import type { EditorAction } from "./action-types"
import type { TimelineClip } from "@/stores/video-editor"

interface AutoCutOptions {
  strategy: "even" | "proportional"
  targetDuration?: number
  clipCount?: number
}

export function generateAutoCutActions(
  existingClips: TimelineClip[],
  videoDuration: number,
  options: AutoCutOptions
): EditorAction[] {
  if (videoDuration <= 0) return []

  const { strategy, clipCount = 3 } = options
  const actions: EditorAction[] = []

  // Remove existing clips first
  for (const clip of existingClips) {
    actions.push({ type: "remove_clip", clipId: clip.id })
  }

  const count = Math.max(1, Math.min(clipCount, 20))

  if (strategy === "even") {
    const clipDuration = videoDuration / count
    for (let i = 0; i < count; i++) {
      const start = i * clipDuration
      const end = Math.min((i + 1) * clipDuration, videoDuration)
      actions.push({
        type: "add_clip",
        start: Number(start.toFixed(2)),
        end: Number(end.toFixed(2)),
        name: `Scene ${i + 1}`,
        presetId: "none",
      })
    }
  } else if (strategy === "proportional") {
    const target = options.targetDuration ?? videoDuration * 0.7
    const clipTarget = target / count

    for (let i = 0; i < count; i++) {
      const start = (i / count) * videoDuration
      const end = Math.min(start + clipTarget, videoDuration)
      actions.push({
        type: "add_clip",
        start: Number(start.toFixed(2)),
        end: Number(end.toFixed(2)),
        name: `Scene ${i + 1}`,
        presetId: "none",
      })
    }
  }

  return actions
}
