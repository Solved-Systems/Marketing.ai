'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AIChatAssistant } from '@/components/ui/ai-chat-assistant'
import {
  ArrowLeft,
  MessageSquare,
  Loader2,
  Sparkles,
  Send,
  Calendar,
  Linkedin,
  Twitter,
  Instagram,
  Hash,
  Smile,
  Link2,
} from 'lucide-react'

interface PostFormData {
  topic: string
  tone: string
  platforms: string[]
  includeHashtags: boolean
  includeEmoji: boolean
  includeCTA: boolean
  ctaLink: string
}

const formFields = [
  { name: 'topic', label: 'Post Topic', type: 'textarea' as const, description: 'What is this post about?' },
  { name: 'tone', label: 'Tone', type: 'select' as const, options: ['Professional', 'Casual', 'Exciting', 'Educational', 'Inspirational'], description: 'Voice and style' },
  { name: 'platforms', label: 'Platforms', type: 'array' as const, options: ['LinkedIn', 'Twitter', 'Instagram'], description: 'Target social platforms' },
  { name: 'ctaLink', label: 'CTA Link', type: 'text' as const, description: 'Link to include in the post' },
]

const platforms = [
  { value: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'text-blue-500' },
  { value: 'twitter', label: 'Twitter/X', icon: Twitter, color: 'text-sky-400' },
  { value: 'instagram', label: 'Instagram', icon: Instagram, color: 'text-pink-500' },
]

