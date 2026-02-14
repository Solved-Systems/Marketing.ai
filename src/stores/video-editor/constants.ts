import type { ShotPreset, AssistantQuickAction, PresetCategory } from "./types"

export const SHOT_PRESETS: ShotPreset[] = [
  { id: "none", title: "None", description: "No transform applied", duration: 3, zoom: 1, rotate: 0, panX: 0, panY: 0 },
  { id: "close-up-1", title: "Close up 1", description: "Subtle close-up on top", duration: 3, zoom: 1.08, rotate: 0.2, panX: 0, panY: -0.04 },
  { id: "close-up-2", title: "Close up 2", description: "Tilted close-up on side", duration: 3, zoom: 1.13, rotate: -3.2, panX: -0.03, panY: 0 },
  { id: "close-up-3", title: "Close up 3", description: "Subtle motion at corner", duration: 3, zoom: 1.11, rotate: 1.2, panX: 0.04, panY: -0.02 },
  { id: "close-up-4", title: "Close up 4", description: "Very subtle motion at center", duration: 2, zoom: 1.05, rotate: 0, panX: 0, panY: 0 },
  { id: "close-up-5", title: "Close up 5", description: "Top to bottom at center", duration: 4, zoom: 1.06, rotate: 0, panX: 0, panY: 0.06 },
  { id: "close-up-6", title: "Close up 6", description: "Extreme tilt close-up on top", duration: 8, zoom: 1.22, rotate: -8, panX: 0, panY: -0.08 },
  { id: "close-up-7", title: "Close up 7", description: "Zoomed-in close-up on a side", duration: 3, zoom: 1.26, rotate: 0, panX: 0.1, panY: 0 },
  { id: "close-up-8", title: "Close up 8", description: "Extreme top to bottom tilt", duration: 8, zoom: 1.2, rotate: -6, panX: 0, panY: 0.08 },
  { id: "close-up-9", title: "Close up 9", description: "Extreme tilt close-up on bottom", duration: 8, zoom: 1.2, rotate: 7, panX: 0, panY: 0.09 },
  { id: "close-up-10", title: "Close up 10", description: "Subtle rotation at center", duration: 4, zoom: 1.1, rotate: 2.5, panX: 0, panY: 0 },
  { id: "close-up-11", title: "Close up 11", description: "Very subtle motion at center", duration: 3, zoom: 1.07, rotate: -1, panX: 0, panY: 0 },
  { id: "close-up-12", title: "Close up 12", description: "Subtle rotation around center", duration: 2, zoom: 1.08, rotate: 1.5, panX: 0, panY: 0 },
  { id: "close-up-13", title: "Close up 13", description: "Top to bottom at a side", duration: 2, zoom: 1.12, rotate: 0, panX: 0.08, panY: 0.07 },
  { id: "close-up-14", title: "Close up 14", description: "Extreme tilt at a side", duration: 2.5, zoom: 1.22, rotate: 9, panX: 0.09, panY: 0 },
  { id: "close-up-15", title: "Close up 15", description: "Diagonal close-up sweep", duration: 3, zoom: 1.18, rotate: -10, panX: -0.06, panY: 0.04 },
]

export const CLIP_COLORS = ["#3ABFF8", "#8B5CF6", "#F97316", "#22C55E", "#EAB308", "#EC4899", "#6366F1"]

export const PRESET_CATEGORIES: { value: PresetCategory; label: string }[] = [
  { value: "all", label: "All" },
  { value: "subtle", label: "Subtle" },
  { value: "medium", label: "Medium" },
  { value: "extreme", label: "Extreme" },
]

export const ASSISTANT_QUICK_ACTIONS: AssistantQuickAction[] = [
  {
    id: "tighten",
    label: "Tighten",
    prompt: "Tighten pacing and create 3 clips of 3 to 4 seconds each.",
    description: "Shortens slower sections and keeps rhythm tight.",
  },
  {
    id: "preset-pass",
    label: "Preset pass",
    prompt: "Apply subtle close-up presets across the existing clips.",
    description: "Applies balanced close-up motion across current clips.",
  },
  {
    id: "speed-export",
    label: "Speed + export",
    prompt: "Speed up quiet parts to 1.35x, add gentle zoom, and export.",
    description: "Accelerates low-energy sections and prepares an export.",
  },
]

export const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-matroska"]
export const MAX_VIDEO_SIZE = 500 * 1024 * 1024 // 500MB
