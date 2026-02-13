import type { Keyframe, KeyframeTrack, ClipAnimation, AnimatableProperty, EasingFunction } from "@/stores/video-editor/types"

/** Easing functions mapping normalized t [0,1] -> [0,1] */
const EASING: Record<EasingFunction, (t: number) => number> = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => t * (2 - t),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
}

/**
 * Binary search for the two keyframes that bracket the given time.
 * Returns the index of the keyframe just before (or at) `time`.
 */
function findKeyframeIndex(keyframes: Keyframe[], time: number): number {
  let lo = 0
  let hi = keyframes.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >>> 1
    if (keyframes[mid].time <= time) {
      lo = mid
    } else {
      hi = mid - 1
    }
  }
  return lo
}

/**
 * Interpolate a single property at a given normalized time (0–1 within clip duration).
 */
export function interpolateProperty(
  track: KeyframeTrack,
  normalizedTime: number
): number {
  const { keyframes } = track
  if (keyframes.length === 0) return 0
  if (keyframes.length === 1) return keyframes[0].value

  // Clamp to track boundaries
  if (normalizedTime <= keyframes[0].time) return keyframes[0].value
  if (normalizedTime >= keyframes[keyframes.length - 1].time) {
    return keyframes[keyframes.length - 1].value
  }

  const i = findKeyframeIndex(keyframes, normalizedTime)
  const a = keyframes[i]
  const b = keyframes[i + 1]
  if (!b) return a.value

  const segmentDuration = b.time - a.time
  if (segmentDuration <= 0) return a.value

  const localT = (normalizedTime - a.time) / segmentDuration
  const easedT = EASING[b.easing](localT)

  return a.value + (b.value - a.value) * easedT
}

export interface AnimationValues {
  zoom: number
  rotate: number
  panX: number
  panY: number
  opacity: number
  cropX: number
  cropY: number
  cropWidth: number
  cropHeight: number
}

const DEFAULT_VALUES: AnimationValues = {
  zoom: 1,
  rotate: 0,
  panX: 0,
  panY: 0,
  opacity: 1,
  cropX: 0,
  cropY: 0,
  cropWidth: 100,
  cropHeight: 100,
}

/**
 * Evaluate all animated properties at a given time within a clip.
 * `time` is seconds from clip start. `duration` is clip duration in seconds.
 */
export function evaluateAnimation(
  animation: ClipAnimation,
  time: number,
  duration: number
): AnimationValues {
  const normalizedTime = duration > 0 ? time / duration : 0
  const values = { ...DEFAULT_VALUES }

  for (const track of animation.tracks) {
    const value = interpolateProperty(track, normalizedTime)
    values[track.property] = value
  }

  return values
}

/**
 * Convert a legacy static preset into a simple keyframe animation.
 * Creates a two-keyframe (start->end) animation that mimics the static preset's values.
 */
export function presetToAnimation(
  preset: { zoom: number; rotate: number; panX: number; panY: number },
  duration: number
): ClipAnimation {
  const createTrack = (property: AnimatableProperty, startVal: number, endVal: number): KeyframeTrack => ({
    property,
    keyframes: [
      { id: `kf-${property}-0`, time: 0, value: startVal, easing: "linear" },
      { id: `kf-${property}-1`, time: 1, value: endVal, easing: "easeInOut" },
    ],
  })

  const tracks: KeyframeTrack[] = []

  if (preset.zoom !== 1) {
    tracks.push(createTrack("zoom", 1, preset.zoom))
  }
  if (preset.rotate !== 0) {
    tracks.push(createTrack("rotate", 0, preset.rotate))
  }
  if (preset.panX !== 0) {
    tracks.push(createTrack("panX", 0, preset.panX))
  }
  if (preset.panY !== 0) {
    tracks.push(createTrack("panY", 0, preset.panY))
  }

  return {
    id: `anim-preset-${Date.now()}`,
    name: "From Preset",
    tracks,
  }
}
