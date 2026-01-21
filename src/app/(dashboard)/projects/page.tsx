import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Plus, FolderOpen, Video, Image } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default async function ProjectsPage() {
  const supabase = await createClient()

  const { data: projects } = await supabase
    .from('projects')
    .select(`
      *,
      assets(count),
      video_jobs(count)
    `)
    .order('updated_at', { ascending: false })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
          <p className="text-muted-foreground">
            Manage your video projects and assets
          </p>
        </div>
        <Button asChild>
          <Link href="/projects/new">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Link>
        </Button>
      </div>

      {projects && projects.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const assetCount = (project.assets as { count: number }[])?.[0]?.count || 0
            const videoCount = (project.video_jobs as { count: number }[])?.[0]?.count || 0

            return (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center space-x-2">
                      <FolderOpen className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {project.description || 'No description'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center">
                          <Image className="mr-1 h-4 w-4" />
                          {assetCount} assets
                        </span>
                        <span className="flex items-center">
                          <Video className="mr-1 h-4 w-4" />
                          {videoCount} videos
                        </span>
                      </div>
                      <span>
                        {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderOpen className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first project to start making videos
            </p>
            <Button asChild>
              <Link href="/projects/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Project
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
