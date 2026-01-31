'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Sparkles,
  Send,
  Loader2,
  Github,
  Check,
  Lock,
  Search,
  Save,
  RefreshCw,
  Plus,
  Upload,
} from 'lucide-react'

interface GitHubRepo {
  id: number
  name: string
  fullName: string
  url: string
  description: string | null
  private: boolean
}

interface ExtractedColor {
  hex: string
  name?: string // CSS variable name like "primary", "accent", etc.
}

interface ExtractedFont {
  family: string
  source?: string
}

interface RepoInfo {
  name: string
  fullName: string
  description: string | null
  homepage: string | null
  topics: string[]
  language: string | null
  readme: string | null
  packageJson: {
    name: string
    description: string
    keywords: string[]
  } | null
  colors: {
    extracted: ExtractedColor[]
    sources: { path: string; colors: ExtractedColor[] }[]
  } | null
  fonts: {
    extracted: ExtractedFont[]
    sources: { path: string; fonts: ExtractedFont[] }[]
  } | null
  logos: { path: string; downloadUrl: string; size: number }[] | null
}

interface BrandFormData {
  name: string
  description: string
  tagline: string
  website_url: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  githubRepo: string | null
  logoUrl: string | null
}

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  action?: 'connect_repo' | 'show_preview' | 'generating'
}

const initialMessage: Message = {
  id: '1',
  role: 'assistant',
  content: `Welcome! I'll help you create a brand profile.\n\nWould you like to connect a **GitHub repository**? I can analyze it to automatically generate your brand details (name, description, tagline, colors).`,
  action: 'connect_repo',
}

