import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Video, FolderOpen, Play, Upload, Plus } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Fetch stats
  const { count: projectCount } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })

  const { count: videoCount } = await supabase
    .from('video_jobs')
    .select('*', { count: 'exact', head: true })

  const { data: recentVideos } = await supabase
    .from('video_jobs')
    .select('*, projects(name)')
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: recentProjects } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground font-mono mb-2">
            <span className="text-primary">$</span> cat /sys/status
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            <span className="text-primary">{'//'}</span> DASHBOARD
          </h2>
          <p className="text-muted-foreground text-sm">
            System overview and recent activity
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="terminal" asChild>
            <Link href="/projects/new">
              <Plus className="mr-2 h-4 w-4" />
              NEW_PROJECT
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-mono">PROJECTS</CardTitle>
            <FolderOpen className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{projectCount || 0}</div>
            <p className="text-xs text-muted-foreground font-mono">
              <span className="text-primary">{'>'}</span> active
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-mono">VIDEOS</CardTitle>
            <Video className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{videoCount || 0}</div>
            <p className="text-xs text-muted-foreground font-mono">
              <span className="text-primary">{'>'}</span> generated
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-mono">RENDERING</CardTitle>
            <Play className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">0</div>
            <p className="text-xs text-muted-foreground font-mono">
              <span className="text-primary">{'>'}</span> in_progress
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-mono">STORAGE</CardTitle>
            <Upload className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">0 MB</div>
            <p className="text-xs text-muted-foreground font-mono">
              <span className="text-primary">{'>'}</span> 5 GB limit
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Projects */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-mono"><span className="text-primary">$</span> ls ./projects --recent</CardTitle>
            <CardDescription>Latest video projects</CardDescription>
          </CardHeader>
          <CardContent>
            {recentProjects && recentProjects.length > 0 ? (
              <div className="space-y-4">
                {recentProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="flex items-center space-x-4 rounded-md border p-4 hover:bg-accent transition-colors"
                  >
                    <FolderOpen className="h-8 w-8 text-primary" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {project.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {project.description || 'No description'}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No projects yet</p>
                <Button asChild>
                  <Link href="/projects/new">Create Your First Project</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Videos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-mono"><span className="text-primary">$</span> ls ./videos --recent</CardTitle>
            <CardDescription>Latest video renders</CardDescription>
          </CardHeader>
          <CardContent>
            {recentVideos && recentVideos.length > 0 ? (
              <div className="space-y-4">
                {recentVideos.map((video) => (
                  <Link
                    key={video.id}
                    href={`/videos/${video.id}`}
                    className="flex items-center space-x-4 rounded-md border p-4 hover:bg-accent transition-colors"
                  >
                    <div className="flex h-12 w-16 items-center justify-center rounded bg-muted">
                      <Play className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {(video.projects as { name: string } | null)?.name || 'Untitled'}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {video.status}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Video className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No videos yet</p>
                <Button variant="outline" asChild>
                  <Link href="/projects">Go to Projects</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
