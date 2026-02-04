'use client'

import { use, useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  Plus,
  ExternalLink,
  Github,
  GitMerge,
  GitCommit,
  Tag,
  Loader2,
  X,
} from 'lucide-react'

interface BrandMetadata {
  availableLogos?: { path: string; downloadUrl: string }[]
  fontFiles?: { path: string; downloadUrl: string; name: string }[]
  detectedFonts?: string[]
  aiAnalysis?: {
    fonts?: { primary?: string; secondary?: string; mono?: string }
    allColors?: Record<string, string>
    sources?: Record<string, string>
    summary?: string
  } | null
}

interface Brand {
  id: string
  name: string
  description: string | null
  tagline: string | null
  website_url: string | null
  logo_url: string | null
  primary_color: string
  secondary_color: string
  accent_color: string
  github_repo: string | null
  metadata: BrandMetadata | null
  created_at: string
  updated_at: string
}

interface MergedPR {
  id: number
  number: number
  title: string
  mergedAt: string
  url: string
  author: string
  authorAvatar: string
  sourceBranch: string
  targetBranch: string
}

interface RecentCommit {
  sha: string
  message: string
  date: string
  url: string
  author: string
  authorAvatar?: string
}

interface GitHubActivity {
  mergedPRs: MergedPR[]
  recentCommits: RecentCommit[]
}

interface GitHubRepo {
  id: number
  name: string
  fullName: string
  url: string
  description: string | null
  private: boolean
}

