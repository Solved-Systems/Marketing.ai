import { createId, createBaseClip, CLIP_COLORS } from "@/stores/video-editor"
import type { TimelineClip, MediaSource } from "@/stores/video-editor"
import { ACCEPTED_VIDEO_TYPES, MAX_VIDEO_SIZE } from "@/stores/video-editor/constants"

export { ACCEPTED_VIDEO_TYPES, MAX_VIDEO_SIZE }

export interface ImportValidation {
  valid: boolean
  error?: string
}

export function validateVideoFile(file: File): ImportValidation {
  if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
    return { valid: false, error: `Unsupported format: ${file.type}. Use MP4, WebM, MOV, or MKV.` }
  }
  if (file.size > MAX_VIDEO_SIZE) {
    return { valid: false, error: `File too large (${(file.size / 1024 / 1024).toFixed(0)}MB). Max is 500MB.` }
  }
  return { valid: true }
}

/**
 * Import a video file: create a blob URL and probe its dimensions/duration.
 */
export async function importVideoFile(file: File): Promise<MediaSource> {
  const validation = validateVideoFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const blob = new Blob([file], { type: file.type })
  const url = URL.createObjectURL(blob)

  const { duration, width, height } = await probeVideo(url)

  return {
    id: createId("media"),
    type: "import",
    blob,
    url,
    duration,
    width,
    height,
    filename: file.name,
  }
}

/**
 * Probe a video URL for duration and dimensions.
 */
function probeVideo(url: string): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video")
    video.preload = "metadata"
    video.muted = true
    video.playsInline = true

    const cleanup = () => {
      video.removeEventListener("loadedmetadata", onMeta)
      video.removeEventListener("error", onError)
      video.pause()
      video.removeAttribute("src")
      video.load()
    }

    const onMeta = () => {
      const duration = video.duration
      const width = video.videoWidth
      const height = video.videoHeight
      cleanup()

      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error("Could not determine video duration."))
        return
      }

      resolve({ duration, width, height })
    }

    const onError = () => {
      cleanup()
      reject(new Error("Failed to load video file."))
    }

    video.addEventListener("loadedmetadata", onMeta, { once: true })
    video.addEventListener("error", onError, { once: true })
    video.src = url
  })
}

/**
 * Generate initial clips from an imported video.
 */
export function generateClipsFromImport(
  duration: number,
  existingClipCount: number,
  presetId: string
): TimelineClip[] {
  return [
    createBaseClip({
      id: createId("clip"),
      name: `Scene ${existingClipCount + 1}`,
      start: 0,
      end: Number(duration.toFixed(2)),
      presetId,
      color: CLIP_COLORS[existingClipCount % CLIP_COLORS.length],
    }),
  ]
}