export default function NewBrandPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([initialMessage])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Repo selection
  const [repoDialogOpen, setRepoDialogOpen] = useState(false)
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [isLoadingRepos, setIsLoadingRepos] = useState(false)
  const [repoSearch, setRepoSearch] = useState('')
  const [repoError, setRepoError] = useState<string | null>(null)

  // Brand data
  const [formData, setFormData] = useState<BrandFormData>({
    name: '',
    description: '',
    tagline: '',
    website_url: '',
    primaryColor: '#ff8c00',
    secondaryColor: '#1a1a1a',
    accentColor: '#ffa500',
    githubRepo: null,
    logoUrl: null,
  })
  const [showPreview, setShowPreview] = useState(false)
  const [availableLogos, setAvailableLogos] = useState<{ path: string; downloadUrl: string }[]>([])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const fetchRepos = async () => {
    setIsLoadingRepos(true)
    setRepoError(null)
    try {
      const response = await fetch('/api/github/repos')
      if (!response.ok) {
        if (response.status === 401) {
          setRepoError('Please sign in with GitHub first')
          return
        }
        throw new Error('Failed to fetch repos')
      }
      const data = await response.json()
      setRepos(data)
    } catch {
      setRepoError('Failed to load repositories')
    } finally {
      setIsLoadingRepos(false)
    }
  }

  const addMessage = (msg: Omit<Message, 'id'>) => {
    setMessages(prev => [...prev, { ...msg, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` }])
  }

  const handleConnectRepo = () => {
    fetchRepos()
    setRepoDialogOpen(true)
  }

  const handleSkipRepo = () => {
    addMessage({ role: 'user', content: "I'll set up the brand manually" })
    setTimeout(() => {
      addMessage({
        role: 'assistant',
        content: `No problem! Let's set up your brand manually.\n\nWhat's your **brand name**?`,
      })
    }, 300)
  }

  const updateGeneratingMessage = (content: string) => {
    setMessages(prev => prev.map(m =>
      m.action === 'generating' ? { ...m, content } : m
    ))
  }

  const handleSelectRepo = async (repo: GitHubRepo) => {
    setRepoDialogOpen(false)
    setFormData(prev => ({ ...prev, githubRepo: repo.fullName }))

    addMessage({ role: 'user', content: `Connect ${repo.fullName}` })
    addMessage({
      role: 'assistant',
      content: `Connecting to **${repo.fullName}**...\n\n\`fetching repository metadata...\``,
      action: 'generating',
    })
    setIsLoading(true)

    try {
      // Fetch repo info
      updateGeneratingMessage(`Connecting to **${repo.fullName}**...\n\n\`fetching README.md...\``)
      const repoInfoResponse = await fetch(`/api/github/repo-info?repo=${encodeURIComponent(repo.fullName)}`)
      if (!repoInfoResponse.ok) throw new Error('Failed to fetch repo info')
      const repoInfo: RepoInfo = await repoInfoResponse.json()

      // Show what we found
      const foundItems = []
      if (repoInfo.readme) foundItems.push('README.md')
      if (repoInfo.description) foundItems.push('description')
      if (repoInfo.packageJson) foundItems.push('package.json')
      if (repoInfo.topics?.length) foundItems.push(`${repoInfo.topics.length} topics`)

      // Show colors found
      const colorSources = repoInfo.colors?.sources?.map(s => s.path) || []
      const colorsFound = repoInfo.colors?.extracted?.length || 0
      const fontsFound = repoInfo.fonts?.extracted?.length || 0

      // Show logos found
      const logosFound = repoInfo.logos || []
      if (logosFound.length > 0) {
        setAvailableLogos(logosFound)
        setFormData(prev => ({ ...prev, logoUrl: logosFound[0].downloadUrl }))
      }

      let statusMsg = `Connecting to **${repo.fullName}**...\n\n\`found: ${foundItems.join(', ')}\``
      if (logosFound.length > 0) {
        statusMsg += `\n\`found ${logosFound.length} logo(s): ${logosFound.map(l => l.path).join(', ')}\``
      }
      if (colorsFound > 0) {
        // Show named colors prominently
        const namedColors = repoInfo.colors?.extracted?.filter(c => c.name) || []
        if (namedColors.length > 0) {
          statusMsg += `\n\`extracted theme colors: ${namedColors.map(c => `${c.name}: ${c.hex}`).slice(0, 6).join(', ')}\``
        } else {
          statusMsg += `\n\`extracted ${colorsFound} colors from: ${colorSources.join(', ')}\``
        }
      }
      if (fontsFound > 0) {
        const fontNames = repoInfo.fonts?.extracted?.map(f => f.family).slice(0, 3).join(', ') || ''
        statusMsg += `\n\`found fonts: ${fontNames}\``
      }
      statusMsg += `\n\`analyzing content with AI...\``

      updateGeneratingMessage(statusMsg)

      // Call AI to generate brand from repo info
      const aiResponse = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Generate a brand profile from the repository information provided.' }],
          system: `You are a brand strategist AI. Generate a brand profile from this GitHub repository information.

Repository: ${repoInfo.fullName}
Description: ${repoInfo.description || 'No description'}
Homepage: ${repoInfo.homepage || 'None'}
Topics: ${repoInfo.topics.join(', ') || 'None'}
Language: ${repoInfo.language || 'Unknown'}
${repoInfo.packageJson ? `Package name: ${repoInfo.packageJson.name}\nPackage description: ${repoInfo.packageJson.description}` : ''}

${repoInfo.colors?.extracted?.length ? `
COLORS EXTRACTED FROM CODEBASE:
${(() => {
  const namedColors = repoInfo.colors!.extracted.filter(c => c.name)
  const unnamedColors = repoInfo.colors!.extracted.filter(c => !c.name)
  let colorInfo = ''
  if (namedColors.length > 0) {
    colorInfo += 'Theme Colors (from CSS variables):\n'
    colorInfo += namedColors.map(c => `  --${c.name}: ${c.hex}`).join('\n')
  }
  if (unnamedColors.length > 0 && unnamedColors.length <= 10) {
    colorInfo += '\nAdditional Colors:\n'
    colorInfo += '  ' + unnamedColors.map(c => c.hex).join(', ')
  }
  return colorInfo
})()}

IMPORTANT:
- Use these actual colors from the codebase! Look for CSS variable names like "primary", "accent", "terminal" to pick the right colors.
- Named colors are MORE RELIABLE than unnamed ones - they represent the actual theme.
- If you see "--primary" or "--terminal", that's the main brand color!
` : ''}
${repoInfo.fonts?.extracted?.length ? `
FONTS EXTRACTED FROM CODEBASE:
${repoInfo.fonts.extracted.map(f => `- ${f.family}${f.source ? ` (from ${f.source})` : ''}`).join('\n')}
` : ''}

README (excerpt):
${repoInfo.readme || 'No README available'}

Based on this, generate a brand profile. Respond with ONLY a JSON block:
\`\`\`json
{
  "fieldUpdates": {
    "name": "Brand Name",
    "description": "2-3 sentence description",
    "tagline": "A catchy tagline (5-10 words)",
    "website_url": "homepage URL or empty string",
    "primaryColor": "#hexcode",
    "secondaryColor": "#hexcode (dark)",
    "accentColor": "#hexcode"
  },
  "sources": {
    "name": "source (e.g., 'repo name', 'package.json name field')",
    "description": "source (e.g., 'README.md intro', 'repo description')",
    "tagline": "source (e.g., 'derived from README tagline', 'created from topics')",
    "website_url": "source (e.g., 'repo homepage field', 'none')",
    "colors": "source file and reasoning (e.g., 'primary #3B82F6 from tailwind.config.ts, accent #10B981 from globals.css')"
  },
  "summary": "Brief explanation with specific references to where you found information"
}
\`\`\`

IMPORTANT:
1. If colors were extracted from the codebase, USE THOSE ACTUAL COLORS - don't make up new ones!
2. In the summary, cite specific sources like:
   - "Name from repo name 'Vizual'"
   - "Description derived from README.md first paragraph"
   - "Primary color #ff8c00 from globals.css"
   - "Accent color #3B82F6 from tailwind.config.ts"

Only suggest new colors if none were found in the codebase.`,
        }),
      })

      const aiData = await aiResponse.json()
      const content = aiData.content || ''

      // Extract JSON
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1])
        if (parsed.fieldUpdates) {
          setFormData(prev => ({
            ...prev,
            ...parsed.fieldUpdates,
            githubRepo: repo.fullName,
          }))
        }

        // Build sources annotation
        let sourcesText = ''
        if (parsed.sources) {
          sourcesText = '\n\n**Sources:**'
          if (parsed.sources.name) sourcesText += `\n• Name: ${parsed.sources.name}`
          if (parsed.sources.description) sourcesText += `\n• Description: ${parsed.sources.description}`
          if (parsed.sources.tagline) sourcesText += `\n• Tagline: ${parsed.sources.tagline}`
          if (parsed.sources.colors) sourcesText += `\n• Colors: ${parsed.sources.colors}`
        }

        // Remove the "generating" message and add result
        setMessages(prev => prev.filter(m => m.action !== 'generating'))
        addMessage({
          role: 'assistant',
          content: `I've analyzed **${repo.fullName}** and generated your brand profile:\n\n${parsed.summary || 'Brand details have been filled based on the repository.'}${sourcesText}\n\nYou can ask me to adjust anything - colors, tagline, description - just let me know!`,
          action: 'show_preview',
        })
        setShowPreview(true)
        // Auto-switch to preview on mobile
        setMobileTab('preview')
      }
    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => prev.filter(m => m.action !== 'generating'))
      addMessage({
        role: 'assistant',
        content: `I had trouble analyzing the repository. Let's set up your brand manually instead.\n\nWhat's your **brand name**?`,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    addMessage({ role: 'user', content: userMessage })
    setIsLoading(true)

    try {
      // Build messages including the new user message
      const allMessages = [
        ...messages.filter(m => m.role !== 'system' && m.action !== 'generating').map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content
        })),
        { role: 'user' as const, content: userMessage }
      ]

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: allMessages,
          system: `You are helping create a brand profile through conversation. Current brand data:
${JSON.stringify(formData, null, 2)}

When the user wants to update something, respond conversationally AND include a JSON block:
\`\`\`json
{"fieldUpdates": {"fieldName": "value"}}
\`\`\`

Available fields: name, description, tagline, website_url, primaryColor, secondaryColor, accentColor (use hex codes for colors).

If they ask questions or want suggestions, help them. Be friendly and creative.
If the brand looks complete and they seem satisfied, let them know they can save it.`,
        }),
      })

      const data = await response.json()
      const content = data.content || ''

      // Extract and apply updates
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1])
          if (parsed.fieldUpdates) {
            setFormData(prev => ({ ...prev, ...parsed.fieldUpdates }))
            setShowPreview(true)
          }
        } catch {
          // Ignore JSON errors
        }
      }

      // Add message without JSON block
      const cleanContent = content.replace(/```json[\s\S]*?```/g, '').trim()
      addMessage({ role: 'assistant', content: cleanContent })
    } catch (error) {
      console.error('Error:', error)
      addMessage({
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveBrand = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          tagline: formData.tagline,
          website_url: formData.website_url,
          logo_url: formData.logoUrl,
          primary_color: formData.primaryColor,
          secondary_color: formData.secondaryColor,
          accent_color: formData.accentColor,
          github_repo: formData.githubRepo,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save brand')
      }

      router.push('/brands')
    } catch (error) {
      console.error('Error saving brand:', error)
      addMessage({
        role: 'assistant',
        content: `Failed to save brand: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const filteredRepos = repos.filter(repo =>
    repo.fullName.toLowerCase().includes(repoSearch.toLowerCase()) ||
    repo.description?.toLowerCase().includes(repoSearch.toLowerCase())
  )

  // Mobile tab state
  const [mobileTab, setMobileTab] = useState<'chat' | 'preview'>('chat')

  return (
    <div className="p-4 md:p-8 h-[calc(100vh-1rem)] md:h-[calc(100vh-2rem)] flex flex-col">
      {/* Header */}
      <div className="mb-4 md:mb-6 flex-shrink-0">
        <Link
          href="/brands"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2 md:mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Brands
        </Link>
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono mb-1 md:mb-2">
          <span>$</span>
          <span className="text-primary">./brands/new</span>
        </div>
        <h1 className="text-xl md:text-2xl font-bold">Create Brand</h1>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="flex lg:hidden mb-3 gap-2 flex-shrink-0">
        <Button
          variant={mobileTab === 'chat' ? 'terminal' : 'outline'}
          size="sm"
          onClick={() => setMobileTab('chat')}
          className="flex-1 font-mono text-xs"
        >
          <Sparkles className="h-3 w-3 mr-1" />
          Assistant
        </Button>
        <Button
          variant={mobileTab === 'preview' ? 'terminal' : 'outline'}
          size="sm"
          onClick={() => setMobileTab('preview')}
          className="flex-1 font-mono text-xs"
        >
          <Check className="h-3 w-3 mr-1" />
          Preview {showPreview && formData.name && '•'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 flex-1 min-h-0">
        {/* Chat Panel */}
        <Card className={`terminal-border bg-card/50 flex flex-col ${mobileTab !== 'chat' ? 'hidden lg:flex' : ''}`}>
          <CardHeader className="py-3 border-b border-border/50">
            <CardTitle className="text-sm font-mono flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              brand_assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div key={msg.id}>
                    <div
                      className={`text-sm p-3 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-primary/20 ml-8'
                          : 'bg-muted mr-8'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>

                    {/* Action buttons */}
                    {msg.action === 'connect_repo' && messages.length === 1 && (
                      <div className="flex gap-2 mt-3 mr-8">
                        <Button
                          variant="terminal"
                          size="sm"
                          onClick={handleConnectRepo}
                          className="font-mono"
                        >
                          <Github className="h-4 w-4" />
                          Connect Repo
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSkipRepo}
                          className="font-mono"
                        >
                          Skip
                        </Button>
                      </div>
                    )}

                    {msg.action === 'generating' && (
                      <div className="flex items-center gap-2 mt-2 mr-8 text-sm text-primary">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && messages[messages.length - 1]?.action !== 'generating' && (
                  <div className="bg-muted text-sm p-3 rounded-lg mr-8">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                )}
              </div>
            </ScrollArea>

            <form onSubmit={handleSubmit} className="p-3 border-t border-border/50">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask to adjust anything..."
                  disabled={isLoading}
                  className="font-mono text-sm"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={isLoading || !input.trim()}
                  variant="terminal"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Preview Panel */}
        <Card className={`terminal-border bg-card/50 flex flex-col ${mobileTab !== 'preview' ? 'hidden lg:flex' : ''}`}>
          <CardHeader className="py-3 border-b border-border/50 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-mono">brand_preview</CardTitle>
            {showPreview && formData.name && (
              <Button
                variant="terminal"
                size="sm"
                onClick={handleSaveBrand}
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
          <CardContent className="flex-1 p-4 overflow-auto">
            {showPreview && formData.name ? (
              <div className="space-y-6">
                {/* Connected Repo */}
                {formData.githubRepo && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Github className="h-4 w-4" />
                    <span className="font-mono">{formData.githubRepo}</span>
                    <Check className="h-4 w-4 text-green-500" />
                  </div>
                )}

                {/* Brand Card Preview - Editable */}
                <div
                  className="p-4 md:p-6 rounded-lg border"
                  style={{ backgroundColor: formData.secondaryColor, borderColor: formData.primaryColor + '30' }}
                >
                  <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
                    {formData.logoUrl ? (
                      <img
                        src={formData.logoUrl}
                        alt="Logo"
                        className="w-12 h-12 md:w-14 md:h-14 rounded-lg object-contain bg-white/10 flex-shrink-0"
                      />
                    ) : (
                      <div
                        className="w-12 h-12 md:w-14 md:h-14 rounded-lg flex items-center justify-center text-white font-bold text-xl md:text-2xl flex-shrink-0"
                        style={{ backgroundColor: formData.primaryColor }}
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
                        style={{ color: formData.primaryColor }}
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
                    style={{ color: formData.accentColor }}
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
                      style={{ backgroundColor: formData.secondaryColor }}
                    >
                      {formData.logoUrl ? (
                        <img
                          src={formData.logoUrl}
                          alt="Logo"
                          className="w-full h-full object-contain p-1"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center text-white font-bold text-xl sm:text-2xl"
                          style={{ backgroundColor: formData.primaryColor }}
                        >
                          {formData.name?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                    </div>

                    {/* Logo Options */}
                    <div className="flex-1 w-full sm:w-auto">
                      <div className="flex gap-2 flex-wrap justify-center sm:justify-start mb-2">
                        {/* Found logos from repo */}
                        {availableLogos.map((logo) => (
                          <button
                            key={logo.path}
                            onClick={() => setFormData(prev => ({ ...prev, logoUrl: logo.downloadUrl }))}
                            className={`p-1 rounded border-2 transition-colors ${
                              formData.logoUrl === logo.downloadUrl
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
                                  setFormData(prev => ({ ...prev, logoUrl: ev.target?.result as string }))
                                }
                                reader.readAsDataURL(file)
                              }
                            }}
                          />
                          <Plus className="h-4 w-4 text-muted-foreground" />
                        </label>

                        {/* Use letter fallback */}
                        <button
                          onClick={() => setFormData(prev => ({ ...prev, logoUrl: null }))}
                          className={`w-10 h-10 rounded border-2 flex items-center justify-center text-xs font-mono transition-colors ${
                            !formData.logoUrl
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

                {/* Colors - Editable */}
                <div>
                  <p className="font-mono text-xs text-muted-foreground mb-2">colors (tap to edit)</p>
                  <div className="grid grid-cols-3 gap-2 md:gap-3">
                    <div className="text-center">
                      <label className="cursor-pointer block">
                        <input
                          type="color"
                          value={formData.primaryColor}
                          onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                          className="sr-only"
                        />
                        <div
                          className="w-full h-10 md:h-12 rounded border border-border hover:border-primary/50 transition-colors"
                          style={{ backgroundColor: formData.primaryColor }}
                        />
                      </label>
                      <Input
                        value={formData.primaryColor}
                        onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                        className="font-mono text-xs h-7 mt-1 text-center"
                        placeholder="#000000"
                      />
                      <span className="text-xs font-mono text-muted-foreground">primary</span>
                    </div>
                    <div className="text-center">
                      <label className="cursor-pointer block">
                        <input
                          type="color"
                          value={formData.secondaryColor}
                          onChange={(e) => setFormData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                          className="sr-only"
                        />
                        <div
                          className="w-full h-10 md:h-12 rounded border border-border hover:border-primary/50 transition-colors"
                          style={{ backgroundColor: formData.secondaryColor }}
                        />
                      </label>
                      <Input
                        value={formData.secondaryColor}
                        onChange={(e) => setFormData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                        className="font-mono text-xs h-7 mt-1 text-center"
                        placeholder="#000000"
                      />
                      <span className="text-xs font-mono text-muted-foreground">secondary</span>
                    </div>
                    <div className="text-center">
                      <label className="cursor-pointer block">
                        <input
                          type="color"
                          value={formData.accentColor}
                          onChange={(e) => setFormData(prev => ({ ...prev, accentColor: e.target.value }))}
                          className="sr-only"
                        />
                        <div
                          className="w-full h-10 md:h-12 rounded border border-border hover:border-primary/50 transition-colors"
                          style={{ backgroundColor: formData.accentColor }}
                        />
                      </label>
                      <Input
                        value={formData.accentColor}
                        onChange={(e) => setFormData(prev => ({ ...prev, accentColor: e.target.value }))}
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
                      backgroundColor: formData.accentColor,
                      color: formData.secondaryColor,
                    }}
                  >
                    Get Started
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center mb-4">
                  <Sparkles className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">
                  Your brand preview will appear here
                </p>
                <p className="text-muted-foreground/60 text-xs mt-1">
                  Connect a repo or describe your brand to get started
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Repo Selection Dialog */}
      <Dialog open={repoDialogOpen} onOpenChange={setRepoDialogOpen}>
        <DialogContent className="terminal-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono flex items-center gap-2">
              <Github className="h-5 w-5" />
              Select Repository
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {repoError ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-4">{repoError}</p>
                <Link href="/login">
                  <Button variant="terminal">
                    <Github className="h-4 w-4" />
                    Sign in with GitHub
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={repoSearch}
                    onChange={(e) => setRepoSearch(e.target.value)}
                    placeholder="Search repositories..."
                    className="font-mono pl-9"
                  />
                </div>
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {isLoadingRepos ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : filteredRepos.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      {repoSearch ? 'No repositories found' : 'No repositories available'}
                    </div>
                  ) : (
                    filteredRepos.map(repo => (
                      <button
                        key={repo.id}
                        type="button"
                        onClick={() => handleSelectRepo(repo)}
                        className="w-full text-left p-3 rounded-md border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium">{repo.fullName}</span>
                          {repo.private && <Lock className="h-3 w-3 text-muted-foreground" />}
                        </div>
                        {repo.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {repo.description}
                          </p>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