export default function BrandDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [brand, setBrand] = useState<Brand | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // GitHub state
  const [githubActivity, setGithubActivity] = useState<GitHubActivity | null>(null)
  const [isLoadingActivity, setIsLoadingActivity] = useState(false)
  const [repoDialogOpen, setRepoDialogOpen] = useState(false)
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [isLoadingRepos, setIsLoadingRepos] = useState(false)
  const [repoSearch, setRepoSearch] = useState('')

  // Logo state
  const [availableLogos, setAvailableLogos] = useState<{ path: string; downloadUrl: string }[]>([])
  const [isLoadingLogos, setIsLoadingLogos] = useState(false)


  // Fetch brand data
  useEffect(() => {
    async function fetchBrand() {
      try {
        const response = await fetch(`/api/brands/${id}`)
        if (!response.ok) {
          if (response.status === 404) {
            setError('Brand not found')
          } else {
            throw new Error('Failed to fetch brand')
          }
          return
        }
        const data = await response.json()
        setBrand(data)
      } catch (err) {
        console.error('Error fetching brand:', err)
        setError('Failed to load brand')
      } finally {
        setIsLoading(false)
      }
    }
    fetchBrand()
  }, [id])

  // Fetch GitHub activity when brand has a connected repo
  useEffect(() => {
    if (!brand?.github_repo) return

    async function fetchActivity() {
      setIsLoadingActivity(true)
      try {
        const response = await fetch(`/api/github/activity?repo=${encodeURIComponent(brand!.github_repo!)}`)
        if (response.ok) {
          const data = await response.json()
          setGithubActivity(data)
        }
      } catch (err) {
        console.error('Error fetching GitHub activity:', err)
      } finally {
        setIsLoadingActivity(false)
      }
    }
    fetchActivity()
  }, [brand?.github_repo])

  const fetchRepos = async () => {
    setIsLoadingRepos(true)
    try {
      const response = await fetch('/api/github/repos')
      if (response.ok) {
        const data = await response.json()
        setRepos(data)
      }
    } catch (err) {
      console.error('Error fetching repos:', err)
    } finally {
      setIsLoadingRepos(false)
    }
  }

  const fetchLogosFromRepo = async () => {
    if (!brand?.github_repo) return
    setIsLoadingLogos(true)
    try {
      const response = await fetch(`/api/github/repo-info?repo=${encodeURIComponent(brand.github_repo)}`)
      if (response.ok) {
        const data = await response.json()
        if (data.logos && data.logos.length > 0) {
          setAvailableLogos(data.logos)
        }
      }
    } catch (err) {
      console.error('Error fetching logos:', err)
    } finally {
      setIsLoadingLogos(false)
    }
  }

  const handleConnectRepo = async (repo: GitHubRepo) => {
    setRepoDialogOpen(false)
    setIsSaving(true)
    try {
      const response = await fetch(`/api/brands/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ github_repo: repo.fullName }),
      })
      if (response.ok) {
        const updated = await response.json()
        setBrand(updated)
      }
    } catch (err) {
      console.error('Error connecting repo:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDisconnectRepo = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/brands/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ github_repo: null }),
      })
      if (response.ok) {
        const updated = await response.json()
        setBrand(updated)
        setGithubActivity(null)
      }
    } catch (err) {
      console.error('Error disconnecting repo:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const filteredRepos = repos.filter(repo =>
    repo.fullName.toLowerCase().includes(repoSearch.toLowerCase())
  )

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'today'
    if (diffDays === 1) return 'yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return formatDate(dateStr)
  }

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !brand) {
    return (
      <div className="p-4 md:p-8">
        <Link
          href="/brands"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Brands
        </Link>
        <Card className="terminal-border bg-card/50">
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">{error || 'Brand not found'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <Link
          href="/brands"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Brands
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-3 md:gap-4">
            {brand.logo_url ? (
              <img
                src={brand.logo_url}
                alt={brand.name}
                className="w-12 h-12 md:w-16 md:h-16 rounded-lg object-contain bg-muted flex-shrink-0"
              />
            ) : (
              <div
                className="w-12 h-12 md:w-16 md:h-16 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: brand.primary_color }}
              >
                <span className="text-white font-bold text-xl md:text-2xl">
                  {brand.name[0].toUpperCase()}
                </span>
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-xl md:text-3xl font-bold truncate">{brand.name}</h1>
              <p className="text-muted-foreground text-sm md:text-base truncate">{brand.tagline}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Link href={`/brands/${id}/create/video`}>
              <Button variant="outline" size="sm">
                <Video className="h-4 w-4" />
                <span className="hidden sm:inline">Video</span>
              </Button>
            </Link>
            <Link href={`/brands/${id}/create/image`}>
              <Button variant="outline" size="sm">
                <Image className="h-4 w-4" />
                <span className="hidden sm:inline">Image</span>
              </Button>
            </Link>
            <Link href={`/brands/${id}/create/post`}>
              <Button variant="outline" size="sm">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Post</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4 md:space-y-6">
        <TabsList className="bg-muted/50 w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="github" className="text-xs sm:text-sm">
            <Github className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">GitHub</span>
          </TabsTrigger>
          <TabsTrigger value="content" className="text-xs sm:text-sm">Content</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="space-y-6">
            {/* Brand Info & Logo Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
              {/* Brand Info */}
              <Card className="terminal-border bg-card/50 lg:col-span-2">
                <CardHeader>
                  <CardTitle className="font-mono text-sm flex items-center gap-2">
                    <Palette className="h-4 w-4 text-primary" />
                    brand_info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground font-mono">description</p>
                    <p className="mt-1">{brand.description || 'No description'}</p>
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
                  {brand.github_repo && (
                    <div>
                      <p className="text-xs text-muted-foreground font-mono">github</p>
                      <a
                        href={`https://github.com/${brand.github_repo}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 text-primary hover:underline inline-flex items-center gap-1"
                      >
                        <Github className="h-3 w-3" />
                        {brand.github_repo}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground font-mono mb-2">colors</p>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center gap-1">
                        <div
                          className="w-10 h-10 rounded-lg border border-border"
                          style={{ backgroundColor: brand.primary_color }}
                        />
                        <span className="text-xs font-mono text-muted-foreground">{brand.primary_color}</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div
                          className="w-10 h-10 rounded-lg border border-border"
                          style={{ backgroundColor: brand.secondary_color }}
                        />
                        <span className="text-xs font-mono text-muted-foreground">{brand.secondary_color}</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div
                          className="w-10 h-10 rounded-lg border border-border"
                          style={{ backgroundColor: brand.accent_color }}
                        />
                        <span className="text-xs font-mono text-muted-foreground">{brand.accent_color}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Logo Selector */}
              <Card className="terminal-border bg-card/50">
                <CardHeader>
                  <CardTitle className="font-mono text-sm flex items-center gap-2">
                    <Image className="h-4 w-4 text-primary" />
                    logo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Current Logo */}
                  <div className="flex justify-center">
                    <div
                      className="w-24 h-24 rounded-xl border-2 border-primary/30 flex items-center justify-center overflow-hidden"
                      style={{ backgroundColor: brand.secondary_color || '#1a1a1a' }}
                    >
                      {brand.logo_url ? (
                        <img
                          src={brand.logo_url}
                          alt={brand.name}
                          className="w-full h-full object-contain p-2"
                        />
                      ) : (
                        <span
                          className="text-3xl font-bold"
                          style={{ color: brand.primary_color }}
                        >
                          {brand.name[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Available Logos */}
                  {availableLogos.length > 0 ? (
                    <div>
                      <p className="text-xs text-muted-foreground font-mono mb-2">available ({availableLogos.length})</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {availableLogos.map((logo) => (
                          <button
                            key={logo.path}
                            type="button"
                            onClick={async () => {
                              // Auto-save logo selection
                              try {
                                const response = await fetch(`/api/brands/${id}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ logo_url: logo.downloadUrl }),
                                })
                                if (response.ok) {
                                  const updated = await response.json()
                                  setBrand(updated)
                                }
                              } catch (err) {
                                console.error('Error saving logo:', err)
                              }
                            }}
                            className={`p-1 rounded border-2 transition-all ${
                              brand.logo_url === logo.downloadUrl
                                ? 'border-primary ring-2 ring-primary/20'
                                : 'border-border hover:border-primary/50'
                            }`}
                            title={logo.path}
                          >
                            <img
                              src={logo.downloadUrl}
                              alt={logo.path}
                              className="w-12 h-12 object-contain bg-white/10 rounded"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : brand.github_repo ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={fetchLogosFromRepo}
                      disabled={isLoadingLogos}
                    >
                      {isLoadingLogos ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Github className="h-4 w-4" />
                      )}
                      Load from GitHub
                    </Button>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center">
                      Connect GitHub to load logos
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Fonts & Assets Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {/* Fonts */}
              <Card className="terminal-border bg-card/50">
                <CardHeader>
                  <CardTitle className="font-mono text-sm flex items-center gap-2">
                    <Tag className="h-4 w-4 text-primary" />
                    fonts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {brand.metadata?.aiAnalysis?.fonts ? (
                    <div className="space-y-3">
                      {brand.metadata.aiAnalysis.fonts.primary && (
                        <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                          <span className="text-xs text-muted-foreground font-mono">primary</span>
                          <span className="text-sm font-medium">{brand.metadata.aiAnalysis.fonts.primary}</span>
                        </div>
                      )}
                      {brand.metadata.aiAnalysis.fonts.secondary && (
                        <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                          <span className="text-xs text-muted-foreground font-mono">secondary</span>
                          <span className="text-sm font-medium">{brand.metadata.aiAnalysis.fonts.secondary}</span>
                        </div>
                      )}
                      {brand.metadata.aiAnalysis.fonts.mono && (
                        <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                          <span className="text-xs text-muted-foreground font-mono">mono</span>
                          <span className="text-sm font-medium">{brand.metadata.aiAnalysis.fonts.mono}</span>
                        </div>
                      )}
                      {brand.metadata.detectedFonts && brand.metadata.detectedFonts.length > 0 && (
                        <div className="pt-2 border-t border-border/50">
                          <p className="text-xs text-muted-foreground font-mono mb-2">detected</p>
                          <div className="flex flex-wrap gap-1">
                            {brand.metadata.detectedFonts.map((font: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs">{font}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-6 text-center">
                      <Tag className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No fonts detected</p>
                      <p className="text-xs text-muted-foreground/70">Connect GitHub to analyze fonts</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Assets */}
              <Card className="terminal-border bg-card/50">
                <CardHeader>
                  <CardTitle className="font-mono text-sm flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    assets
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {brand.metadata?.fontFiles && brand.metadata.fontFiles.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-mono mb-2">font_files ({brand.metadata.fontFiles.length})</p>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {brand.metadata.fontFiles.map((file: { path: string; name: string; downloadUrl: string }, idx: number) => (
                          <a
                            key={idx}
                            href={file.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-2 bg-muted/30 rounded hover:bg-muted/50 transition-colors"
                          >
                            <span className="text-xs truncate flex-1">{file.name}</span>
                            <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center">
                      <Package className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No assets found</p>
                      <p className="text-xs text-muted-foreground/70">Connect GitHub to load assets</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* GitHub Integration Tab */}
        <TabsContent value="github">
          <Card className="terminal-border bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-mono text-sm flex items-center gap-2">
                <Github className="h-4 w-4 text-primary" />
                github_integration
              </CardTitle>
              {brand.github_repo ? (
                <div className="flex items-center gap-2">
                  <a
                    href={`https://github.com/${brand.github_repo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-mono text-primary hover:underline flex items-center gap-1"
                  >
                    {brand.github_repo}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDisconnectRepo}
                    disabled={isSaving}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                    Disconnect
                  </Button>
                </div>
              ) : (
                <Dialog open={repoDialogOpen} onOpenChange={(open) => {
                  setRepoDialogOpen(open)
                  if (open) fetchRepos()
                }}>
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
                      <Input
                        value={repoSearch}
                        onChange={(e) => setRepoSearch(e.target.value)}
                        placeholder="Search repositories..."
                        className="font-mono"
                      />
                      <div className="max-h-[300px] overflow-y-auto space-y-2">
                        {isLoadingRepos ? (
                          <div className="py-8 text-center">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                          </div>
                        ) : filteredRepos.length === 0 ? (
                          <p className="py-8 text-center text-muted-foreground text-sm">
                            No repositories found
                          </p>
                        ) : (
                          filteredRepos.map(repo => (
                            <button
                              key={repo.id}
                              onClick={() => handleConnectRepo(repo)}
                              className="w-full text-left p-3 rounded-md border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all"
                            >
                              <span className="font-mono text-sm font-medium">{repo.fullName}</span>
                              {repo.description && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                  {repo.description}
                                </p>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              {brand.github_repo ? (
                <div className="space-y-6">
                  {isLoadingActivity ? (
                    <div className="py-8 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                      <p className="text-sm text-muted-foreground mt-2">Loading activity...</p>
                    </div>
                  ) : githubActivity ? (
                    <>
                      {/* Merged PRs */}
                      <div>
                        <h3 className="font-mono text-xs text-muted-foreground mb-3 flex items-center gap-2">
                          <GitMerge className="h-4 w-4" />
                          recent_merges ({githubActivity.mergedPRs.length})
                        </h3>
                        {githubActivity.mergedPRs.length > 0 ? (
                          <div className="space-y-2">
                            {githubActivity.mergedPRs.map(pr => (
                              <a
                                key={pr.id}
                                href={pr.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block p-3 rounded-md border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {pr.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      <span className="text-green-500">#{pr.number}</span>
                                      {' merged '}
                                      {formatTimeAgo(pr.mergedAt)}
                                      {' by '}
                                      <span className="text-foreground">{pr.author}</span>
                                    </p>
                                  </div>
                                  <Badge variant="outline" className="text-xs shrink-0">
                                    {pr.sourceBranch} → {pr.targetBranch}
                                  </Badge>
                                </div>
                              </a>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No merged PRs found</p>
                        )}
                      </div>

                      {/* Recent Commits */}
                      <div>
                        <h3 className="font-mono text-xs text-muted-foreground mb-3 flex items-center gap-2">
                          <GitCommit className="h-4 w-4" />
                          recent_commits ({githubActivity.recentCommits.length})
                        </h3>
                        {githubActivity.recentCommits.length > 0 ? (
                          <div className="space-y-1">
                            {githubActivity.recentCommits.slice(0, 10).map(commit => (
                              <a
                                key={commit.sha}
                                href={commit.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 transition-colors text-sm"
                              >
                                <code className="text-xs text-primary font-mono">{commit.sha}</code>
                                <span className="flex-1 truncate text-muted-foreground">
                                  {commit.message}
                                </span>
                                <span className="text-xs text-muted-foreground shrink-0">
                                  {formatTimeAgo(commit.date)}
                                </span>
                              </a>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No commits found</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Could not load activity</p>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Github className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">No repository connected</p>
                  <p className="text-sm text-muted-foreground/70">
                    Connect a GitHub repo to see activity and auto-generate content
                  </p>
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
                      Link your GitHub repo to this brand
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center text-xs text-primary font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-semibold">Track activity</p>
                    <p className="text-muted-foreground text-xs">
                      See merged PRs and recent commits
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center text-xs text-primary font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-semibold">Generate content</p>
                    <p className="text-muted-foreground text-xs">
                      Create videos, posts, and images about your releases
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
              <div className="py-12 text-center">
                <Video className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">No content created yet</p>
                <p className="text-sm text-muted-foreground/70">
                  Use AI to generate videos, images, and posts
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  )
}
