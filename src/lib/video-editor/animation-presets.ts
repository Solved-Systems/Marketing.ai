import type { ClipAnimation, KeyframeTrack, AnimatableProperty } from "@/stores/video-editor/types"
import { SHOT_PRESETS } from "@/stores/video-editor"
import { presetToAnimation } from "./keyframe-engine"

function track(
  property: AnimatableProperty,
  keyframes: Array<[time: number, value: number, easing?: "linear" | "easeIn" | "easeOut" | "easeInOut"]>
): KeyframeTrack {
  return {
    property,
    keyframes: keyframes.map(([time, value, easing], i) => ({
      id: `kf-${property}-${i}`,
      time,
      value,
      easing: easing ?? "easeInOut",
    })),
  }
}

/** Factory: each returns a ClipAnimation for the given duration. */
export const ANIMATION_FACTORIES: Record<string, (duration: number) => ClipAnimation> = {
  // Cinematic slow zoom in
  "cinematic-zoom-in": () => ({
    id: "cinematic-zoom-in",
    name: "Cinematic Zoom In",
    tracks: [
      track("zoom", [[0, 1], [1, 1.3]]),
    ],
  }),

  // Cinematic slow zoom out
  "cinematic-zoom-out": () => ({
    id: "cinematic-zoom-out",
    name: "Cinematic Zoom Out",
    tracks: [
      track("zoom", [[0, 1.3], [1, 1]]),
    ],
  }),

  // Pan left to right
  "pan-left-right": () => ({
    id: "pan-left-right",
    name: "Pan Left to Right",
    tracks: [
      track("panX", [[0, -0.08], [1, 0.08]]),
      track("zoom", [[0, 1.1], [1, 1.1]]),
    ],
  }),

  // Pan right to left
  "pan-right-left": () => ({
    id: "pan-right-left",
    name: "Pan Right to Left",
    tracks: [
      track("panX", [[0, 0.08], [1, -0.08]]),
      track("zoom", [[0, 1.1], [1, 1.1]]),
    ],
  }),

  // Ken Burns diagonal
  "ken-burns-diagonal": () => ({
    id: "ken-burns-diagonal",
    name: "Ken Burns Diagonal",
    tracks: [
      track("zoom", [[0, 1], [1, 1.2]]),
      track("panX", [[0, -0.05], [1, 0.05]]),
      track("panY", [[0, -0.03], [1, 0.03]]),
    ],
  }),

  // Dramatic tilt
  "dramatic-tilt": () => ({
    id: "dramatic-tilt",
    name: "Dramatic Tilt",
    tracks: [
      track("rotate", [[0, 0], [0.5, -3], [1, 0]]),
      track("zoom", [[0, 1.05], [0.5, 1.15], [1, 1.05]]),
    ],
  }),

  // Pulse zoom
  "pulse-zoom": () => ({
    id: "pulse-zoom",
    name: "Pulse Zoom",
    tracks: [
      track("zoom", [[0, 1], [0.25, 1.12], [0.5, 1], [0.75, 1.12], [1, 1]]),
    ],
  }),

  // Fade in
  "fade-in": () => ({
    id: "fade-in",
    name: "Fade In",
    tracks: [
      track("opacity", [[0, 0, "easeIn"], [0.3, 1]]),
    ],
  }),

  // Fade out
  "fade-out": () => ({
    id: "fade-out",
    name: "Fade Out",
    tracks: [
      track("opacity", [[0.7, 1], [1, 0, "easeOut"]]),
    ],
  }),

  // Slow top to bottom
  "slow-tilt-down": () => ({
    id: "slow-tilt-down",
    name: "Slow Tilt Down",
    tracks: [
      track("panY", [[0, -0.06], [1, 0.06]]),
      track("zoom", [[0, 1.08], [1, 1.08]]),
    ],
  }),
}

/**
 * Get a preset library animation by factory name.
 */
export function getAnimationFromFactory(
  factoryId: string,
  duration: number
): ClipAnimation | null {
  const factory = ANIMATION_FACTORIES[factoryId]
  if (!factory) return null
  return factory(duration)
}

/**
 * Get all available animation factory names and labels.
 */
export function getAnimationFactoryList(): Array<{ id: string; name: string }> {
  return Object.entries(ANIMATION_FACTORIES).map(([id, factory]) => {
    const sample = factory(3)
    return { id, name: sample.name }
  })
}

/**
 * Convert a legacy SHOT_PRESETS entry into a keyframe animation.
 */
export function legacyPresetToAnimation(presetId: string, duration: number): ClipAnimation | null {
  const preset = SHOT_PRESETS.find((p) => p.id === presetId)
  if (!preset) return null
  return presetToAnimation(preset, duration)
}
