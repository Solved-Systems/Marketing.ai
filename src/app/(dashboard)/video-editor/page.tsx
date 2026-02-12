'use client'

import { Video } from 'lucide-react'
import { VideoStudioTab } from '@/components/video/VideoStudioTab'

export default function VideoEditorPage() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] min-h-0 flex-col lg:h-screen">
      <div className="border-b border-border/70 px-4 py-3 md:px-6">
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4 text-primary" />
          <h1 className="text-lg font-semibold tracking-tight">Video Studio</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Record your screen or another Chrome tab, then trim, crop, speed up, zoom, and export.
        </p>
      </div>

      <VideoStudioTab brandName="Workspace" />
    </div>
  )
}
