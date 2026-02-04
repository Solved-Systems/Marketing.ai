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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Video,
  Plus,
  ExternalLink,
  Github,
  GitMerge,
  GitCommit,
  Loader2,
  X,
  Save,
  Check,
  Sparkles,
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
  extractedAt?: string
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
  const [hasChanges, setHasChanges] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Editable form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tagline: '',
    website_url: '',
    logo_url: null as string | null,
    primary_color: '#ff8c00',
    secondary_color: '#1a1a1a',
    accent_color: '#ffa500',
  })

  // GitHub state
  const [githubActivity, setGithubActivity] = useState<GitHubActivity | null>(null)
  const [isLoadingActivity, setIsLoadingActivity] = useState(false)
  const [repoDialogOpen, setRepoDialogOpen] = useState(false)
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [isLoadingRepos, setIsLoadingRepos] = useState(false)
  const [repoSearch, setRepoSearch] = useState('')

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

        // Convert logo URL to proxy if it's a GitHub raw URL
        let logoUrl = data.logo_url
        if (logoUrl && data.github_repo && (logoUrl.includes('raw.githubusercontent.com') || logoUrl.includes('github.com'))) {
          // Try to find the path from metadata
          const logoMeta = data.metadata?.availableLogos?.find((l: { downloadUrl: string }) => l.downloadUrl === logoUrl)
          if (logoMeta) {
            logoUrl = `/api/github/file?repo=${encodeURIComponent(data.github_repo)}&path=${encodeURIComponent(logoMeta.path)}`
          }
        }

        // Initialize form with brand data
        setFormData({
          name: data.name || '',
          description: data.description || '',
          tagline: data.tagline || '',
          website_url: data.website_url || '',
          logo_url: logoUrl,
          primary_color: data.primary_color || '#ff8c00',
          secondary_color: data.secondary_color || '#1a1a1a',
          accent_color: data.accent_color || '#ffa500',
        })
      } catch (err) {
        console.error('Error fetching brand:', err)
        setError('Failed to load brand')
      } finally {
        setIsLoading(false)
      }
    }
    fetchBrand()
  }, [id])

  // Track changes
  useEffect(() => {
    if (!brand) return
    const changed =
      formData.name !== brand.name ||
      formData.description !== (brand.description || '') ||
      formData.tagline !== (brand.tagline || '') ||
      formData.website_url !== (brand.website_url || '') ||
      formData.logo_url !== brand.logo_url ||
      formData.primary_color !== brand.primary_color ||
      formData.secondary_color !== brand.secondary_color ||
      formData.accent_color !== brand.accent_color
    setHasChanges(changed)
  }, [formData, brand])

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

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/brands/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          tagline: formData.tagline,
          website_url: formData.website_url,
          logo_url: formData.logo_url,
          primary_color: formData.primary_color,
          secondary_color: formData.secondary_color,
          accent_color: formData.accent_color,
        }),
      })
      if (response.ok) {
        const updated = await response.json()
        setBrand(updated)
        setHasChanges(false)
      }
    } catch (err) {
      console.error('Error saving brand:', err)
    } finally {
      setIsSaving(false)
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

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'today'
    if (diffDays === 1) return 'yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Convert GitHub raw URLs to proxy URLs to avoid token expiration
  const convertToProxyUrl = (url: string, path: string) => {
    // If already using our proxy, keep it
    if (url.startsWith('/api/github/file')) return url
    // If it's a data URL (uploaded file), keep it
    if (url.startsWith('data:')) return url
    // Convert GitHub raw URLs to our proxy
    if (url.includes('raw.githubusercontent.com') || url.includes('github.com')) {
      return `/api/github/file?repo=${encodeURIComponent(brand?.github_repo || '')}&path=${encodeURIComponent(path)}`
    }
    return url
  }

  // Get available logos from metadata and convert URLs
  const availableLogos = (brand?.metadata?.availableLogos || []).map(logo => ({
    ...logo,
    downloadUrl: convertToProxyUrl(logo.downloadUrl, logo.path)
  }))
  const detectedFonts = brand?.metadata?.detectedFonts || []
  const fontFiles = (brand?.metadata?.fontFiles || []).map(font => ({
    ...font,
    downloadUrl: convertToProxyUrl(font.downloadUrl, font.path)
  }))
  const aiAnalysis = brand?.metadata?.aiAnalysis

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
            {formData.logo_url ? (
              <img
                src={formData.logo_url}
                alt={formData.name}
                className="w-12 h-12 md:w-16 md:h-16 rounded-lg object-contain bg-muted flex-shrink-0"
              />
            ) : (
              <div
                className="w-12 h-12 md:w-16 md:h-16 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: formData.primary_color }}
              >
                <span className="text-white font-bold text-xl md:text-2xl">
                  {formData.name[0]?.toUpperCase()}
                </span>
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="text-xl md:text-3xl font-bold truncate" style={{ color: formData.primary_color }}>
                  {formData.name}
                </h1>
                <Link href={`/brands/${id}/create/video`}>
                  <Button variant="terminal" size="sm" className="shrink-0">
                    <Sparkles className="h-4 w-4" />
                    Create Content
                  </Button>
                </Link>
              </div>
              <p className="text-muted-foreground text-sm md:text-base truncate">{formData.tagline}</p>
            </div>
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
          {/* Brand Preview Card - Matching creation flow */}
          <Card className="terminal-border bg-card/50 mb-6">
            <CardHeader className="py-3 border-b border-border/50 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-mono">brand_preview</CardTitle>
              {hasChanges && (
                <Button
                  variant="terminal"
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Brand
                    </>
                  )}
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-4 md:p-6 space-y-6">
              {/* Connected Repo */}
              {brand.github_repo && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Github className="h-4 w-4" />
                  <span className="font-mono">{brand.github_repo}</span>
                  <Check className="h-4 w-4 text-green-500" />
                </div>
              )}

              {/* AI Analysis Summary */}
              {aiAnalysis?.summary && (
                <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{aiAnalysis.summary}</p>
                  {aiAnalysis.sources && (
                    <div className="mt-3 pt-3 border-t border-border/30 text-xs text-muted-foreground/80 space-y-1">
                      <p className="font-mono font-medium text-muted-foreground">sources:</p>
                      {aiAnalysis.sources.name && <p>• Name: {aiAnalysis.sources.name}</p>}
                      {aiAnalysis.sources.description && <p>• Description: {aiAnalysis.sources.description}</p>}
                      {aiAnalysis.sources.colors && <p>• Colors: {aiAnalysis.sources.colors}</p>}
                      {aiAnalysis.sources.fonts && <p>• Fonts: {aiAnalysis.sources.fonts}</p>}
                    </div>
                  )}
                </div>
              )}

              {/* Brand Card Preview - Editable */}
              <div
                className="p-4 md:p-6 rounded-lg border"
                style={{ backgroundColor: formData.secondary_color, borderColor: formData.primary_color + '30' }}
              >
                <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
                  {formData.logo_url ? (
                    <img
                      src={formData.logo_url}
                      alt="Logo"
                      className="w-12 h-12 md:w-14 md:h-14 rounded-lg object-contain bg-white/10 flex-shrink-0"
                    />
                  ) : (
                    <div
                      className="w-12 h-12 md:w-14 md:h-14 rounded-lg flex items-center justify-center text-white font-bold text-xl md:text-2xl flex-shrink-0"
                      style={{ backgroundColor: formData.primary_color }}
                    >
                      {formData.name[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="text-lg md:text-xl font-bold bg-transparent border-none outline-none w-full focus:ring-1 focus:ring-primary/50 rounded px-1 -ml-1"
                      style={{ color: formData.primary_color }}
                      placeholder="Brand Name"
                    />
                    <input
                      type="text"
                      value={formData.tagline}
                      onChange={(e) => setFormData(prev => ({ ...prev, tagline: e.target.value }))}
                      className="text-xs md:text-sm text-gray-400 bg-transparent border-none outline-none w-full focus:ring-1 focus:ring-primary/50 rounded px-1 -ml-1"
                      placeholder="Tagline"
                    />
                  </div>
                </div>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="text-xs md:text-sm text-gray-300 bg-transparent border-none outline-none w-full resize-none focus:ring-1 focus:ring-primary/50 rounded px-1 -ml-1 mb-3 md:mb-4"
                  placeholder="Brand description..."
                  rows={3}
                />
                <input
                  type="url"
                  value={formData.website_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, website_url: e.target.value }))}
                  className="text-xs bg-transparent border-none outline-none w-full focus:ring-1 focus:ring-primary/50 rounded px-1 -ml-1"
                  style={{ color: formData.accent_color }}
                  placeholder="https://website.com"
                />
              </div>

              {/* Logo Section */}
              <div>
                <p className="font-mono text-xs text-muted-foreground mb-2">logo</p>
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4">
                  {/* Current Logo Preview */}
                  <div
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden flex-shrink-0"
                    style={{ backgroundColor: formData.secondary_color }}
                  >
                    {formData.logo_url ? (
                      <img
                        src={formData.logo_url}
                        alt="Logo"
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-white font-bold text-xl sm:text-2xl"
                        style={{ backgroundColor: formData.primary_color }}
                      >
                        {formData.name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                  </div>

                  {/* Logo Options */}
                  <div className="flex-1 w-full sm:w-auto">
                    <div className="flex gap-2 flex-wrap justify-center sm:justify-start mb-2">
                      {/* Found logos from metadata */}
                      {availableLogos.map((logo) => (
                        <button
                          key={logo.path}
                          onClick={() => setFormData(prev => ({ ...prev, logo_url: logo.downloadUrl }))}
                          className={`p-1 rounded border-2 transition-colors ${
                            formData.logo_url === logo.downloadUrl
                              ? 'border-primary'
                              : 'border-border hover:border-primary/50'
                          }`}
                          title={logo.path}
                        >
                          <img
                            src={logo.downloadUrl}
                            alt={logo.path}
                            className="w-8 h-8 object-contain bg-white/10 rounded"
                          />
                        </button>
                      ))}

                      {/* Upload button */}
                      <label
                        className="w-10 h-10 rounded border-2 border-dashed border-border hover:border-primary/50 flex items-center justify-center cursor-pointer transition-colors"
                        title="Upload logo"
                      >
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              const reader = new FileReader()
                              reader.onload = (ev) => {
                                setFormData(prev => ({ ...prev, logo_url: ev.target?.result as string }))
                              }
                              reader.readAsDataURL(file)
                            }
                          }}
                        />
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      </label>

                      {/* Use letter fallback */}
                      <button
                        onClick={() => setFormData(prev => ({ ...prev, logo_url: null }))}
                        className={`w-10 h-10 rounded border-2 flex items-center justify-center text-xs font-mono transition-colors ${
                          !formData.logo_url
                            ? 'border-primary text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/50'
                        }`}
                        title="Use letter"
                      >
                        Aa
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground text-center sm:text-left">
                      {availableLogos.length > 0
                        ? `Found ${availableLogos.length} logo(s) in repo`
                        : 'Upload a logo or use letter'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Fonts Section */}
              {(detectedFonts.length > 0 || fontFiles.length > 0 || aiAnalysis?.fonts) && (
                <div>
                  <p className="font-mono text-xs text-muted-foreground mb-2">fonts</p>
                  <div className="space-y-3">
                    {/* Detected font names as badges */}
                    {detectedFonts.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {detectedFonts.map((font, index) => (
                          <div
                            key={index}
                            className="px-3 py-1.5 bg-muted rounded-md border border-border"
                            style={{ fontFamily: font }}
                          >
                            <span className="text-sm">{font}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* AI-detected fonts with roles */}
                    {aiAnalysis?.fonts && !detectedFonts.length && (
                      <div className="flex flex-wrap gap-2">
                        {aiAnalysis.fonts.primary && (
                          <div className="px-3 py-1.5 bg-muted rounded-md border border-border">
                            <span className="text-sm">{aiAnalysis.fonts.primary}</span>
                          </div>
                        )}
                        {aiAnalysis.fonts.secondary && aiAnalysis.fonts.secondary !== aiAnalysis.fonts.primary && (
                          <div className="px-3 py-1.5 bg-muted rounded-md border border-border">
                            <span className="text-sm">{aiAnalysis.fonts.secondary}</span>
                          </div>
                        )}
                        {aiAnalysis.fonts.mono && (
                          <div className="px-3 py-1.5 bg-muted rounded-md border border-border font-mono">
                            <span className="text-sm">{aiAnalysis.fonts.mono}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Font files found */}
                    {fontFiles.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-mono">files:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {fontFiles.map((font, index) => (
                            <a
                              key={index}
                              href={font.downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-0.5 bg-background rounded border border-border/50 font-mono hover:border-primary/50 transition-colors"
                              title={font.path}
                            >
                              {font.name}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Colors - Editable */}
              <div>
                <p className="font-mono text-xs text-muted-foreground mb-2">colors (tap to edit)</p>
                <div className="grid grid-cols-3 gap-2 md:gap-3">
                  <div className="text-center">
                    <label className="cursor-pointer block">
                      <input
                        type="color"
                        value={formData.primary_color}
                        onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                        className="sr-only"
                      />
                      <div
                        className="w-full h-10 md:h-12 rounded border border-border hover:border-primary/50 transition-colors"
                        style={{ backgroundColor: formData.primary_color }}
                      />
                    </label>
                    <Input
                      value={formData.primary_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                      className="font-mono text-xs h-7 mt-1 text-center"
                      placeholder="#000000"
                    />
                    <span className="text-xs font-mono text-muted-foreground">primary</span>
                  </div>
                  <div className="text-center">
                    <label className="cursor-pointer block">
                      <input
                        type="color"
                        value={formData.secondary_color}
                        onChange={(e) => setFormData(prev => ({ ...prev, secondary_color: e.target.value }))}
                        className="sr-only"
                      />
                      <div
                        className="w-full h-10 md:h-12 rounded border border-border hover:border-primary/50 transition-colors"
                        style={{ backgroundColor: formData.secondary_color }}
                      />
                    </label>
                    <Input
                      value={formData.secondary_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, secondary_color: e.target.value }))}
                      className="font-mono text-xs h-7 mt-1 text-center"
                      placeholder="#000000"
                    />
                    <span className="text-xs font-mono text-muted-foreground">secondary</span>
                  </div>
                  <div className="text-center">
                    <label className="cursor-pointer block">
                      <input
                        type="color"
                        value={formData.accent_color}
                        onChange={(e) => setFormData(prev => ({ ...prev, accent_color: e.target.value }))}
                        className="sr-only"
                      />
                      <div
                        className="w-full h-10 md:h-12 rounded border border-border hover:border-primary/50 transition-colors"
                        style={{ backgroundColor: formData.accent_color }}
                      />
                    </label>
                    <Input
                      value={formData.accent_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, accent_color: e.target.value }))}
                      className="font-mono text-xs h-7 mt-1 text-center"
                      placeholder="#000000"
                    />
                    <span className="text-xs font-mono text-muted-foreground">accent</span>
                  </div>
                </div>
              </div>

              {/* Sample Button */}
              <div>
                <p className="font-mono text-xs text-muted-foreground mb-2">sample_button</p>
                <Button
                  style={{
                    backgroundColor: formData.accent_color,
                    color: formData.secondary_color,
                  }}
                >
                  Get Started
                </Button>
              </div>
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
