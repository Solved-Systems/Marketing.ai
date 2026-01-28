import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Github, GitBranch, Video, FileText, Clock, CheckCircle, ArrowLeft, Settings, Trash2, Plus } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { GitHubConnect } from '@/components/integrations/github-connect'
import { RepoWatcher } from '@/components/integrations/repo-watcher'

export default async function GitHubIntegrationPage() {
  const supabase = await createClient()

  // Get GitHub connections
  const { data: connections } = await supabase
    .from('github_connections')
    .select('*')
    .eq('is_active', true)

  const connection = connections?.[0]

  // Get watched repositories if connected
  let watchedRepos = null
  let recentEvents = null
  let brands = null

  if (connection) {
    const { data: repos } = await supabase
      .from('watched_repositories')
      .select(`
        *,
        brands(id, name, logo_url),
        products(id, name)
      `)
      .eq('github_connection_id', connection.id)
      .eq('is_active', true)

    watchedRepos = repos

    // Get recent GitHub events
    const { data: events } = await supabase
      .from('github_events')
      .select(`
        *,
        watched_repositories(repo_full_name),
        video_jobs(status, output_url)
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    recentEvents = events

    // Get brands for repo configuration
    const { data: brandData } = await supabase
      .from('brands')
      .select('id, name')
      .order('name')

    brands = brandData
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/integrations">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="text-sm text-muted-foreground font-mono mb-1">
              <span className="text-primary">$</span> configure ./integrations/github
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              <span className="text-primary">{'//'}</span> GITHUB
            </h2>
            <p className="text-muted-foreground text-sm">
              Connect GitHub to auto-generate content from repository events
            </p>
          </div>
        </div>
        <Github className="h-10 w-10 text-primary" />
      </div>

      {!connection ? (
        <GitHubConnect />
      ) : (
        <div className="space-y-6">
          {/* Connection Status */}
          <Card className="border-green-500/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {connection.account_avatar_url && (
                    <img
                      src={connection.account_avatar_url}
                      alt={connection.account_login}
                      className="h-10 w-10 rounded-full"
                    />
                  )}
                  <div>
                    <CardTitle className="font-mono text-sm flex items-center">
                      <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                      Connected as @{connection.account_login}
                    </CardTitle>
                    <CardDescription>
                      {connection.account_type === 'organization' ? 'Organization' : 'User'} account
                    </CardDescription>
                  </div>
                </div>
                <Badge className="bg-green-500/20 text-green-500">Active</Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Watched Repositories */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-mono text-sm flex items-center">
                    <GitBranch className="mr-2 h-4 w-4" />
                    WATCHED_REPOSITORIES
                  </CardTitle>
                  <CardDescription>
                    <span className="text-primary">{'//'}</span> Repositories generating content automatically
                  </CardDescription>
                </div>
                <RepoWatcher connectionId={connection.id} brands={brands || []} />
              </div>
            </CardHeader>
            <CardContent>
              {watchedRepos && watchedRepos.length > 0 ? (
                <div className="space-y-4">
                  {watchedRepos.map((repo) => {
                    const watchConfig = repo.watch_config as { events?: string[]; auto_generate?: string[]; auto_publish?: boolean } | null
                    const brand = repo.brands as { id: string; name: string; logo_url: string | null } | null
                    const product = repo.products as { id: string; name: string } | null

                    return (
                      <div key={repo.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <Github className="h-8 w-8 text-muted-foreground" />
                          <div>
                            <p className="font-mono text-sm">{repo.repo_full_name}</p>
                            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                              {brand && (
                                <span className="text-primary">Brand: {brand.name}</span>
                              )}
                              {product && (
                                <span>Product: {product.name}</span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              {watchConfig?.events?.map((event) => (
                                <Badge key={event} variant="outline" className="text-xs">
                                  {event}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {watchConfig?.auto_generate?.includes('video') && (
                            <Badge className="bg-primary/20 text-primary">
                              <Video className="mr-1 h-3 w-3" />
                              Video
                            </Badge>
                          )}
                          {watchConfig?.auto_generate?.includes('post') && (
                            <Badge className="bg-primary/20 text-primary">
                              <FileText className="mr-1 h-3 w-3" />
                              Post
                            </Badge>
                          )}
                          {watchConfig?.auto_publish && (
                            <Badge className="bg-green-500/20 text-green-500">
                              Auto-publish
                            </Badge>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <GitBranch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    No repositories being watched yet
                  </p>
                  <RepoWatcher connectionId={connection.id} brands={brands || []} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-sm flex items-center">
                <Clock className="mr-2 h-4 w-4" />
                RECENT_ACTIVITY
              </CardTitle>
              <CardDescription>
                <span className="text-primary">{'//'}</span> Recent GitHub events and generated content
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentEvents && recentEvents.length > 0 ? (
                <div className="space-y-3">
                  {recentEvents.map((event) => {
                    const repo = event.watched_repositories as { repo_full_name: string } | null
                    const videoJob = event.video_jobs as { status: string; output_url: string | null } | null

                    return (
                      <div key={event.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full ${event.processed ? 'bg-green-500' : 'bg-yellow-500'}`} />
                          <div>
                            <p className="font-mono text-xs">{event.event_type}</p>
                            <p className="text-xs text-muted-foreground">
                              {repo?.repo_full_name}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {videoJob && (
                            <Badge variant="outline" className="text-xs">
                              {videoJob.status}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent activity
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
