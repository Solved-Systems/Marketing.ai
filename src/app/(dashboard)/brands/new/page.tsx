'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AIChatAssistant } from '@/components/ui/ai-chat-assistant'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ArrowLeft, Palette, Loader2, Save, Github, Check, Link as LinkIcon } from 'lucide-react'

interface BrandFormData {
  name: string
  description: string
  tagline: string
  website_url: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  githubRepo: string | null
}

const formFields = [
  { name: 'name', label: 'Brand Name', type: 'text' as const, description: 'The name of your brand' },
  { name: 'description', label: 'Description', type: 'textarea' as const, description: 'A brief description of what your brand does' },
  { name: 'tagline', label: 'Tagline', type: 'text' as const, description: 'A catchy slogan or tagline' },
  { name: 'website_url', label: 'Website URL', type: 'text' as const, description: 'Your brand website' },
  { name: 'primaryColor', label: 'Primary Color', type: 'color' as const, description: 'Main brand color' },
  { name: 'secondaryColor', label: 'Secondary Color', type: 'color' as const, description: 'Secondary brand color' },
  { name: 'accentColor', label: 'Accent Color', type: 'color' as const, description: 'Accent/highlight color' },
]

export default function NewBrandPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<BrandFormData>({
    name: '',
    description: '',
    tagline: '',
    website_url: '',
    primaryColor: '#ff8c00',
    secondaryColor: '#1a1a1a',
    accentColor: '#ffa500',
    githubRepo: null,
  })
  const [repoDialogOpen, setRepoDialogOpen] = useState(false)
  const [repoUrl, setRepoUrl] = useState('')
  const [isConnectingRepo, setIsConnectingRepo] = useState(false)

  const handleFieldUpdate = (fieldName: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value,
    }))
  }

  const handleConnectRepo = async () => {
    if (!repoUrl.trim()) return
    setIsConnectingRepo(true)

    // Parse GitHub URL to get owner/repo
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/)
    if (!match) {
      alert('Invalid GitHub URL')
      setIsConnectingRepo(false)
      return
    }

    const [, owner, repo] = match
    const fullName = `${owner}/${repo.replace('.git', '')}`

    // Simulate API validation
    await new Promise(resolve => setTimeout(resolve, 500))

    setFormData(prev => ({ ...prev, githubRepo: fullName }))
    setRepoUrl('')
    setRepoDialogOpen(false)
    setIsConnectingRepo(false)
  }

  const handleDisconnectRepo = () => {
    setFormData(prev => ({ ...prev, githubRepo: null }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // TODO: Save to database
      console.log('Creating brand:', formData)

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      router.push('/brands')
    } catch (error) {
      console.error('Error creating brand:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/brands"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Brands
        </Link>
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono mb-2">
          <span>$</span>
          <span className="text-primary">./brands/new</span>
        </div>
        <h1 className="text-3xl font-bold">Create Brand</h1>
        <p className="text-muted-foreground mt-2">
          Set up a new brand with logo, colors, and details
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="terminal-border bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-mono text-sm">
              <Palette className="h-4 w-4 text-primary" />
              brand_config
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* GitHub Repository Connection */}
            <div className="space-y-2">
              <Label className="font-mono text-sm flex items-center gap-2">
                <Github className="h-4 w-4" />
                github_repo
                <span className="text-xs text-muted-foreground font-normal">(optional)</span>
              </Label>
              {formData.githubRepo ? (
                <div className="flex items-center gap-3 p-3 rounded-md bg-primary/10 border border-primary/20">
                  <Check className="h-4 w-4 text-primary" />
                  <a
                    href={`https://github.com/${formData.githubRepo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    {formData.githubRepo}
                    <LinkIcon className="h-3 w-3" />
                  </a>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleDisconnectRepo}
                    className="ml-auto text-muted-foreground hover:text-destructive"
                  >
                    Disconnect
                  </Button>
                </div>
              ) : (
                <Dialog open={repoDialogOpen} onOpenChange={setRepoDialogOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" className="w-full justify-start gap-2 font-mono">
                      <Github className="h-4 w-4" />
                      Connect GitHub Repository
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="terminal-border">
                    <DialogHeader>
                      <DialogTitle className="font-mono flex items-center gap-2">
                        <Github className="h-5 w-5" />
                        Connect Repository
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="repo-url" className="font-mono text-sm">
                          Repository URL
                        </Label>
                        <Input
                          id="repo-url"
                          value={repoUrl}
                          onChange={(e) => setRepoUrl(e.target.value)}
                          placeholder="https://github.com/owner/repo"
                          className="font-mono"
                        />
                        <p className="text-xs text-muted-foreground">
                          Connect a GitHub repo to auto-generate content from releases and updates.
                        </p>
                      </div>
                      <Button
                        onClick={handleConnectRepo}
                        disabled={!repoUrl.trim() || isConnectingRepo}
                        className="w-full"
                        variant="terminal"
                      >
                        {isConnectingRepo ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <Github className="h-4 w-4" />
                            Connect
                          </>
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="font-mono text-sm">
                name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleFieldUpdate('name', e.target.value)}
                placeholder="Enter brand name"
                className="font-mono"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="font-mono text-sm">
                description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleFieldUpdate('description', e.target.value)}
                placeholder="Describe what your brand does..."
                className="font-mono min-h-[100px]"
              />
            </div>

            {/* Tagline */}
            <div className="space-y-2">
              <Label htmlFor="tagline" className="font-mono text-sm">
                tagline
              </Label>
              <Input
                id="tagline"
                value={formData.tagline}
                onChange={(e) => handleFieldUpdate('tagline', e.target.value)}
                placeholder="A catchy slogan for your brand"
                className="font-mono"
              />
            </div>

            {/* Website URL */}
            <div className="space-y-2">
              <Label htmlFor="website_url" className="font-mono text-sm">
                website_url
              </Label>
              <Input
                id="website_url"
                type="url"
                value={formData.website_url}
                onChange={(e) => handleFieldUpdate('website_url', e.target.value)}
                placeholder="https://yourbrand.com"
                className="font-mono"
              />
            </div>

            {/* Colors */}
            <div className="space-y-4">
              <Label className="font-mono text-sm">brand_colors</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor" className="text-xs text-muted-foreground">
                    Primary
                  </Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      id="primaryColor"
                      value={formData.primaryColor}
                      onChange={(e) => handleFieldUpdate('primaryColor', e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border border-border"
                    />
                    <Input
                      value={formData.primaryColor}
                      onChange={(e) => handleFieldUpdate('primaryColor', e.target.value)}
                      className="font-mono text-xs"
                      placeholder="#000000"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondaryColor" className="text-xs text-muted-foreground">
                    Secondary
                  </Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      id="secondaryColor"
                      value={formData.secondaryColor}
                      onChange={(e) => handleFieldUpdate('secondaryColor', e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border border-border"
                    />
                    <Input
                      value={formData.secondaryColor}
                      onChange={(e) => handleFieldUpdate('secondaryColor', e.target.value)}
                      className="font-mono text-xs"
                      placeholder="#000000"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accentColor" className="text-xs text-muted-foreground">
                    Accent
                  </Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      id="accentColor"
                      value={formData.accentColor}
                      onChange={(e) => handleFieldUpdate('accentColor', e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border border-border"
                    />
                    <Input
                      value={formData.accentColor}
                      onChange={(e) => handleFieldUpdate('accentColor', e.target.value)}
                      className="font-mono text-xs"
                      placeholder="#000000"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label className="font-mono text-sm">preview</Label>
              <div
                className="p-6 rounded terminal-border"
                style={{ backgroundColor: formData.secondaryColor }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-12 h-12 rounded flex items-center justify-center"
                    style={{ backgroundColor: formData.primaryColor }}
                  >
                    <span className="text-white font-bold text-xl">
                      {formData.name?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div>
                    <h3
                      className="font-bold text-lg"
                      style={{ color: formData.primaryColor }}
                    >
                      {formData.name || 'Brand Name'}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {formData.tagline || 'Your tagline here'}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  style={{
                    backgroundColor: formData.accentColor,
                    color: formData.secondaryColor,
                  }}
                >
                  Sample Button
                </Button>
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-4 pt-4 border-t border-border/50">
              <Link href="/brands">
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" variant="terminal" disabled={isLoading || !formData.name}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Create Brand
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* AI Chat Assistant */}
      <AIChatAssistant
        formFields={formFields}
        onFieldUpdate={handleFieldUpdate}
        context="This is a brand creation form for a marketing platform. Help the user set up their brand with appropriate name, description, tagline, and colors."
        placeholder="Describe your brand and I'll help fill the form..."
      />
    </div>
  )
}
