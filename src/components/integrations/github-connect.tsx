'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Github, ExternalLink, Loader2 } from 'lucide-react'

export function GitHubConnect() {
  const [isConnecting, setIsConnecting] = useState(false)

  const handleConnect = () => {
    setIsConnecting(true)
    // Redirect to GitHub App installation
    // You'll need to create a GitHub App and set the GITHUB_APP_CLIENT_ID env var
    const clientId = process.env.NEXT_PUBLIC_GITHUB_APP_CLIENT_ID
    const redirectUri = `${window.location.origin}/api/auth/github/callback`
    const scope = 'repo,read:user'

    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}`

    window.location.href = githubAuthUrl
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-sm flex items-center">
          <Github className="mr-2 h-4 w-4" />
          CONNECT_GITHUB
        </CardTitle>
        <CardDescription>
          <span className="text-primary">{'//'}</span> Link your GitHub account to enable automatic content generation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary font-mono">
              1
            </div>
            <div>
              <p className="font-medium">Install GitHub App</p>
              <p className="text-sm text-muted-foreground">
                Authorize MRKTCMD to access your repositories
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary font-mono">
              2
            </div>
            <div>
              <p className="font-medium">Select Repositories</p>
              <p className="text-sm text-muted-foreground">
                Choose which repos to watch for events
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary font-mono">
              3
            </div>
            <div>
              <p className="font-medium">Configure Automation</p>
              <p className="text-sm text-muted-foreground">
                Set up what content to generate for each event
              </p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <h4 className="font-medium mb-2">Supported Events</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <span className="text-primary">Releases</span> - New version announcements</li>
            <li>• <span className="text-primary">Major Pushes</span> - Significant code changes</li>
            <li>• <span className="text-primary">Pull Requests</span> - Feature completions</li>
          </ul>
        </div>

        <Button
          variant="terminal"
          className="w-full"
          onClick={handleConnect}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Github className="mr-2 h-4 w-4" />
          )}
          {isConnecting ? 'Connecting...' : 'Connect GitHub'}
          <ExternalLink className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  )
}
