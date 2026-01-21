'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Play, Download, ExternalLink, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { Tables } from '@/lib/database.types'

interface VideoListProps {
  videos: (Tables<'video_jobs'> & { video_templates: { name: string } | null })[]
}

const statusConfig = {
  pending: { icon: Clock, color: 'bg-yellow-500', label: 'Pending' },
  queued: { icon: Clock, color: 'bg-blue-500', label: 'Queued' },
  rendering: { icon: Loader2, color: 'bg-purple-500', label: 'Rendering' },
  completed: { icon: CheckCircle, color: 'bg-green-500', label: 'Completed' },
  failed: { icon: XCircle, color: 'bg-red-500', label: 'Failed' },
  cancelled: { icon: XCircle, color: 'bg-gray-500', label: 'Cancelled' },
}

export function VideoList({ videos }: VideoListProps) {
  return (
    <div className="space-y-4">
      {videos.map((video) => {
        const status = statusConfig[video.status]
        const StatusIcon = status.icon

        return (
          <Card key={video.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-24 items-center justify-center rounded bg-muted flex-shrink-0">
                  {video.output_url ? (
                    <video
                      src={video.output_url}
                      className="h-full w-full object-cover rounded"
                      muted
                    />
                  ) : (
                    <Play className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium truncate">
                      {video.video_templates?.name || 'Custom Video'}
                    </h4>
                    <Badge
                      variant="outline"
                      className={`${status.color} text-white border-0`}
                    >
                      <StatusIcon
                        className={`h-3 w-3 mr-1 ${
                          video.status === 'rendering' ? 'animate-spin' : ''
                        }`}
                      />
                      {status.label}
                    </Badge>
                  </div>

                  {video.status === 'rendering' && (
                    <div className="mb-2">
                      <Progress value={Number(video.progress)} className="h-1" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {video.progress}% complete
                      </p>
                    </div>
                  )}

                  {video.error_message && (
                    <p className="text-xs text-destructive truncate">
                      {video.error_message}
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Created {formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {video.output_url && (
                    <>
                      <Button variant="outline" size="sm" asChild>
                        <a href={video.output_url} download>
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <a href={video.output_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </>
                  )}
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/videos/${video.id}`}>View Details</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
