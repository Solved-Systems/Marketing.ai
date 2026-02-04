'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  FolderOpen,
  Video,
  Image as ImageIcon,
  MessageSquare,
  Loader2,
  Sparkles,
  Download,
  ExternalLink,
  Calendar,
} from 'lucide-react'

interface Brand {
  id: string
  name: string
  logo_url: string | null
  primary_color: string
}

interface ContentItem {
  id: string
  type: 'video' | 'image' | 'post'
  url?: string
  text?: string
  caption?: string
  brandId: string
  brandName: string
  createdAt: string
}

export default function ContentPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [selectedBrand, setSelectedBrand] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [content, setContent] = useState<ContentItem[]>([])

  useEffect(() => {
    async function fetchBrands() {
      try {
        const response = await fetch('/api/brands')
        if (response.ok) {
          const data = await response.json()
          setBrands(data)
        }
      } catch (error) {
        console.error('Error fetching brands:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchBrands()
  }, [])

  // For now, content is empty - this would be fetched from an API
  const filteredContent = selectedBrand === 'all'
    ? content
    : content.filter(c => c.brandId === selectedBrand)

  const videoCount = filteredContent.filter(c => c.type === 'video').length
  const imageCount = filteredContent.filter(c => c.type === 'image').length
  const postCount = filteredContent.filter(c => c.type === 'post').length

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono mb-2">
            <span>$</span>
            <span className="text-primary">./content</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">Content Library</h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            All your generated content in one place
          </p>
        </div>
        <Link href="/create">
          <Button variant="terminal">
            <Sparkles className="h-4 w-4" />
            Create New
          </Button>
        </Link>
      </div>

      {/* Brand Filter */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedBrand === 'all' ? 'terminal' : 'outline'}
            size="sm"
            onClick={() => setSelectedBrand('all')}
          >
            All Brands
          </Button>
          {brands.map((brand) => (
            <Button
              key={brand.id}
              variant={selectedBrand === brand.id ? 'terminal' : 'outline'}
              size="sm"
              onClick={() => setSelectedBrand(brand.id)}
              className="gap-2"
            >
              {brand.logo_url ? (
                <img
                  src={brand.logo_url}
                  alt=""
                  className="w-4 h-4 rounded object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              ) : (
                <div
                  className="w-4 h-4 rounded flex items-center justify-center text-[8px] text-white font-bold"
                  style={{ backgroundColor: brand.primary_color || '#ff8c00' }}
                >
                  {brand.name[0]}
                </div>
              )}
              {brand.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="terminal-border bg-card/50">
          <CardContent className="p-4 text-center">
            <Video className="h-6 w-6 text-blue-400 mx-auto mb-2" />
            <p className="text-2xl font-bold">{videoCount}</p>
            <p className="text-xs text-muted-foreground">Videos</p>
          </CardContent>
        </Card>
        <Card className="terminal-border bg-card/50">
          <CardContent className="p-4 text-center">
            <ImageIcon className="h-6 w-6 text-green-400 mx-auto mb-2" />
            <p className="text-2xl font-bold">{imageCount}</p>
            <p className="text-xs text-muted-foreground">Images</p>
          </CardContent>
        </Card>
        <Card className="terminal-border bg-card/50">
          <CardContent className="p-4 text-center">
            <MessageSquare className="h-6 w-6 text-purple-400 mx-auto mb-2" />
            <p className="text-2xl font-bold">{postCount}</p>
            <p className="text-xs text-muted-foreground">Posts</p>
          </CardContent>
        </Card>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="videos">Videos</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {isLoading ? (
            <Card className="terminal-border bg-card/50">
              <CardContent className="py-16 text-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading content...</p>
              </CardContent>
            </Card>
          ) : filteredContent.length === 0 ? (
            <Card className="terminal-border bg-card/50">
              <CardContent className="py-16 text-center">
                <FolderOpen className="h-16 w-16 text-muted-foreground/50 mx-auto mb-6" />
                <h2 className="text-xl font-semibold mb-2">No content yet</h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Start creating videos, images, and posts to see them here.
                </p>
                <Link href="/create">
                  <Button variant="terminal">
                    <Sparkles className="h-4 w-4" />
                    Create Content
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredContent.map((item) => (
                <ContentCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="videos">
          <ContentGrid items={filteredContent.filter(c => c.type === 'video')} type="video" />
        </TabsContent>

        <TabsContent value="images">
          <ContentGrid items={filteredContent.filter(c => c.type === 'image')} type="image" />
        </TabsContent>

        <TabsContent value="posts">
          <ContentGrid items={filteredContent.filter(c => c.type === 'post')} type="post" />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ContentCard({ item }: { item: ContentItem }) {
  const typeIcons = {
    video: Video,
    image: ImageIcon,
    post: MessageSquare,
  }
  const typeColors = {
    video: 'text-blue-400',
    image: 'text-green-400',
    post: 'text-purple-400',
  }
  const Icon = typeIcons[item.type]

  return (
    <Card className="terminal-border bg-card/50 overflow-hidden">
      {item.type === 'video' && item.url && (
        <video src={item.url} className="w-full aspect-video object-cover" />
      )}
      {item.type === 'image' && item.url && (
        <img src={item.url} alt="" className="w-full aspect-video object-cover" />
      )}
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className={`gap-1 ${typeColors[item.type]}`}>
            <Icon className="h-3 w-3" />
            {item.type}
          </Badge>
          <span className="text-xs text-muted-foreground">{item.brandName}</span>
        </div>
        {item.type === 'post' && item.text && (
          <p className="text-sm line-clamp-3">{item.text}</p>
        )}
        {item.caption && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{item.caption}</p>
        )}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(item.createdAt).toLocaleDateString()}
          </span>
          {item.url && (
            <a
              href={item.url}
              download
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Download className="h-3 w-3" />
              Download
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function ContentGrid({ items, type }: { items: ContentItem[]; type: string }) {
  if (items.length === 0) {
    const typeLabels = { video: 'videos', image: 'images', post: 'posts' }
    return (
      <Card className="terminal-border bg-card/50">
        <CardContent className="py-16 text-center">
          <FolderOpen className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">No {typeLabels[type as keyof typeof typeLabels]} yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => (
        <ContentCard key={item.id} item={item} />
      ))}
    </div>
  )
}
