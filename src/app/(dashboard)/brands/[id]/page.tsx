'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Palette,
  Video,
  Image,
  MessageSquare,
  Package,
  Settings,
  Plus,
  ExternalLink,
  Github,
  GitBranch,
  Tag,
  Trash2,
  Check,
  Loader2,
} from 'lucide-react'

interface ConnectedRepo {
  id: string
  name: string
  fullName: string
  url: string
  events: string[]
  autoGenerate: string[]
  autoPublish: boolean
}

export default function BrandDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [connectedRepos, setConnectedRepos] = useState<ConnectedRepo[]>([])
  const [isConnecting, setIsConnecting] = useState(false)
  const [repoUrl, setRepoUrl] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)

  // TODO: Fetch brand from database
  const brand = {
    id,
    name: 'Sample Brand',
    description: 'A sample brand for demonstration',
    tagline: 'Innovation at your fingertips',
    website_url: 'https://example.com',
    primaryColor: '#ff8c00',
    secondaryColor: '#1a1a1a',
    accentColor: '#ffa500',
    products: [],
    content: [],
  }

  const handleConnectRepo = async () => {
    if (!repoUrl.trim()) return
    setIsConnecting(true)

    // Parse GitHub URL to get owner/repo
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/)
    if (!match) {
      alert('Invalid GitHub URL')
      setIsConnecting(false)
      return
    }

    const [, owner, repo] = match
    const fullName = `${owner}/${repo.replace('.git', '')}`

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))

    const newRepo: ConnectedRepo = {
      id: Date.now().toString(),
      name: repo.replace('.git', ''),
      fullName,
      url: `https://github.com/${fullName}`,
      events: ['releases'],
      autoGenerate: ['video', 'post'],
      autoPublish: false,
    }

    setConnectedRepos(prev => [...prev, newRepo])
    setRepoUrl('')
    setDialogOpen(false)
    setIsConnecting(false)
  }

  const handleRemoveRepo = (repoId: string) => {
    setConnectedRepos(prev => prev.filter(r => r.id !== repoId))
  }

  const toggleEvent = (repoId: string, event: string) => {
    setConnectedRepos(prev =>
      prev.map(r => {
        if (r.id !== repoId) return r
        const events = r.events.includes(event)
          ? r.events.filter(e => e !== event)
          : [...r.events, event]
        return { ...r, events }
      })
    )
  }

  const toggleAutoGenerate = (repoId: string, type: string) => {
    setConnectedRepos(prev =>
      prev.map(r => {
        if (r.id !== repoId) return r
        const autoGenerate = r.autoGenerate.includes(type)
          ? r.autoGenerate.filter(t => t !== type)
          : [...r.autoGenerate, type]
        return { ...r, autoGenerate }
      })
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/brands"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Brands
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: brand.primaryColor }}
            >
              <span className="text-white font-bold text-2xl">
                {brand.name[0].toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-bold">{brand.name}</h1>
              <p className="text-muted-foreground">{brand.tagline}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/brands/${id}/create/video`}>
              <Button variant="outline" size="sm">
                <Video className="h-4 w-4" />
                Video
              </Button>
            </Link>
            <Link href={`/brands/${id}/create/image`}>
              <Button variant="outline" size="sm">
                <Image className="h-4 w-4" />
                Image
              </Button>
            </Link>
            <Link href={`/brands/${id}/create/post`}>
              <Button variant="outline" size="sm">
                <MessageSquare className="h-4 w-4" />
                Post
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="github">
            <Github className="h-4 w-4 mr-1" />
            GitHub
          </TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Brand Info */}
            <Card className="terminal-border bg-card/50">
              <CardHeader>
                <CardTitle className="font-mono text-sm flex items-center gap-2">
                  <Palette className="h-4 w-4 text-primary" />
                  brand_info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground font-mono">description</p>
                  <p className="mt-1">{brand.description}</p>
                </div>
                {brand.website_url && (
                  <div>
                    <p className="text-xs text-muted-foreground font-mono">website</p>
                    <a
                      href={brand.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 text-primary hover:underline inline-flex items-center gap-1"
                    >
                      {brand.website_url}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground font-mono mb-2">colors</p>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded"
                      style={{ backgroundColor: brand.primaryColor }}
                      title={`Primary: ${brand.primaryColor}`}
                    />
                    <div
                      className="w-8 h-8 rounded"
                      style={{ backgroundColor: brand.secondaryColor }}
                      title={`Secondary: ${brand.secondaryColor}`}
                    />
                    <div
                      className="w-8 h-8 rounded"
                      style={{ backgroundColor: brand.accentColor }}
                      title={`Accent: ${brand.accentColor}`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="terminal-border bg-card/50">
              <CardHeader>
                <CardTitle className="font-mono text-sm flex items-center gap-2">
                  <Plus className="h-4 w-4 text-primary" />
                  quick_actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href={`/brands/${id}/create/video`} className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Video className="h-4 w-4 text-primary" />
                    Create AI Video
                    <Badge variant="outline" className="ml-auto text-xs">AI</Badge>
                  </Button>
                </Link>
                <Link href={`/brands/${id}/create/image`} className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Image className="h-4 w-4 text-primary" />
                    Generate Image
                    <Badge variant="outline" className="ml-auto text-xs">AI</Badge>
                  </Button>
                </Link>
                <Link href={`/brands/${id}/create/post`} className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    Write Social Post
                    <Badge variant="outline" className="ml-auto text-xs">AI</Badge>
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="products">
          <Card className="terminal-border bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-mono text-sm flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                products
              </CardTitle>
              <Button variant="terminal" size="sm">
                <Plus className="h-4 w-4" />
                Add Product
              </Button>
            </CardHeader>
            <CardContent>
              {brand.products.length === 0 ? (
                <div className="py-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">No products yet</p>
                  <p className="text-sm text-muted-foreground/70">
                    Add products to generate targeted content
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Product list would go here */}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* GitHub Integration Tab */}
        <TabsContent value="github">
          <Card className="terminal-border bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-mono text-sm flex items-center gap-2">
                <Github className="h-4 w-4 text-primary" />
                github_integration
              </CardTitle>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="terminal" size="sm">
                    <Plus className="h-4 w-4" />
                    Connect Repo
                  </Button>
                </DialogTrigger>
                <DialogContent className="terminal-border bg-card">
                  <DialogHeader>
                    <DialogTitle className="font-mono flex items-center gap-2">
                      <Github className="h-5 w-5 text-primary" />
                      Connect GitHub Repository
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <label className="text-sm font-mono text-muted-foreground">
                        repository_url
                      </label>
                      <Input
                        value={repoUrl}
                        onChange={(e) => setRepoUrl(e.target.value)}
                        placeholder="https://github.com/owner/repo"
                        className="font-mono"
                      />
                      <p className="text-xs text-muted-foreground">
                        Paste the GitHub repository URL
                      </p>
                    </div>
                    <Button
                      onClick={handleConnectRepo}
                      variant="terminal"
                      className="w-full"
                      disabled={isConnecting || !repoUrl.trim()}
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Github className="h-4 w-4" />
                          Connect Repository
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {connectedRepos.length === 0 ? (
                <div className="py-12 text-center">
                  <Github className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">No repositories connected</p>
                  <p className="text-sm text-muted-foreground/70">
                    Connect a GitHub repo to auto-generate content on releases
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {connectedRepos.map((repo) => (
                    <div
                      key={repo.id}
                      className="terminal-border rounded-lg p-4 bg-card/30"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Github className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <a
                              href={repo.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold hover:text-primary flex items-center gap-1"
                            >
                              {repo.fullName}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                            <p className="text-xs text-muted-foreground">
                              Connected to {brand.name}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleRemoveRepo(repo.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Events */}
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground font-mono mb-2">
                            trigger_events
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {['releases', 'push', 'pull_request'].map((event) => (
                              <button
                                key={event}
                                onClick={() => toggleEvent(repo.id, event)}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-xs terminal-border transition-all ${
                                  repo.events.includes(event)
                                    ? 'bg-primary/20 border-primary text-primary'
                                    : 'bg-card/30'
                                }`}
                              >
                                {event === 'releases' && <Tag className="h-3 w-3" />}
                                {event === 'push' && <GitBranch className="h-3 w-3" />}
                                {event === 'pull_request' && <GitBranch className="h-3 w-3" />}
                                {event}
                                {repo.events.includes(event) && (
                                  <Check className="h-3 w-3" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Auto-generate */}
                        <div>
                          <p className="text-xs text-muted-foreground font-mono mb-2">
                            auto_generate
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { type: 'video', icon: Video, label: 'Video' },
                              { type: 'image', icon: Image, label: 'Image' },
                              { type: 'post', icon: MessageSquare, label: 'Post' },
                            ].map(({ type, icon: Icon, label }) => (
                              <button
                                key={type}
                                onClick={() => toggleAutoGenerate(repo.id, type)}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-xs terminal-border transition-all ${
                                  repo.autoGenerate.includes(type)
                                    ? 'bg-primary/20 border-primary text-primary'
                                    : 'bg-card/30'
                                }`}
                              >
                                <Icon className="h-3 w-3" />
                                {label}
                                {repo.autoGenerate.includes(type) && (
                                  <Check className="h-3 w-3" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* How it works */}
          <Card className="terminal-border bg-card/50 mt-6">
            <CardHeader>
              <CardTitle className="font-mono text-sm">how_it_works</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center text-xs text-primary font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-semibold">Connect your repository</p>
                    <p className="text-muted-foreground text-xs">
                      Paste your GitHub repo URL to link it with this brand
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center text-xs text-primary font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-semibold">Choose trigger events</p>
                    <p className="text-muted-foreground text-xs">
                      Select which GitHub events should trigger content generation
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center text-xs text-primary font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-semibold">Auto-generate content</p>
                    <p className="text-muted-foreground text-xs">
                      When events fire, AI creates videos, images, or posts automatically
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content">
          <Card className="terminal-border bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-mono text-sm">content_library</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">All</Button>
                <Button variant="ghost" size="sm">Videos</Button>
                <Button variant="ghost" size="sm">Images</Button>
                <Button variant="ghost" size="sm">Posts</Button>
              </div>
            </CardHeader>
            <CardContent>
              {brand.content.length === 0 ? (
                <div className="py-12 text-center">
                  <Video className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">No content created yet</p>
                  <p className="text-sm text-muted-foreground/70">
                    Use AI to generate videos, images, and posts
                  </p>
                </div>
              ) : (
                <div className="grid md:grid-cols-3 gap-4">
                  {/* Content grid would go here */}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card className="terminal-border bg-card/50">
            <CardHeader>
              <CardTitle className="font-mono text-sm flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" />
                brand_settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Brand settings coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
