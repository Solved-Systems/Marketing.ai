import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Github, Linkedin, Twitter, Instagram, Plug, Check, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const integrations = [
  {
    id: 'github',
    name: 'GitHub',
    description: 'Automatically generate content from repository events',
    icon: Github,
    href: '/integrations/github',
    category: 'Development',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Publish posts and videos to LinkedIn',
    icon: Linkedin,
    href: '/dashboard/social',
    category: 'Social',
  },
  {
    id: 'twitter',
    name: 'Twitter / X',
    description: 'Share content on Twitter',
    icon: Twitter,
    href: '/dashboard/social',
    category: 'Social',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    description: 'Publish to Instagram',
    icon: Instagram,
    href: '/dashboard/social',
    category: 'Social',
  },
]

export default async function IntegrationsPage() {
  const supabase = await createClient()

  // Get connected integrations
  const { data: githubConnections } = await supabase
    .from('github_connections')
    .select('*')
    .eq('is_active', true)

  const { data: socialAccounts } = await supabase
    .from('social_accounts')
    .select('*')
    .eq('is_active', true)

  const connectedIntegrations = new Set<string>()
  if (githubConnections?.length) connectedIntegrations.add('github')
  socialAccounts?.forEach(acc => connectedIntegrations.add(acc.platform))

  const groupedIntegrations = integrations.reduce((acc, integration) => {
    if (!acc[integration.category]) {
      acc[integration.category] = []
    }
    acc[integration.category].push(integration)
    return acc
  }, {} as Record<string, typeof integrations>)

  return (
    <div className="space-y-8">
      <div>
        <div className="text-sm text-muted-foreground font-mono mb-2">
          <span className="text-primary">$</span> ls -la ./integrations
        </div>
        <h2 className="text-2xl font-bold tracking-tight">
          <span className="text-primary">{'//'}</span> INTEGRATIONS
        </h2>
        <p className="text-muted-foreground text-sm">
          Connect external services to automate your workflow
        </p>
      </div>

      {Object.entries(groupedIntegrations).map(([category, categoryIntegrations]) => (
        <div key={category} className="space-y-4">
          <h3 className="text-lg font-semibold font-mono">
            <span className="text-primary">{'//'}</span> {category.toUpperCase()}
          </h3>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categoryIntegrations.map((integration) => {
              const isConnected = connectedIntegrations.has(integration.id)
              const Icon = integration.icon

              return (
                <Card
                  key={integration.id}
                  className={`hover:border-primary/50 transition-colors ${isConnected ? 'border-green-500/50' : ''}`}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-md ${isConnected ? 'bg-green-500/20' : 'bg-primary/10'}`}>
                          <Icon className={`h-5 w-5 ${isConnected ? 'text-green-500' : 'text-primary'}`} />
                        </div>
                        <div>
                          <CardTitle className="text-base font-mono">{integration.name}</CardTitle>
                        </div>
                      </div>
                      {isConnected && (
                        <Badge className="bg-green-500/20 text-green-500">
                          <Check className="mr-1 h-3 w-3" />
                          Connected
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-xs">
                      {integration.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant={isConnected ? 'outline' : 'terminal'} className="w-full" asChild>
                      <Link href={integration.href}>
                        {isConnected ? 'Manage' : 'Connect'}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
