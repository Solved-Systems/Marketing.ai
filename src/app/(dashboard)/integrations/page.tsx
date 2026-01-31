'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plug, Github, Twitter, Youtube, Instagram, Linkedin, Check } from 'lucide-react'

const integrations = [
  {
    name: 'GitHub',
    description: 'Auto-generate content from releases and updates',
    icon: Github,
    connected: false,
    category: 'Source',
  },
  {
    name: 'YouTube',
    description: 'Publish videos directly to your channel',
    icon: Youtube,
    connected: false,
    category: 'Publishing',
  },
  {
    name: 'Twitter / X',
    description: 'Share posts and announcements',
    icon: Twitter,
    connected: false,
    category: 'Publishing',
  },
  {
    name: 'Instagram',
    description: 'Publish images and reels',
    icon: Instagram,
    connected: false,
    category: 'Publishing',
  },
  {
    name: 'LinkedIn',
    description: 'Share professional updates',
    icon: Linkedin,
    connected: false,
    category: 'Publishing',
  },
]

export default function IntegrationsPage() {
  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono mb-2">
          <span>$</span>
          <span className="text-primary">./integrations</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          Connect your accounts to automate content publishing
        </p>
      </div>

      {/* Source Integrations */}
      <div className="mb-6 md:mb-8">
        <h2 className="font-mono text-sm text-muted-foreground mb-4">source_integrations</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations
            .filter((i) => i.category === 'Source')
            .map((integration) => (
              <IntegrationCard key={integration.name} integration={integration} />
            ))}
        </div>
      </div>

      {/* Publishing Integrations */}
      <div>
        <h2 className="font-mono text-sm text-muted-foreground mb-4">publishing_integrations</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations
            .filter((i) => i.category === 'Publishing')
            .map((integration) => (
              <IntegrationCard key={integration.name} integration={integration} />
            ))}
        </div>
      </div>
    </div>
  )
}

function IntegrationCard({
  integration,
}: {
  integration: {
    name: string
    description: string
    icon: React.ComponentType<{ className?: string }>
    connected: boolean
  }
}) {
  const Icon = integration.icon

  return (
    <Card className="terminal-border bg-card/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-base">{integration.name}</CardTitle>
          </div>
          {integration.connected && (
            <Badge variant="outline" className="text-green-500 border-green-500/50">
              <Check className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">{integration.description}</p>
        <Button
          variant={integration.connected ? 'outline' : 'terminal'}
          size="sm"
          className="w-full font-mono"
        >
          {integration.connected ? 'Manage' : 'Connect'}
        </Button>
      </CardContent>
    </Card>
  )
}
