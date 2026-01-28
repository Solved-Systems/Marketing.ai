import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Terminal, Cpu, Github, Radio, ChevronRight, Zap, Video, TrendingUp, Share2 } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <Terminal className="h-5 w-5 text-primary glow-text" />
            <span className="font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
              MRKTCMD
            </span>
            <span className="text-xs text-muted-foreground hidden sm:inline">v1.0.0</span>
          </Link>

          <nav className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary phosphor-hover" asChild>
              <Link href="/login">[login]</Link>
            </Button>
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 glow-border" asChild>
              <Link href="/signup">
                <span className="hidden sm:inline">./</span>start
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 md:py-32 overflow-hidden">
          {/* Background grid pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `
                linear-gradient(hsl(32 60% 20%) 1px, transparent 1px),
                linear-gradient(90deg, hsl(32 60% 20%) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px'
            }} />
          </div>

          <div className="container relative z-10">
            <div className="max-w-4xl mx-auto">
              {/* Terminal prompt decoration */}
              <div className="text-muted-foreground text-sm mb-6 animate-fade-in">
                <span className="text-primary">root@mrktcmd</span>
                <span className="text-muted-foreground">:</span>
                <span className="text-blue-400">~</span>
                <span className="text-muted-foreground">$ </span>
                <span className="text-foreground">./launch --target=growth</span>
                <span className="cursor-blink text-primary ml-1">▌</span>
              </div>

              {/* Main headline */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 animate-fade-in delay-100">
                <span className="text-foreground">COMMAND YOUR</span>
                <br />
                <span className="text-primary glow-text">MARKETING</span>
              </h1>

              {/* ASCII art decoration */}
              <pre className="text-xs text-muted-foreground/40 mb-8 hidden md:block font-mono animate-fade-in delay-200">
{`    ╔══════════════════════════════════════════════════════════════╗
    ║  AI Content → Auto Videos → Social Publishing → Growth 📈    ║
    ╚══════════════════════════════════════════════════════════════╝`}
              </pre>

              {/* Description */}
              <p className="text-lg text-muted-foreground max-w-2xl mb-10 leading-relaxed animate-fade-in delay-200">
                <span className="text-primary">{'//'}</span> AI-powered marketing automation for small businesses.
                <br />
                <span className="text-primary">{'//'}</span> Generate content. Create videos. Publish everywhere.
                <br />
                <span className="text-primary">{'//'}</span> One command. Maximum growth.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 animate-fade-in delay-300">
                <Button size="lg" className="btn-terminal text-base" asChild>
                  <Link href="/signup">
                    INITIALIZE
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-border text-muted-foreground hover:text-primary hover:border-primary/50 transition-all"
                  asChild
                >
                  <Link href="#features">
                    <span className="text-muted-foreground mr-2">$</span>
                    man mrktcmd
                  </Link>
                </Button>
              </div>

              {/* Status indicator */}
              <div className="mt-12 flex items-center gap-3 text-sm text-muted-foreground animate-fade-in delay-400">
                <span className="status-online" />
                <span>System operational</span>
                <span className="text-border">|</span>
                <span>AI: <span className="text-primary">ready</span></span>
                <span className="text-border">|</span>
                <span>Platforms: <span className="text-primary">6 connected</span></span>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 md:py-32 border-t border-border">
          <div className="container">
            {/* Section header */}
            <div className="mb-16 text-center">
              <div className="text-sm text-muted-foreground mb-4">
                <span className="text-primary">$</span> cat /sys/features
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-4">
                <span className="text-primary">{'//'}</span> CORE MODULES
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Production-grade video automation infrastructure
              </p>
            </div>

            {/* Feature cards */}
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {/* AI Content */}
              <div className="feature-card border border-border bg-card p-6 group">
                <div className="flex items-start justify-between mb-4">
                  <Cpu className="h-8 w-8 text-primary" />
                  <span className="text-xs text-muted-foreground font-mono">[01]</span>
                </div>
                <h3 className="text-lg font-bold mb-2 text-foreground group-hover:text-primary transition-colors">
                  AI_CONTENT
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  Generate marketing copy, blog posts, social captions, and ad creative with AI.
                </p>
                <div className="text-xs font-mono text-muted-foreground">
                  <span className="text-primary">{'>'}</span> model: claude-3
                  <br />
                  <span className="text-primary">{'>'}</span> formats: 12+
                </div>
              </div>

              {/* Video Generation */}
              <div className="feature-card border border-border bg-card p-6 group">
                <div className="flex items-start justify-between mb-4">
                  <Video className="h-8 w-8 text-primary" />
                  <span className="text-xs text-muted-foreground font-mono">[02]</span>
                </div>
                <h3 className="text-lg font-bold mb-2 text-foreground group-hover:text-primary transition-colors">
                  VIDEO_GEN
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  Auto-generate promo videos, product demos, and social clips from your assets.
                </p>
                <div className="text-xs font-mono text-muted-foreground">
                  <span className="text-primary">{'>'}</span> render: cloud
                  <br />
                  <span className="text-primary">{'>'}</span> templates: 10+
                </div>
              </div>

              {/* Social Publishing */}
              <div className="feature-card border border-border bg-card p-6 group">
                <div className="flex items-start justify-between mb-4">
                  <Share2 className="h-8 w-8 text-primary" />
                  <span className="text-xs text-muted-foreground font-mono">[03]</span>
                </div>
                <h3 className="text-lg font-bold mb-2 text-foreground group-hover:text-primary transition-colors">
                  AUTO_PUBLISH
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  Schedule and publish to LinkedIn, Twitter, TikTok, Instagram, and more.
                </p>
                <div className="text-xs font-mono text-muted-foreground">
                  <span className="text-primary">{'>'}</span> platforms: 6
                  <br />
                  <span className="text-primary">{'>'}</span> scheduling: smart
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tech Stack Section */}
        <section className="py-16 border-t border-border bg-card/30">
          <div className="container">
            <div className="text-center mb-10">
              <div className="text-sm text-muted-foreground">
                <span className="text-primary">$</span> lsmod | grep -E &quot;stack|deps&quot;
              </div>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 phosphor-hover">
                <Zap className="h-4 w-4" />
                <span>Remotion</span>
              </div>
              <span className="text-border hidden sm:inline">│</span>
              <div className="flex items-center gap-2 phosphor-hover">
                <span className="text-lg">▲</span>
                <span>Next.js</span>
              </div>
              <span className="text-border hidden sm:inline">│</span>
              <div className="flex items-center gap-2 phosphor-hover">
                <span className="text-lg text-emerald-500">◆</span>
                <span>Supabase</span>
              </div>
              <span className="text-border hidden sm:inline">│</span>
              <div className="flex items-center gap-2 phosphor-hover">
                <span className="text-lg">◯</span>
                <span>Claude AI</span>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 md:py-32 border-t border-border">
          <div className="container">
            <div className="max-w-2xl mx-auto text-center">
              {/* Terminal output style */}
              <div className="text-left bg-card border border-border p-6 mb-10 font-mono text-sm">
                <div className="text-muted-foreground mb-2">
                  <span className="text-primary">mrktcmd</span>@growth-engine:~$
                </div>
                <div className="text-foreground mb-1">
                  <span className="text-primary">→</span> Initializing marketing pipeline...
                </div>
                <div className="text-foreground mb-1">
                  <span className="text-primary">→</span> Loading AI content engine... <span className="text-green-500">done</span>
                </div>
                <div className="text-foreground mb-1">
                  <span className="text-primary">→</span> Connecting to social platforms... <span className="text-green-500">done</span>
                </div>
                <div className="text-foreground">
                  <span className="text-primary">→</span> Ready. Awaiting your command...
                  <span className="cursor-blink text-primary ml-1">▌</span>
                </div>
              </div>

              <h2 className="text-2xl md:text-4xl font-bold mb-4">
                <span className="text-primary">{'//'}</span> READY TO DEPLOY?
              </h2>
              <p className="text-muted-foreground mb-8">
                No credit card required. Start rendering in under 60 seconds.
              </p>

              <Button size="lg" className="btn-terminal" asChild>
                <Link href="/signup">
                  CREATE_ACCOUNT
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-primary" />
              <span>MRKTCMD v1.0.0</span>
              <span className="text-border">|</span>
              <span className="status-online" />
              <span>All systems operational</span>
            </div>
            <div className="font-mono text-xs">
              Built for <span className="text-primary">small businesses</span> that move fast
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
