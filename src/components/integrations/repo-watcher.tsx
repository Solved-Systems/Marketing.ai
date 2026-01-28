'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useToast } from '@/hooks/use-toast'
import { Loader2, Plus, GitBranch } from 'lucide-react'

interface RepoWatcherProps {
  connectionId: string
  brands: { id: string; name: string }[]
}

const EVENTS = [
  { value: 'release', label: 'Releases', description: 'New version tags' },
  { value: 'push', label: 'Major Pushes', description: 'Commits to main branch' },
  { value: 'pull_request', label: 'Pull Requests', description: 'Merged PRs' },
]

const CONTENT_TYPES = [
  { value: 'video', label: 'Video' },
  { value: 'post', label: 'Post' },
]

export function RepoWatcher({ connectionId, brands }: RepoWatcherProps) {
  const [open, setOpen] = useState(false)
  const [repoFullName, setRepoFullName] = useState('')
  const [brandId, setBrandId] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['release'])
  const [autoGenerate, setAutoGenerate] = useState<string[]>(['video', 'post'])
  const [autoPublish, setAutoPublish] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const toggleEvent = (event: string) => {
    setSelectedEvents(prev =>
      prev.includes(event)
        ? prev.filter(e => e !== event)
        : [...prev, event]
    )
  }

  const toggleContentType = (type: string) => {
    setAutoGenerate(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }

  const handleSubmit = async () => {
    if (!repoFullName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter a repository name',
      })
      return
    }

    if (!brandId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select a brand',
      })
      return
    }

    if (selectedEvents.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select at least one event to watch',
      })
      return
    }

    setIsLoading(true)

    try {
      // Get a project to associate with (create one if needed)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Not authenticated')
      }

      const { data: profile } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (!profile?.organization_id) {
        throw new Error('Organization not found')
      }

      // Find or create a project for GitHub integrations
      let { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('organization_id', profile.organization_id)
        .eq('name', 'GitHub Integrations')
        .single()

      if (!project) {
        const { data: newProject, error: projectError } = await supabase
          .from('projects')
          .insert({
            organization_id: profile.organization_id,
            name: 'GitHub Integrations',
            description: 'Auto-generated content from GitHub events',
            created_by: user.id,
          })
          .select('id')
          .single()

        if (projectError) throw projectError
        project = newProject
      }

      // Extract repo info (basic parsing - in production, validate against GitHub API)
      const repoParts = repoFullName.split('/')
      if (repoParts.length !== 2) {
        throw new Error('Invalid repository format. Use owner/repo')
      }

      const { error } = await supabase
        .from('watched_repositories')
        .insert({
          github_connection_id: connectionId,
          project_id: project.id,
          brand_id: brandId,
          repo_full_name: repoFullName,
          repo_id: Date.now(), // In production, get from GitHub API
          default_branch: 'main',
          watch_config: {
            events: selectedEvents,
            auto_generate: autoGenerate,
            auto_publish: autoPublish,
          },
          is_active: true,
        })

      if (error) throw error

      toast({
        title: 'Repository added',
        description: `Now watching ${repoFullName} for ${selectedEvents.join(', ')}`,
      })

      setOpen(false)
      setRepoFullName('')
      setBrandId('')
      setSelectedEvents(['release'])
      setAutoGenerate(['video', 'post'])
      setAutoPublish(false)
      router.refresh()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add repository',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="terminal">
          <Plus className="mr-2 h-4 w-4" />
          Add Repository
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-mono flex items-center">
            <GitBranch className="mr-2 h-5 w-5" />
            ADD_REPOSITORY
          </DialogTitle>
          <DialogDescription>
            <span className="text-primary">{'//'}</span> Configure a repository to watch for events
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="repo">Repository (owner/repo) *</Label>
            <Input
              id="repo"
              placeholder="mrktcmd/app"
              value={repoFullName}
              onChange={(e) => setRepoFullName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand">Link to Brand *</Label>
            <Select value={brandId} onValueChange={setBrandId}>
              <SelectTrigger id="brand">
                <SelectValue placeholder="Select a brand" />
              </SelectTrigger>
              <SelectContent>
                {brands.map((brand) => (
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Generated content will use this brand's settings
            </p>
          </div>

          <div className="space-y-2">
            <Label>Events to Watch</Label>
            <div className="flex flex-wrap gap-2">
              {EVENTS.map((event) => (
                <Button
                  key={event.value}
                  type="button"
                  variant={selectedEvents.includes(event.value) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleEvent(event.value)}
                >
                  {event.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Auto-generate</Label>
            <div className="flex flex-wrap gap-2">
              {CONTENT_TYPES.map((type) => (
                <Button
                  key={type.value}
                  type="button"
                  variant={autoGenerate.includes(type.value) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleContentType(type.value)}
                >
                  {type.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="autoPublish"
              checked={autoPublish}
              onChange={(e) => setAutoPublish(e.target.checked)}
              className="rounded border-border"
            />
            <Label htmlFor="autoPublish" className="text-sm">
              Auto-publish generated content
            </Label>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="terminal"
            onClick={handleSubmit}
            disabled={isLoading || !repoFullName.trim() || !brandId || selectedEvents.length === 0}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            ADD REPOSITORY
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
