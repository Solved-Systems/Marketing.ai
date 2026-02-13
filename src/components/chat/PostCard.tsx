'use client'

import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Copy, Check, Calendar, Pencil, Download, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'

interface PostCardProps {
  content: string
  imageUrls?: string[]
  onEdit?: (nextPrompt: string) => void
}

interface ParsedPost {
  title: string
  platform?: string
  visual?: string
  copy: string
  whyThisWorks?: string
  assets?: Array<{ label: string; url: string }>
}

function extractSection(content: string, heading: string) {
  const regex = new RegExp(`(?:^|\\n)#{2,3}\\s*${heading}\\s*\\n([\\s\\S]*?)(?=\\n#{2,3}\\s|$)`, 'i')
  const match = content.match(regex)
  return match?.[1]?.trim()
}

function extractField(content: string, field: string) {
  const regex = new RegExp(`(?:\\*\\*)?${field}(?:\\*\\*)?\\s*:\\s*(.+)`, 'i')
  return content.match(regex)?.[1]?.trim()
}

function cleanInlineValue(value: string) {
  return value.replace(/^\*+|\*+$/g, '').replace(/`/g, '').trim()
}

function parseAssetOptions(content: string) {
  const assets: Array<{ label: string; url: string }> = []
  const withLabelRegex = /-\s*([^:\n]+):\s*(https?:\/\/\S+)/gi
  let match: RegExpExecArray | null

  while ((match = withLabelRegex.exec(content)) !== null) {
    assets.push({
      label: cleanInlineValue(match[1] || 'Asset'),
      url: (match[2] || '').trim(),
    })
  }

  if (assets.length === 0) {
    const rawUrlRegex = /(https?:\/\/\S+)/gi
    while ((match = rawUrlRegex.exec(content)) !== null) {
      assets.push({
        label: 'Asset',
        url: (match[1] || '').trim(),
      })
    }
  }

  return assets.filter((asset, index, all) => asset.url && all.findIndex((item) => item.url === asset.url) === index)
}

export function parseMarketingPost(content: string): ParsedPost | null {
  if (!/marketing post/i.test(content)) return null

  const titleMatch =
    content.match(/(?:^|\n)#{2,3}\s*(.+marketing post[^\n]*)/i) ||
    content.match(/(?:^|\n)#{2,3}\s*([^\n]+)/)
  const title = titleMatch?.[1]?.trim()

  const platformRaw = extractField(content, 'Platform') || extractField(content, 'Channel')
  const visualRaw = extractField(content, 'Visual')
  const whyThisWorksRaw = extractSection(content, 'Why This Post Works')
  const assets = parseAssetOptions(content)

  const codeCopyMatch = content.match(/```(?:\w+)?\n([\s\S]*?)```/)
  const inlineCopyField = extractField(content, 'Copy')
  const copy = (codeCopyMatch?.[1] || inlineCopyField || '').trim()

  const whyThisWorks = whyThisWorksRaw
    ?.split('\n')
    .filter((line) => !/https?:\/\//i.test(line) && !/asset options/i.test(line))
    .join('\n')
    .trim()

  if (!title || !copy) return null

  return {
    title,
    platform: platformRaw ? cleanInlineValue(platformRaw) : undefined,
    visual: visualRaw ? cleanInlineValue(visualRaw) : undefined,
    copy,
    whyThisWorks: whyThisWorks || undefined,
    assets,
  }
}

export function PostCard({ content, imageUrls = [], onEdit }: PostCardProps) {
  const parsed = useMemo(() => parseMarketingPost(content), [content])
  const [copied, setCopied] = useState(false)
  const [showWhy, setShowWhy] = useState(false)
  const [selectedImage, setSelectedImage] = useState(0)

  if (!parsed) return null

  const heroImage = imageUrls[selectedImage]

  const handleCopy = async () => {
    await navigator.clipboard.writeText(parsed.copy)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="overflow-hidden rounded-lg border border-primary/30 bg-card">
      <div className="border-b border-border/60 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{parsed.title}</h3>
          {parsed.platform && (
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-[10px] text-primary">
              {parsed.platform}
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-3 px-4 py-3">
        {heroImage && (
          <div className="space-y-2">
            <div className="overflow-hidden rounded-md border border-border bg-muted">
              <img src={heroImage} alt="Post visual option" className="aspect-[16/10] w-full object-cover" loading="lazy" />
            </div>
            {imageUrls.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {imageUrls.map((url, index) => (
                  <button
                    key={url}
                    onClick={() => setSelectedImage(index)}
                    className={`h-14 w-20 shrink-0 overflow-hidden rounded border ${
                      selectedImage === index ? 'border-primary ring-1 ring-primary/40' : 'border-border'
                    }`}
                    title={`Image option ${index + 1}`}
                  >
                    <img src={url} alt={`Image option ${index + 1}`} className="h-full w-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {parsed.visual && (
          <div className="rounded-md border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Visual: </span>
            {parsed.visual}
          </div>
        )}

        <div className="rounded-md border border-border/70 bg-background/80 p-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{parsed.copy}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <a href="/calendar">
            <Button variant="outline" size="sm" className="text-xs">
              <Calendar className="h-3.5 w-3.5" />
              Schedule
            </Button>
          </a>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => onEdit?.(`Please refine this marketing post copy:\n\n${parsed.copy}`)}
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button variant="outline" size="sm" className="text-xs" onClick={handleCopy}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy text'}
          </Button>
          {heroImage && (
            <>
              <a href={heroImage} download>
                <Button variant="outline" size="sm" className="text-xs">
                  <Download className="h-3.5 w-3.5" />
                  Download image
                </Button>
              </a>
              <a href={heroImage} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="text-xs">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open image
                </Button>
              </a>
            </>
          )}
        </div>

        {parsed.assets && parsed.assets.length > 0 && (
          <div className="space-y-1">
            <p className="text-[11px] font-medium text-muted-foreground">Assets</p>
            <div className="space-y-1">
              {parsed.assets.map((asset) => (
                <a
                  key={asset.url}
                  href={asset.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded border border-border/60 bg-muted/20 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/40"
                >
                  <span className="truncate">{asset.label}</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}

        {parsed.whyThisWorks && (
          <div className="rounded-md border border-border/60 bg-muted/20">
            <button
              onClick={() => setShowWhy((value) => !value)}
              className="flex w-full items-center justify-between px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <span>Why this post works</span>
              {showWhy ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {showWhy && (
              <div className="border-t border-border/60 px-3 py-2 text-xs text-muted-foreground whitespace-pre-wrap">
                {parsed.whyThisWorks}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