export default function CreatePostPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedPosts, setGeneratedPosts] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState<PostFormData>({
    topic: '',
    tone: 'Professional',
    platforms: ['linkedin'],
    includeHashtags: true,
    includeEmoji: true,
    includeCTA: true,
    ctaLink: '',
  })

  const handleFieldUpdate = (fieldName: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value,
    }))
  }

  const togglePlatform = (platform: string) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform],
    }))
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      // TODO: Call AI post generation API
      console.log('Generating posts:', formData)
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Mock generated posts
      const posts: Record<string, string> = {}
      if (formData.platforms.includes('linkedin')) {
        posts.linkedin = `🚀 Exciting news from our team!\n\n${formData.topic || 'We have something amazing to share with you.'}\n\nThis is a significant milestone that demonstrates our commitment to innovation and excellence.\n\n${formData.includeCTA && formData.ctaLink ? `Learn more: ${formData.ctaLink}` : ''}\n\n${formData.includeHashtags ? '#Innovation #Technology #Growth' : ''}`
      }
      if (formData.platforms.includes('twitter')) {
        posts.twitter = `${formData.includeEmoji ? '🚀 ' : ''}${formData.topic || 'Big news!'}\n\n${formData.includeCTA && formData.ctaLink ? formData.ctaLink : ''}\n\n${formData.includeHashtags ? '#Tech #Innovation' : ''}`
      }
      if (formData.platforms.includes('instagram')) {
        posts.instagram = `${formData.topic || 'Something exciting is coming!'} ✨\n\n${formData.includeEmoji ? '👇 ' : ''}Check the link in bio!\n\n${formData.includeHashtags ? '#innovation #tech #startup #growth #business' : ''}`
      }
      setGeneratedPosts(posts)
    } catch (error) {
      console.error('Error generating posts:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/brands/${id}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Brand
        </Link>
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono mb-2">
          <span>$</span>
          <span className="text-primary">./brands/{id}/create/post</span>
        </div>
        <h1 className="text-3xl font-bold">Write AI Post</h1>
        <p className="text-muted-foreground mt-2">
          Generate social media posts with AI
        </p>
      </div>

      <div className="space-y-6">
        {/* Platform Selection */}
        <Card className="terminal-border bg-card/50">
          <CardHeader>
            <CardTitle className="font-mono text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              select_platforms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {platforms.map((platform) => {
                const Icon = platform.icon
                const isSelected = formData.platforms.includes(platform.value)
                return (
                  <button
                    key={platform.value}
                    type="button"
                    onClick={() => togglePlatform(platform.value)}
                    className={`flex items-center gap-2 px-4 py-2 rounded terminal-border transition-all ${
                      isSelected
                        ? 'bg-primary/20 border-primary'
                        : 'bg-card/30 hover:bg-card/50'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isSelected ? platform.color : 'text-muted-foreground'}`} />
                    <span>{platform.label}</span>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Post Details */}
        <Card className="terminal-border bg-card/50">
          <CardHeader>
            <CardTitle className="font-mono text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              post_config
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Topic */}
            <div className="space-y-2">
              <Label htmlFor="topic" className="font-mono text-sm">
                topic <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="topic"
                value={formData.topic}
                onChange={(e) => handleFieldUpdate('topic', e.target.value)}
                placeholder="What do you want to post about? e.g., 'Announce our new AI-powered feature that helps users save time'"
                className="font-mono min-h-[100px]"
              />
            </div>

            {/* Tone */}
            <div className="space-y-2">
              <Label className="font-mono text-sm">tone</Label>
              <Select
                value={formData.tone}
                onValueChange={(value) => handleFieldUpdate('tone', value)}
              >
                <SelectTrigger className="font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Professional">Professional</SelectItem>
                  <SelectItem value="Casual">Casual</SelectItem>
                  <SelectItem value="Exciting">Exciting</SelectItem>
                  <SelectItem value="Educational">Educational</SelectItem>
                  <SelectItem value="Inspirational">Inspirational</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Options */}
            <div className="space-y-2">
              <Label className="font-mono text-sm">options</Label>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleFieldUpdate('includeHashtags', !formData.includeHashtags)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm terminal-border transition-all ${
                    formData.includeHashtags
                      ? 'bg-primary/20 border-primary'
                      : 'bg-card/30'
                  }`}
                >
                  <Hash className="h-3 w-3" />
                  Hashtags
                </button>
                <button
                  type="button"
                  onClick={() => handleFieldUpdate('includeEmoji', !formData.includeEmoji)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm terminal-border transition-all ${
                    formData.includeEmoji
                      ? 'bg-primary/20 border-primary'
                      : 'bg-card/30'
                  }`}
                >
                  <Smile className="h-3 w-3" />
                  Emoji
                </button>
                <button
                  type="button"
                  onClick={() => handleFieldUpdate('includeCTA', !formData.includeCTA)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm terminal-border transition-all ${
                    formData.includeCTA
                      ? 'bg-primary/20 border-primary'
                      : 'bg-card/30'
                  }`}
                >
                  <Link2 className="h-3 w-3" />
                  CTA
                </button>
              </div>
            </div>

            {/* CTA Link */}
            {formData.includeCTA && (
              <div className="space-y-2">
                <Label htmlFor="ctaLink" className="font-mono text-sm">
                  cta_link
                </Label>
                <Input
                  id="ctaLink"
                  type="url"
                  value={formData.ctaLink}
                  onChange={(e) => handleFieldUpdate('ctaLink', e.target.value)}
                  placeholder="https://yourbrand.com/landing-page"
                  className="font-mono"
                />
              </div>
            )}

            {/* Generate Button */}
            <div className="flex items-center justify-end gap-4 pt-4 border-t border-border/50">
              <Link href={`/brands/${id}`}>
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </Link>
              <Button
                onClick={handleGenerate}
                variant="terminal"
                disabled={isGenerating || !formData.topic || formData.platforms.length === 0}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Posts
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Generated Posts */}
        {Object.keys(generatedPosts).length > 0 && (
          <Card className="terminal-border bg-card/50">
            <CardHeader>
              <CardTitle className="font-mono text-sm">generated_posts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(generatedPosts).map(([platform, content]) => {
                const platformInfo = platforms.find(p => p.value === platform)
                const Icon = platformInfo?.icon || MessageSquare
                return (
                  <div key={platform} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${platformInfo?.color || ''}`} />
                      <span className="font-semibold">{platformInfo?.label}</span>
                      <span className="text-xs text-muted-foreground">
                        ({content.length} chars)
                      </span>
                    </div>
                    <div className="p-4 rounded terminal-border bg-card/30">
                      <p className="whitespace-pre-wrap text-sm">{content}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="terminal" size="sm">
                        <Send className="h-3 w-3" />
                        Post Now
                      </Button>
                      <Button variant="outline" size="sm">
                        <Calendar className="h-3 w-3" />
                        Schedule
                      </Button>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}
      </div>

      {/* AI Chat Assistant */}
      <AIChatAssistant
        formFields={formFields}
        onFieldUpdate={handleFieldUpdate}
        context="This is a social media post generator. Help the user describe what they want to post about, choose the right tone and platforms, and craft engaging content. Posts will be optimized for each selected platform."
        placeholder="Tell me what you want to post about..."
      />
    </div>
  )
}
