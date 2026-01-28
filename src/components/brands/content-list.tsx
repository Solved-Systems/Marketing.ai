'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'
import { MoreVertical, Trash2, Edit, Video, Image as ImageIcon, FileText, Clock, CheckCircle, Send, Calendar } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import type { Tables } from '@/lib/database.types'

interface ContentListProps {
  content: Tables<'content_drafts'>[]
  brandId: string
}

const contentTypeIcons = {
  video: Video,
  image: ImageIcon,
  post: FileText,
}

const statusColors = {
  draft: 'bg-muted text-muted-foreground',
  approved: 'bg-blue-500/20 text-blue-500',
  scheduled: 'bg-yellow-500/20 text-yellow-500',
  published: 'bg-green-500/20 text-green-500',
}

const statusIcons = {
  draft: Edit,
  approved: CheckCircle,
  scheduled: Clock,
  published: Send,
}

export function ContentList({ content, brandId }: ContentListProps) {
  const [filter, setFilter] = useState<'all' | 'video' | 'image' | 'post'>('all')
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const filteredContent = filter === 'all'
    ? content
    : content.filter(c => c.content_type === filter)

  const handleDelete = async (contentId: string) => {
    if (!confirm('Are you sure you want to delete this content? This cannot be undone.')) {
      return
    }

    setIsDeleting(contentId)

    try {
      const { error } = await supabase
        .from('content_drafts')
        .delete()
        .eq('id', contentId)

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message,
        })
        return
      }

      toast({
        title: 'Content deleted',
        description: 'The content has been removed',
      })

      router.refresh()
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred',
      })
    } finally {
      setIsDeleting(null)
    }
  }

  const handleStatusChange = async (contentId: string, newStatus: 'draft' | 'approved' | 'scheduled' | 'published') => {
    try {
      const { error } = await supabase
        .from('content_drafts')
        .update({ status: newStatus })
        .eq('id', contentId)

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message,
        })
        return
      }

      toast({
        title: 'Status updated',
        description: `Content status changed to ${newStatus}`,
      })

      router.refresh()
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred',
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All
        </Button>
        <Button
          variant={filter === 'video' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('video')}
        >
          <Video className="mr-2 h-4 w-4" />
          Videos
        </Button>
        <Button
          variant={filter === 'image' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('image')}
        >
          <ImageIcon className="mr-2 h-4 w-4" />
          Images
        </Button>
        <Button
          variant={filter === 'post' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('post')}
        >
          <FileText className="mr-2 h-4 w-4" />
          Posts
        </Button>
      </div>

      {filteredContent.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredContent.map((item) => {
            const Icon = contentTypeIcons[item.content_type]
            const StatusIcon = statusIcons[item.status]
            const contentData = item.content as { preview_url?: string; text?: string; headline?: string } | null

            return (
              <Card key={item.id} className="hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <Icon className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base font-mono line-clamp-1">
                        {item.title || `Untitled ${item.content_type}`}
                      </CardTitle>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'approved')}>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Mark Approved
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'scheduled')}>
                          <Calendar className="mr-2 h-4 w-4" />
                          Schedule
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'published')}>
                          <Send className="mr-2 h-4 w-4" />
                          Mark Published
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(item.id)}
                          disabled={isDeleting === item.id}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={statusColors[item.status]}>
                      <StatusIcon className="mr-1 h-3 w-3" />
                      {item.status}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {item.content_type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {item.ai_prompt && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3 italic">
                      "{item.ai_prompt}"
                    </p>
                  )}
                  {contentData?.text && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {contentData.text}
                    </p>
                  )}
                  {contentData?.headline && (
                    <p className="text-sm font-medium line-clamp-1 mb-3">
                      {contentData.headline}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                    {item.scheduled_for ? (
                      <span className="flex items-center text-yellow-500">
                        <Clock className="mr-1 h-3 w-3" />
                        {format(new Date(item.scheduled_for), 'MMM d, HH:mm')}
                      </span>
                    ) : (
                      <span className="text-primary">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No {filter === 'all' ? 'content' : `${filter}s`} found
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
