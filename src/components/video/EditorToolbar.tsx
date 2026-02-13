"use client"

import { useCallback } from "react"
import {
  Camera,
  ChevronDown,
  Loader2,
  Monitor,
  Redo2,
  Sparkles,
  Square,
  Undo2,
  Upload,
  Video,
} from "lucide-react"
import { useStore } from "zustand"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useVideoEditorStore, formatTime } from "@/stores/video-editor"

interface EditorToolbarProps {
  onStartRecording: () => void
  onStartCapture: (mode: string) => void
  onExport: () => void
  onDownloadOriginal: () => void
  onDownloadExport: () => void
  clearCountdownTimer: () => void
}

export function EditorToolbar({
  onStartRecording,
  onStartCapture,
  onExport,
  onDownloadOriginal,
  onDownloadExport,
  clearCountdownTimer,
}: EditorToolbarProps) {
  const isRecording = useVideoEditorStore((s) => s.isRecording)
  const recordCountdown = useVideoEditorStore((s) => s.recordCountdown)
  const recordingSeconds = useVideoEditorStore((s) => s.recordingSeconds)
  const selectedCaptureMode = useVideoEditorStore((s) => s.selectedCaptureMode)
  const captureError = useVideoEditorStore((s) => s.captureError)
  const recordingUrl = useVideoEditorStore((s) => s.recordingUrl)
  const recordingBlob = useVideoEditorStore((s) => s.recordingBlob)
  const clips = useVideoEditorStore((s) => s.clips)
  const exportedBlob = useVideoEditorStore((s) => s.exportedBlob)
  const isExporting = useVideoEditorStore((s) => s.isExporting)
  const exportProgress = useVideoEditorStore((s) => s.exportProgress)
  const exportStatus = useVideoEditorStore((s) => s.exportStatus)
  const store = useVideoEditorStore

  const captureModeLabel = selectedCaptureMode === "tab" ? "Browser tab" : "Entire screen"
  const hasVideo = Boolean(recordingUrl)
  const canExport = hasVideo && clips.length > 0 && !isExporting
  const canUndo = useStore(useVideoEditorStore.temporal, (s) => s.pastStates.length > 0)
  const canRedo = useStore(useVideoEditorStore.temporal, (s) => s.futureStates.length > 0)
  const exportDisabledTitle = !hasVideo
    ? "Record or import a video first."
    : clips.length === 0
      ? "Add at least one clip to export."
      : "Render all timeline edits into a new exported video."

  const handleUndo = useCallback(() => {
    useVideoEditorStore.temporal.getState().undo()
  }, [])

  const handleRedo = useCallback(() => {
    useVideoEditorStore.temporal.getState().redo()
  }, [])

  return (
    <div className="border-b border-border/50 px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={onStartRecording}
          variant={isRecording ? "destructive" : recordCountdown !== null ? "secondary" : "default"}
          className="min-w-36"
        >
          {isRecording ? <Square className="h-4 w-4" /> : <Video className="h-4 w-4" />}
          {isRecording
            ? "Stop Recording"
            : recordCountdown !== null
              ? `Starting in ${recordCountdown}`
              : "Record"}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isRecording || recordCountdown !== null}>
              {`Record Options: ${captureModeLabel}`}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Capture source</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={selectedCaptureMode}
              onValueChange={(value) => store.getState().setSelectedCaptureMode(value as "screen" | "tab")}
            >
              <DropdownMenuRadioItem value="screen">
                <Monitor className="h-4 w-4" />
                Entire screen
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="tab">
                <Camera className="h-4 w-4" />
                Browser tab
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                if (!isRecording && recordCountdown === null) {
                  store.getState().setCaptureError(null)
                  clearCountdownTimer()
                  void onStartCapture(store.getState().selectedCaptureMode)
                }
              }}
            >
              Start immediately
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {isRecording ? (
          <Badge variant="destructive" className="font-mono text-xs">
            REC {formatTime(recordingSeconds)}
          </Badge>
        ) : null}

        <div className="mx-1 h-5 w-px bg-border/70" />

        <span title={exportDisabledTitle}>
          <Button
            onClick={onExport}
            disabled={!canExport}
            variant="default"
            size="sm"
            className="disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Export Edited Video
          </Button>
        </span>

        {recordingBlob ? (
          <Button
            onClick={onDownloadOriginal}
            variant="outline"
            size="sm"
            title="Download the original recording before edits."
          >
            <Upload className="h-4 w-4" />
            Download Original
          </Button>
        ) : null}
        {exportedBlob ? (
          <Button
            onClick={onDownloadExport}
            variant="outline"
            size="sm"
            title="Download the edited file after export completes."
          >
            <Upload className="h-4 w-4" />
            Download Edited Export
          </Button>
        ) : null}

        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            onClick={handleUndo}
            disabled={!canUndo}
            title={canUndo ? "Undo (Cmd+Z)" : "Nothing to undo"}
            className="disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            onClick={handleRedo}
            disabled={!canRedo}
            title={canRedo ? "Redo (Cmd+Shift+Z)" : "Nothing to redo"}
            className="disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {captureError ? (
        <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
          {captureError}
        </p>
      ) : null}
      {isExporting ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Exporting edited video... {exportProgress}%
        </p>
      ) : null}
      {exportStatus ? (
        <p className="mt-1 text-xs text-muted-foreground">{exportStatus}</p>
      ) : null}
    </div>
  )
}
