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
import { ArrowLeft, Video, Loader2, Sparkles, Play } from 'lucide-react'

interface VideoFormData {
  title: string
  description: string
  template: string
  duration: string
  style: string
  callToAction: string
  features: string
}

const formFields = [
  { name: 'title', label: 'Video Title', type: 'text' as const, description: 'The main title for your video' },
  { name: 'description', label: 'Description', type: 'textarea' as const, description: 'What is this video about?' },
  { name: 'template', label: 'Template', type: 'select' as const, options: ['Feature Announcement', 'Product Demo', 'Social Teaser', 'Release Notes'], description: 'Video template style' },
  { name: 'duration', label: 'Duration', type: 'select' as const, options: ['15 seconds', '30 seconds', '60 seconds'], description: 'Target video length' },
  { name: 'style', label: 'Visual Style', type: 'select' as const, options: ['Modern', 'Minimal', 'Bold', 'Playful'], description: 'Visual aesthetic' },
  { name: 'callToAction', label: 'Call to Action', type: 'text' as const, description: 'What should viewers do?' },
  { name: 'features', label: 'Key Features', type: 'textarea' as const, description: 'List of features to highlight' },
]

const templates = [
  { value: 'feature', label: 'Feature Announcement', description: 'Highlight new features or updates' },
  { value: 'product', label: 'Product Demo', description: 'Showcase your product in action' },
  { value: 'social', label: 'Social Teaser', description: 'Short engaging content for social media' },
  { value: 'release', label: 'Release Notes', description: 'Announce version updates' },
]

export default function CreateVideoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [isGenerating, setIsGenerating] = useState(false)
  const [formData, setFormData] = useState<VideoFormData>({
    title: '',
    description: '',
    template: '',
    duration: '30 seconds',
    style: 'Modern',
    callToAction: '',
    features: '',
  })

  const handleFieldUpdate = (fieldName: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value,
    }))
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      // TODO: Call AI generation API
      console.log('Generating video:', formData)
      await new Promise(resolve => setTimeout(resolve, 2000))
    } catch (error) {
      console.error('Error generating video:', error)
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
          <span className="text-primary">./brands/{id}/create/video</span>
        </div>
        <h1 className="text-3xl font-bold">Create AI Video</h1>
        <p className="text-muted-foreground mt-2">
          Generate a marketing video with AI
        </p>
      </div>

      <div className="space-y-6">
        {/* Template Selection */}
        <Card className="terminal-border bg-card/50">
          <CardHeader>
            <CardTitle className="font-mono text-sm flex items-center gap-2">
              <Video className="h-4 w-4 text-primary" />
              select_template
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {templates.map((template) => (
                <button
                  key={template.value}
                  type="button"
                  onClick={() => handleFieldUpdate('template', template.value)}
                  className={`p-4 rounded text-left terminal-border transition-all ${
                    formData.template === template.value
                      ? 'bg-primary/20 border-primary'
                      : 'bg-card/30 hover:bg-card/50'
                  }`}
                >
                  <p className="font-semibold">{template.label}</p>
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Video Details */}
        <Card className="terminal-border bg-card/50">
          <CardHeader>
            <CardTitle className="font-mono text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              video_config
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="font-mono text-sm">
                title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleFieldUpdate('title', e.target.value)}
                placeholder="Enter video title"
                className="font-mono"
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
                placeholder="Describe what this video should communicate..."
                className="font-mono min-h-[100px]"
              />
            </div>

            {/* Duration & Style */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-mono text-sm">duration</Label>
                <Select
                  value={formData.duration}
                  onValueChange={(value) => handleFieldUpdate('duration', value)}
                >
                  <SelectTrigger className="font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15 seconds">15 seconds</SelectItem>
                    <SelectItem value="30 seconds">30 seconds</SelectItem>
                    <SelectItem value="60 seconds">60 seconds</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-sm">style</Label>
                <Select
                  value={formData.style}
                  onValueChange={(value) => handleFieldUpdate('style', value)}
                >
                  <SelectTrigger className="font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Modern">Modern</SelectItem>
                    <SelectItem value="Minimal">Minimal</SelectItem>
                    <SelectItem value="Bold">Bold</SelectItem>
                    <SelectItem value="Playful">Playful</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-2">
              <Label htmlFor="features" className="font-mono text-sm">
                key_features
              </Label>
              <Textarea
                id="features"
                value={formData.features}
                onChange={(e) => handleFieldUpdate('features', e.target.value)}
                placeholder="List the key features to highlight (one per line)..."
                className="font-mono min-h-[100px]"
              />
            </div>

            {/* Call to Action */}
            <div className="space-y-2">
              <Label htmlFor="callToAction" className="font-mono text-sm">
                call_to_action
              </Label>
              <Input
                id="callToAction"
                value={formData.callToAction}
                onChange={(e) => handleFieldUpdate('callToAction', e.target.value)}
                placeholder="e.g., Try it free, Learn more, Get started"
                className="font-mono"
              />
            </div>

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
                disabled={isGenerating || !formData.title || !formData.template}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Generate Video
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Chat Assistant */}
      <AIChatAssistant
        formFields={formFields}
        onFieldUpdate={handleFieldUpdate}
        context="This is a video creation form for AI-generated marketing videos. Help the user describe their video concept, choose a template, and fill in the details. The video will be generated with the brand's colors and style automatically applied."
        placeholder="Describe the video you want to create..."
      />
    </div>
  )
}
