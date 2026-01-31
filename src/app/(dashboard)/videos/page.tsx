'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Video, Play, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function VideosPage() {
  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono mb-2">
          <span>$</span>
          <span className="text-primary">./videos</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Video Library</h1>
            <p className="text-muted-foreground mt-2 text-sm md:text-base">
              All your AI-generated videos in one place
            </p>
          </div>
          <Link href="/brands" className="self-start sm:self-auto">
            <Button variant="terminal" className="w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Create Video
            </Button>
          </Link>
        </div>
      </div>

      {/* Videos Grid Placeholder */}
      <Card className="terminal-border bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-mono text-sm">
            <Video className="h-4 w-4 text-primary" />
            video_library
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
              <Play className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-mono text-lg mb-2">No videos yet</h3>
            <p className="text-muted-foreground text-sm max-w-md">
              Create your first AI-generated video by selecting a brand and using the video creator.
            </p>
            <Link href="/brands" className="mt-4">
              <Button variant="outline" className="font-mono">
                Select a brand to start
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
