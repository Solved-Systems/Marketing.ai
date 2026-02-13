import { z } from "zod"

const setPresetSchema = z.object({
  type: z.literal("set_preset"),
  presetId: z.string(),
})

const trimClipSchema = z.object({
  type: z.literal("trim_clip"),
  clipId: z.string(),
  start: z.number().optional(),
  end: z.number().optional(),
})

const setClipSpeedSchema = z.object({
  type: z.literal("set_clip_speed"),
  clipId: z.string(),
  speed: z.number().min(0.25).max(3),
})

const setClipZoomSchema = z.object({
  type: z.literal("set_clip_zoom"),
  clipId: z.string(),
  zoom: z.number().min(1).max(3),
})

const cropClipSchema = z.object({
  type: z.literal("crop_clip"),
  clipId: z.string(),
  x: z.number().min(0).max(100).optional(),
  y: z.number().min(0).max(100).optional(),
  width: z.number().min(1).max(100).optional(),
  height: z.number().min(1).max(100).optional(),
})

const renameClipSchema = z.object({
  type: z.literal("rename_clip"),
  clipId: z.string(),
  name: z.string(),
})

const splitClipSchema = z.object({
  type: z.literal("split_clip"),
  clipId: z.string(),
  at: z.number(),
})

const addClipSchema = z.object({
  type: z.literal("add_clip"),
  start: z.number().optional(),
  end: z.number().optional(),
  duration: z.number().optional(),
  name: z.string().optional(),
  presetId: z.string().optional(),
  speed: z.number().optional(),
  zoom: z.number().optional(),
})

const removeClipSchema = z.object({
  type: z.literal("remove_clip"),
  clipId: z.string(),
})

const duplicateClipSchema = z.object({
  type: z.literal("duplicate_clip"),
  clipId: z.string(),
})

const reorderClipsSchema = z.object({
  type: z.literal("reorder_clips"),
  fromIndex: z.number().int().min(0),
  toIndex: z.number().int().min(0),
})

const addKeyframeSchema = z.object({
  type: z.literal("add_keyframe"),
  clipId: z.string(),
  property: z.string(),
  time: z.number(),
  value: z.number(),
  easing: z.string().optional(),
})

const removeKeyframeSchema = z.object({
  type: z.literal("remove_keyframe"),
  clipId: z.string(),
  keyframeId: z.string(),
})

const autoCutSchema = z.object({
  type: z.literal("auto_cut"),
  strategy: z.enum(["even", "proportional"]).optional(),
  targetDuration: z.number().optional(),
  clipCount: z.number().int().min(1).optional(),
})

const batchTrimSchema = z.object({
  type: z.literal("batch_trim"),
  trimStart: z.number().optional(),
  trimEnd: z.number().optional(),
})

const applyPresetAllSchema = z.object({
  type: z.literal("apply_preset_all"),
  presetId: z.string(),
})

const toggleLoopSchema = z.object({
  type: z.literal("toggle_loop"),
  value: z.boolean(),
})

const undoSchema = z.object({ type: z.literal("undo") })
const redoSchema = z.object({ type: z.literal("redo") })
const exportVideoSchema = z.object({ type: z.literal("export_video") })

const editorActionSchema = z.discriminatedUnion("type", [
  setPresetSchema,
  trimClipSchema,
  setClipSpeedSchema,
  setClipZoomSchema,
  cropClipSchema,
  renameClipSchema,
  splitClipSchema,
  addClipSchema,
  removeClipSchema,
  duplicateClipSchema,
  reorderClipsSchema,
  addKeyframeSchema,
  removeKeyframeSchema,
  autoCutSchema,
  batchTrimSchema,
  applyPresetAllSchema,
  toggleLoopSchema,
  undoSchema,
  redoSchema,
  exportVideoSchema,
])

export const editorActionsPayload = z.object({
  actions: z.array(editorActionSchema).describe("Array of editor actions to execute sequentially."),
})

export type EditorActionsPayloadSchema = z.infer<typeof editorActionsPayload>
