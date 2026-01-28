import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import Link from 'next/link'
import { Video, Play, Download, ExternalLink, Clock, CheckCircle, XCircle, Loader2, FolderOpen } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const statusConfig = {
  pending: { icon: Clock, color: 'bg-yellow-600', label: 'PENDING' },
  queued: { icon: Clock, color: 'bg-blue-600', label: 'QUEUED' },
  rendering: { icon: Loader2, color: 'bg-primary', label: 'RENDERING' },
  completed: { icon: CheckCircle, color: 'bg-green-600', label: 'COMPLETE' },
  failed: { icon: XCircle, color: 'bg-red-600', label: 'FAILED' },
  cancelled: { icon: XCircle, color: 'bg-gray-600', label: 'CANCELLED' },
}

export default async function VideosPage() {
  const supabase = await createClient()

  const { data: videos } = await supabase
    .from('video_jobs')
    .select('*, projects(name), video_templates(name)')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground font-mono mb-2">
            <span className="text-primary">$</span> ls -la ./videos --all
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            <span className="text-primary">{'//'}</span> VIDEOS
          </h2>
          <p className="text-muted-foreground text-sm">
            All generated videos across projects
          </p>
        </div>
      </div>

      {videos && videos.length > 0 ? (
        <div className="space-y-4">
          {videos.map((video) => {
            const status = statusConfig[video.status as keyof typeof statusConfig]
            const StatusIcon = status.icon
            const project = video.projects as { name: string } | null
            const template = video.video_templates as { name: string } | null

            return (
              <Card key={video.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-20 w-32 items-center justify-center rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                      {video.output_url ? (
                        <video
                          src={video.output_url}
                          className="h-full w-full object-cover"
                          muted
                        />
                      ) : (
                        <Play className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">
                          {template?.name || 'Custom Video'}
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

                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <FolderOpen className="h-4 w-4" />
                        <Link
                          href={`/projects/${video.project_id}`}
                          className="hover:underline"
                        >
                          {project?.name || 'Unknown Project'}
                        </Link>
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
                        <Link href={`/videos/${video.id}`}>View</Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Video className="h-16 w-16 text-primary/30 mb-4" />
            <h3 className="text-lg font-mono mb-2">
              <span className="text-primary">$</span> videos: <span className="text-muted-foreground">empty</span>
            </h3>
            <p className="text-muted-foreground text-center mb-4 font-mono text-sm">
              <span className="text-primary">{'//'}</span> Create your first video from a project
            </p>
            <Button variant="terminal" asChild>
              <Link href="/projects">./projects</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
