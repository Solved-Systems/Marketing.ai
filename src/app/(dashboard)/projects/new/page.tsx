'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Loader2, ArrowLeft, BookOpen, Building2, Package } from 'lucide-react'
import Link from 'next/link'
import type { Tables } from '@/lib/database.types'

type StyleGuide = Tables<'style_guides'> & {
  products?: { name: string } | null
}

export default function NewProjectPage() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [styleGuideId, setStyleGuideId] = useState<string>('')
  const [styleGuides, setStyleGuides] = useState<StyleGuide[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingGuides, setIsLoadingGuides] = useState(true)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  // Fetch style guides on mount
  useEffect(() => {
    async function fetchStyleGuides() {
      const { data } = await supabase
        .from('style_guides')
        .select(`
          *,
          products(name)
        `)
        .order('product_id', { ascending: true, nullsFirst: true })
        .order('is_default', { ascending: false })
        .order('name')

      if (data) {
        setStyleGuides(data)
        // Auto-select the default company guide
        const defaultGuide = data.find(g => !g.product_id && g.is_default)
        if (defaultGuide) {
          setStyleGuideId(defaultGuide.id)
        }
      }
      setIsLoadingGuides(false)
    }
    fetchStyleGuides()
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Get current user's organization
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'You must be logged in to create a project',
        })
        return
      }

      const { data: profile } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (!profile?.organization_id) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'You must belong to an organization to create a project',
        })
        return
      }

      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          name,
          description: description || null,
          organization_id: profile.organization_id,
          created_by: user.id,
          brand_config: {},
          style_guide_id: styleGuideId || null,
        })
        .select()
        .single()

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message,
        })
        return
      }

      toast({
        title: 'Project created',
        description: 'Your project has been created successfully',
      })

      router.push(`/projects/${project.id}`)
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/projects">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <div className="text-sm text-muted-foreground font-mono mb-1">
            <span className="text-primary">$</span> mkdir ./projects/new
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            <span className="text-primary">{'//'}</span> NEW_PROJECT
          </h2>
          <p className="text-muted-foreground text-sm">
            Initialize a new video project
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="font-mono text-sm">PROJECT_CONFIG</CardTitle>
          <CardDescription>
            <span className="text-primary">{'//'}</span> Enter project details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                placeholder="My Awesome Video Project"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                placeholder="A brief description of your project"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="styleGuide">
                <span className="flex items-center space-x-2">
                  <BookOpen className="h-4 w-4" />
                  <span>Style Guide (optional)</span>
                </span>
              </Label>
              <Select
                value={styleGuideId}
                onValueChange={setStyleGuideId}
                disabled={isLoadingGuides}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingGuides ? "Loading..." : "Select a style guide"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">
                    <span className="text-muted-foreground">No style guide</span>
                  </SelectItem>
                  {styleGuides.filter(g => !g.product_id).length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Company Guides
                      </div>
                      {styleGuides.filter(g => !g.product_id).map(guide => (
                        <SelectItem key={guide.id} value={guide.id}>
                          <span className="flex items-center space-x-2">
                            <Building2 className="h-4 w-4 text-primary" />
                            <span>{guide.name}</span>
                            {guide.is_default && (
                              <span className="text-xs text-primary">(default)</span>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {styleGuides.filter(g => g.product_id).length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Product Guides
                      </div>
                      {styleGuides.filter(g => g.product_id).map(guide => (
                        <SelectItem key={guide.id} value={guide.id}>
                          <span className="flex items-center space-x-2">
                            <Package className="h-4 w-4 text-primary" />
                            <span>{guide.name}</span>
                            {guide.products && (
                              <span className="text-xs text-muted-foreground">
                                ({guide.products.name})
                              </span>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Style guides provide brand context for AI-generated content.{' '}
                <Link href="/style-guides/new" className="text-primary hover:underline">
                  Create one
                </Link>
              </p>
            </div>

            <div className="flex justify-end space-x-4">
              <Button variant="outline" type="button" asChild>
                <Link href="/projects">./cancel</Link>
              </Button>
              <Button variant="terminal" type="submit" disabled={isLoading || !name.trim()}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                INITIALIZE
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
