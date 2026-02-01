'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Terminal, Zap, Video, Image, MessageSquare, Github, ArrowRight, Menu, X } from 'lucide-react'

export default function Home() {
  const [typedText, setTypedText] = useState('')
  const [showCursor, setShowCursor] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const fullText = 'MRKTCMD v1.0.0'

  useEffect(() => {
    let index = 0
    const typeInterval = setInterval(() => {
      if (index <= fullText.length) {
        setTypedText(fullText.slice(0, index))
        index++
      } else {
        clearInterval(typeInterval)
      }
    }, 100)

    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev)
    }, 530)

    return () => {
      clearInterval(typeInterval)
      clearInterval(cursorInterval)
    }
  }, [])

  return (
    <div className="min-h-screen bg-background relative">
      {/* Scanlines overlay */}
      <div className="scanlines fixed inset-0 pointer-events-none" />

      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-primary" />
            <span className="font-mono text-primary crt-glow">mrktcmd</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="#features" className="hover:text-primary transition-colors">./features</Link>
            <Link href="/pricing" className="hover:text-primary transition-colors">./pricing</Link>
            <Link href="#docs" className="hover:text-primary transition-colors">./docs</Link>
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">login</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="terminal" size="sm">
                <span className="prompt">get started</span>
              </Button>
            </Link>
          </div>
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 rounded hover:bg-muted transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6 text-primary" />
          </button>
        </div>
      </header>

      {/* Mobile Navigation */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="right" className="w-[280px] p-0 bg-sidebar border-l border-border/50" showCloseButton={false}>
          <SheetHeader className="p-4 border-b border-border/50">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <SheetDescription className="sr-only">Main navigation menu</SheetDescription>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="h-5 w-5 text-primary" />
                <span className="font-mono text-primary crt-glow">mrktcmd</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded hover:bg-muted transition-colors"
                aria-label="Close menu"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          </SheetHeader>
          <nav className="p-4">
            <ul className="space-y-1">
              <li>
                <Link
                  href="#features"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded text-sm font-mono text-muted-foreground hover:text-primary hover:bg-muted transition-all"
                >
                  ./features
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded text-sm font-mono text-primary bg-primary/10 border border-primary/30 transition-all"
                >
                  ./pricing
                </Link>
              </li>
              <li>
                <Link
                  href="#docs"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded text-sm font-mono text-muted-foreground hover:text-primary hover:bg-muted transition-all"
                >
                  ./docs
                </Link>
              </li>
            </ul>
          </nav>
          <div className="p-4 border-t border-border/50 space-y-3">
            <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" className="w-full font-mono">login</Button>
            </Link>
            <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="terminal" className="w-full font-mono">
                get started
              </Button>
            </Link>
          </div>
          <div className="p-4 border-t border-border/50">
            <div className="terminal-border rounded p-3 text-xs font-mono">
              <p className="text-muted-foreground">$ status</p>
              <p className="text-primary">system: online</p>
              <p className="text-green-500/70">ai: ready</p>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Hero */}
      <main className="container mx-auto px-6">
        <section className="py-24 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            {/* Terminal window */}
            <div className="terminal-border rounded-lg p-6 mb-12 text-left bg-card/50 backdrop-blur">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-destructive/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
                <span className="ml-4 text-xs text-muted-foreground font-mono">~ terminal</span>
              </div>
              <div className="font-mono">
                <p className="text-muted-foreground">$ ./init marketing-engine</p>
                <p className="text-primary crt-glow text-2xl md:text-3xl mt-2">
                  {typedText}
                  <span className={`${showCursor ? 'opacity-100' : 'opacity-0'} text-primary`}>_</span>
                </p>
                <p className="text-muted-foreground mt-2">&gt; AI-powered content generation initialized...</p>
              </div>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
              <span className="text-primary crt-glow">Command</span>{' '}
              <span className="text-foreground">your marketing</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-6">
              Generate videos, images, and social posts for your brands with AI.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm font-mono text-primary mb-10">
              <Github className="h-4 w-4" />
              <span>Connect your GitHub repos to auto-generate content from releases</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/dashboard">
                <Button variant="terminal" size="lg" className="w-full sm:w-auto">
                  <Terminal className="h-4 w-4" />
                  Launch Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline" size="lg" className="w-full sm:w-auto border-primary/50 hover:border-primary hover:bg-primary/10">
                  <Zap className="h-4 w-4 text-primary" />
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-24 border-t border-border/30">
          <div className="text-center mb-16">
            <p className="text-primary font-mono text-sm mb-2">./features</p>
            <h2 className="text-3xl md:text-4xl font-bold">Everything you need</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={<Video className="h-6 w-6" />}
              title="AI Video Creator"
              description="Generate marketing videos from prompts with brand colors and logos automatically applied."
            />
            <FeatureCard
              icon={<Image className="h-6 w-6" />}
              title="AI Image Generator"
              description="Create social graphics, banners, and ad creatives in your brand style."
            />
            <FeatureCard
              icon={<MessageSquare className="h-6 w-6" />}
              title="AI Post Writer"
              description="Generate and schedule platform-optimized social media posts."
            />
            <FeatureCard
              icon={<Github className="h-6 w-6" />}
              title="GitHub Integration"
              description="Automatically create content for releases and major updates."
              highlighted
            />
          </div>
        </section>

        {/* GitHub Integration Highlight */}
        <section className="py-24 border-t border-border/30">
          <div className="text-center mb-12">
            <p className="text-primary font-mono text-sm mb-2">./github-integration</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ship code. Ship content.</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Connect your GitHub repositories and let AI automatically create marketing content whenever you ship.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="terminal-border rounded-lg p-6 md:p-8 bg-card/30">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-3 h-3 rounded-full bg-destructive/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
                <span className="ml-4 text-xs text-muted-foreground font-mono">~ github-webhook</span>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/20 text-primary mb-4">
                    <Github className="h-6 w-6" />
                  </div>
                  <h3 className="font-mono text-sm text-primary mb-2">1. Connect Repo</h3>
                  <p className="text-xs text-muted-foreground">Link your GitHub repos to your brand</p>
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/20 text-primary mb-4">
                    <Zap className="h-6 w-6" />
                  </div>
                  <h3 className="font-mono text-sm text-primary mb-2">2. Push Release</h3>
                  <p className="text-xs text-muted-foreground">AI detects new releases and major updates</p>
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/20 text-primary mb-4">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <h3 className="font-mono text-sm text-primary mb-2">3. Auto Content</h3>
                  <p className="text-xs text-muted-foreground">Get videos, images, and posts ready to publish</p>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-border/30 font-mono text-sm">
                <p className="text-muted-foreground">$ git push origin v2.0.0</p>
                <p className="text-green-500 mt-1">&gt; Release detected. Generating marketing content...</p>
                <p className="text-primary mt-1">&gt; Created: release video, social posts (x4), announcement banner</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 border-t border-border/30">
          <div className="terminal-border rounded-lg p-8 md:p-12 text-center bg-card/30">
            <Zap className="h-12 w-12 text-primary mx-auto mb-6" />
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to execute?</h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Start generating AI-powered marketing content for your brands today.
            </p>
            <Link href="/dashboard">
              <Button variant="terminal" size="lg">
                <Terminal className="h-4 w-4" />
                ./start --now
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground font-mono">
          <p>&copy; 2024 MRKTCMD. All rights reserved.</p>
          <p className="mt-2 text-primary/60">Built with AI. Powered by caffeine.</p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description, highlighted }: { icon: React.ReactNode; title: string; description: string; highlighted?: boolean }) {
  return (
    <div className={`terminal-border rounded-lg p-6 bg-card/30 hover:bg-card/50 transition-all group relative ${highlighted ? 'border-primary shadow-lg shadow-primary/10' : ''}`}>
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-primary-foreground text-xs font-mono px-2 py-0.5 rounded">
            NEW
          </span>
        </div>
      )}
      <div className="text-primary mb-4 group-hover:scale-110 transition-transform">{icon}</div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
