'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from '@/hooks/use-toast'
import { Loader2, User, Building, Github, Linkedin, Twitter } from 'lucide-react'
import type { Tables } from '@/lib/database.types'

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [profile, setProfile] = useState<Tables<'users'> | null>(null)
  const [organization, setOrganization] = useState<Tables<'organizations'> | null>(null)
  const [fullName, setFullName] = useState('')
  const [orgName, setOrgName] = useState('')
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profileData } = await supabase
      .from('users')
      .select('*, organizations(*)')
      .eq('id', user.id)
      .single()

    if (profileData) {
      setProfile(profileData)
      setFullName(profileData.full_name || '')

      const org = profileData.organizations as Tables<'organizations'> | null
      if (org) {
        setOrganization(org)
        setOrgName(org.name)
      }
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await supabase
        .from('users')
        .update({ full_name: fullName })
        .eq('id', profile?.id)

      if (error) throw error

      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: (error as Error).message,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateOrganization = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await supabase
        .from('organizations')
        .update({ name: orgName })
        .eq('id', organization?.id)

      if (error) throw error

      toast({
        title: 'Organization updated',
        description: 'Your organization has been updated successfully',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: (error as Error).message,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || profile?.email?.[0].toUpperCase() || 'U'

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-muted-foreground font-mono mb-2">
          <span className="text-primary">$</span> nano /etc/config
        </div>
        <h2 className="text-2xl font-bold tracking-tight">
          <span className="text-primary">{'//'}</span> SETTINGS
        </h2>
        <p className="text-muted-foreground text-sm">
          Configure account and organization settings
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile" className="font-mono text-xs">./profile</TabsTrigger>
          <TabsTrigger value="organization" className="font-mono text-xs">./organization</TabsTrigger>
          <TabsTrigger value="integrations" className="font-mono text-xs">./integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-sm">USER_PROFILE</CardTitle>
              <CardDescription>
                <span className="text-primary">{'//'}</span> Update your personal information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <Button variant="outline" size="sm" disabled>
                      Change Avatar
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">
                      Avatar is synced from your OAuth provider
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={profile?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed
                  </p>
                </div>

                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-sm">ORG_CONFIG</CardTitle>
              <CardDescription>
                <span className="text-primary">{'//'}</span> Manage your organization settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateOrganization} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input
                    id="orgName"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="My Company"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plan">Current Plan</Label>
                  <div className="flex items-center space-x-2">
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium capitalize">
                      {organization?.plan_tier || 'free'}
                    </span>
                    <Button variant="link" size="sm" disabled>
                      Upgrade
                    </Button>
                  </div>
                </div>

                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-sm">GITHUB_CONNECT</CardTitle>
              <CardDescription>
                <span className="text-primary">{'//'}</span> Link GitHub for automatic feature videos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline">
                <Github className="mr-2 h-4 w-4" />
                Connect GitHub
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-sm">SOCIAL_ACCOUNTS</CardTitle>
              <CardDescription>
                <span className="text-primary">{'//'}</span> Connect social media for direct publishing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <Linkedin className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">LinkedIn</p>
                    <p className="text-sm text-muted-foreground">Not connected</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Connect</Button>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-sky-100">
                    <Twitter className="h-5 w-5 text-sky-500" />
                  </div>
                  <div>
                    <p className="font-medium">X (Twitter)</p>
                    <p className="text-sm text-muted-foreground">Not connected</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Connect</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
