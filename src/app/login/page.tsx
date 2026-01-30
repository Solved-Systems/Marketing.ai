'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Terminal, Loader2, Github, Mail } from 'lucide-react'

type AuthMode = 'login' | 'register'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isGitHubLoading, setIsGitHubLoading] = useState(false)
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const handleGitHubSignIn = async () => {
    setIsGitHubLoading(true)
    setError('')
    await signIn('github', { callbackUrl: '/dashboard' })
  }

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      if (mode === 'register') {
        // Register new user
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name }),
        })

        const data = await res.json()

        if (!res.ok) {
          setError(data.error || 'Registration failed')
          setIsLoading(false)
          return
        }

        // Auto-login after registration
      }

      // Sign in with credentials
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError(mode === 'login' ? 'Invalid email or password' : 'Login failed after registration')
        setIsLoading(false)
        return
      }

      // Redirect to dashboard on success
      window.location.href = '/dashboard'
    } catch {
      setError('An error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login')
    setError('')
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
            $ ./{mode === 'login' ? 'authenticate' : 'register'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm font-mono">
              {error}
            </div>
          )}

          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="name" className="font-mono text-sm">
                  Name (optional)
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="font-mono"
                  disabled={isLoading}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="font-mono text-sm">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="font-mono"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="font-mono text-sm">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder={mode === 'register' ? 'Min. 8 characters' : '••••••••'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="font-mono"
                required
                minLength={mode === 'register' ? 8 : undefined}
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              variant="terminal"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  {mode === 'login' ? 'Sign in with Email' : 'Create Account'}
                </>
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground font-mono">or</span>
            </div>
          </div>

          <Button
            onClick={handleGitHubSignIn}
            variant="outline"
            className="w-full"
            disabled={isGitHubLoading || isLoading}
          >
            {isGitHubLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Github className="h-4 w-4" />
                Continue with GitHub
              </>
            )}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={toggleMode}
              className="text-sm text-muted-foreground hover:text-primary transition-colors font-mono"
              disabled={isLoading}
            >
              {mode === 'login'
                ? "Don't have an account? Register"
                : 'Already have an account? Sign in'}
            </button>
          </div>

          <div className="pt-4 border-t border-border/50">
            <p className="text-xs text-center text-muted-foreground font-mono">
              {mode === 'login'
                ? 'Sign in with GitHub to connect repos to your brands'
                : 'Create an account to start building your brand'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
