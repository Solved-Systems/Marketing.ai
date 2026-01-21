import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { ArrowLeft, Plus, Video, Image, Settings, Sparkles } from 'lucide-react'
import { AssetUploader } from '@/components/video/asset-uploader'
import { AssetGrid } from '@/components/video/asset-grid'
import { VideoList } from '@/components/video/video-list'
import { CreateVideoDialog } from '@/components/video/create-video-dialog'

interface ProjectPageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (!project) {
    notFound()
  }

  const { data: assets } = await supabase
    .from('assets')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  const { data: videos } = await supabase
    .from('video_jobs')
    .select('*, video_templates(name)')
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  const { data: templates } = await supabase
    .from('video_templates')
    .select('*')
    .or('is_public.eq.true,organization_id.is.null')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/projects">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{project.name}</h2>
            <p className="text-muted-foreground">
              {project.description || 'No description'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <CreateVideoDialog
            projectId={project.id}
            templates={templates || []}
            assets={assets || []}
          />
          <Button variant="outline" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="assets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="assets" className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            Assets ({assets?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="videos" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            Videos ({videos?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI Generate
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Assets</CardTitle>
              <CardDescription>
                Upload images, videos, and other media for your project
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AssetUploader projectId={project.id} />
            </CardContent>
          </Card>

          {assets && assets.length > 0 ? (
            <AssetGrid assets={assets} projectId={project.id} />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Image className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  No assets uploaded yet. Upload some images or videos to get started.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="videos" className="space-y-4">
          {videos && videos.length > 0 ? (
            <VideoList videos={videos} />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Video className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center mb-4">
                  No videos created yet. Create your first video to get started.
                </p>
                <CreateVideoDialog
                  projectId={project.id}
                  templates={templates || []}
                  assets={assets || []}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Video Generation</CardTitle>
              <CardDescription>
                Describe your video and let AI generate it for you
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8">
                <Sparkles className="h-12 w-12 text-primary mb-4" />
                <p className="text-muted-foreground text-center mb-4">
                  AI video generation coming soon! Describe what you want and our AI will create a custom video for you.
                </p>
                <Button disabled>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate with AI
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
