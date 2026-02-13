import type { ClipAnimation, EasingFunction } from "@/stores/video-editor/types"

interface SmartZoomOptions {
  targetRegion?: { x: number; y: number; width: number; height: number }
  startTime?: number
  endTime?: number
  easing?: EasingFunction
  zoomLevel?: number
}

/**
 * Generate a keyframe animation that zooms and pans to target a specific
 * region of the frame. Used by AI for commands like "zoom into the top-right".
 */
export function generateSmartZoomAnimation(options: SmartZoomOptions): ClipAnimation {
  const {
    targetRegion = { x: 50, y: 50, width: 50, height: 50 },
    startTime = 0,
    endTime = 1,
    easing = "easeInOut",
    zoomLevel = 1.5,
  } = options

  // Calculate pan offset to center the target region
  const centerX = (targetRegion.x + targetRegion.width / 2) / 100
  const centerY = (targetRegion.y + targetRegion.height / 2) / 100
  const panX = (centerX - 0.5) * -0.2
  const panY = (centerY - 0.5) * -0.2

  return {
    id: `smart-zoom-${Date.now()}`,
    name: "Smart Zoom",
    tracks: [
      {
        property: "zoom",
        keyframes: [
          { id: "sz-zoom-0", time: startTime, value: 1, easing: "linear" },
          { id: "sz-zoom-1", time: (startTime + endTime) / 2, value: zoomLevel, easing },
          { id: "sz-zoom-2", time: endTime, value: 1, easing },
        ],
      },
      {
        property: "panX",
        keyframes: [
          { id: "sz-panx-0", time: startTime, value: 0, easing: "linear" },
          { id: "sz-panx-1", time: (startTime + endTime) / 2, value: panX, easing },
          { id: "sz-panx-2", time: endTime, value: 0, easing },
        ],
      },
      {
        property: "panY",
        keyframes: [
          { id: "sz-pany-0", time: startTime, value: 0, easing: "linear" },
          { id: "sz-pany-1", time: (startTime + endTime) / 2, value: panY, easing },
          { id: "sz-pany-2", time: endTime, value: 0, easing },
        ],
      },
    ],
  }
}
