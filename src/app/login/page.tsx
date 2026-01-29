'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Terminal, Loader2, Github } from 'lucide-react'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)

  const handleGitHubSignIn = async () => {
    setIsLoading(true)
    await signIn('github', { callbackUrl: '/dashboard' })
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="scanlines fixed inset-0 pointer-events-none" />

      <Card className="w-full max-w-md terminal-border bg-card/50">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Terminal className="h-6 w-6 text-primary" />
            <span className="font-mono text-xl text-primary crt-glow">mrktcmd</span>
          </div>
          <CardTitle className="font-mono text-sm text-muted-foreground">
            $ ./authenticate
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>Sign in with GitHub to connect your repositories and start generating content.</p>
          </div>

          <Button
            onClick={handleGitHubSignIn}
            variant="terminal"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Github className="h-4 w-4" />
                Sign in with GitHub
              </>
            )}
          </Button>

          <div className="pt-4 border-t border-border/50">
            <p className="text-xs text-center text-muted-foreground font-mono">
              We'll request access to your repos so you can connect them to brands
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
