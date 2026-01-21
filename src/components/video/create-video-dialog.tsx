'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Plus, Loader2, Video } from 'lucide-react'
import type { Tables } from '@/lib/database.types'

interface CreateVideoDialogProps {
  projectId: string
  templates: Tables<'video_templates'>[]
  assets: Tables<'assets'>[]
}

export function CreateVideoDialog({ projectId, templates, assets }: CreateVideoDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [title, setTitle] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const handleCreate = async () => {
    if (!selectedTemplate) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select a template',
      })
      return
    }

    setIsCreating(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const template = templates.find((t) => t.id === selectedTemplate)
      if (!template) throw new Error('Template not found')

      // Create basic input props based on template schema
      const inputProps = {
        title: title || 'Untitled Video',
        brandColors: {
          primary: '#7c3aed',
          secondary: '#1e293b',
          background: '#ffffff',
        },
      }

      const { data: videoJob, error } = await supabase
        .from('video_jobs')
        .insert({
          project_id: projectId,
          template_id: selectedTemplate,
          status: 'pending',
          input_props: inputProps,
          created_by: user.id,
        })
        .select()
        .single()

      if (error) throw error

      toast({
        title: 'Video job created',
        description: 'Your video is being queued for rendering',
      })

      setOpen(false)
      setSelectedTemplate('')
      setTitle('')
      router.refresh()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: (error as Error).message,
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Video
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Video</DialogTitle>
          <DialogDescription>
            Choose a template and configure your video settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Video Title</Label>
            <Input
              id="title"
              placeholder="My Awesome Video"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template">Template</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex items-center">
                      <Video className="mr-2 h-4 w-4" />
                      <span>{template.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTemplate && (
              <p className="text-xs text-muted-foreground">
                {templates.find((t) => t.id === selectedTemplate)?.description}
              </p>
            )}
          </div>

          {selectedTemplate && (
            <div className="rounded-lg border p-4 bg-muted/50">
              <h4 className="text-sm font-medium mb-2">Template Details</h4>
              {(() => {
                const template = templates.find((t) => t.id === selectedTemplate)
                if (!template) return null
                return (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Duration: {Math.round(template.duration_frames / template.fps)}s</p>
                    <p>Resolution: {template.width}x{template.height}</p>
                    <p>FPS: {template.fps}</p>
                  </div>
                )
              })()}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating || !selectedTemplate}>
            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Video
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
