import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Play, Zap, Github, Share2 } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link href="/" className="mr-6 flex items-center space-x-2">
              <Play className="h-6 w-6 fill-primary text-primary" />
              <span className="font-bold">VideoForge</span>
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-4">
            <nav className="flex items-center space-x-2">
              <Button variant="ghost" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Get Started</Link>
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="space-y-6 pb-8 pt-6 md:pb-12 md:pt-10 lg:py-32">
          <div className="container flex max-w-[64rem] flex-col items-center gap-4 text-center">
            <h1 className="font-bold text-3xl sm:text-5xl md:text-6xl lg:text-7xl">
              AI-Powered Video Creation
              <span className="text-primary"> in Minutes</span>
            </h1>
            <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
              Transform your product assets into stunning videos with AI. Connect
              your GitHub repos for automatic feature announcements and publish
              directly to social media.
            </p>
            <div className="space-x-4">
              <Button size="lg" asChild>
                <Link href="/signup">Start Creating Free</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="#features">Learn More</Link>
              </Button>
            </div>
          </div>
        </section>

        <section id="features" className="container space-y-6 py-8 md:py-12 lg:py-24">
          <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
            <h2 className="font-bold text-3xl leading-[1.1] sm:text-3xl md:text-6xl">
              Features
            </h2>
            <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
              Everything you need to create professional videos at scale
            </p>
          </div>

          <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3">
            <div className="relative overflow-hidden rounded-lg border bg-background p-2">
              <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
                <Zap className="h-12 w-12 text-primary" />
                <div className="space-y-2">
                  <h3 className="font-bold">AI Generation</h3>
                  <p className="text-sm text-muted-foreground">
                    Describe your video and let AI generate scripts, scenes, and
                    animations automatically.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-lg border bg-background p-2">
              <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
                <Github className="h-12 w-12 text-primary" />
                <div className="space-y-2">
                  <h3 className="font-bold">GitHub Integration</h3>
                  <p className="text-sm text-muted-foreground">
                    Automatically create feature announcement videos from your
                    releases and commits.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-lg border bg-background p-2">
              <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
                <Share2 className="h-12 w-12 text-primary" />
                <div className="space-y-2">
                  <h3 className="font-bold">Social Publishing</h3>
                  <p className="text-sm text-muted-foreground">
                    Publish to LinkedIn, Twitter, TikTok, and Instagram with one
                    click.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container py-8 md:py-12 lg:py-24">
          <div className="mx-auto flex max-w-[58rem] flex-col items-center justify-center gap-4 text-center">
            <h2 className="font-bold text-3xl leading-[1.1] sm:text-3xl md:text-6xl">
              Ready to get started?
            </h2>
            <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
              Create your first video in under 5 minutes. No credit card required.
            </p>
            <Button size="lg" asChild>
              <Link href="/signup">Create Free Account</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
            <Play className="h-6 w-6 fill-primary text-primary" />
            <p className="text-center text-sm leading-loose md:text-left">
              Built with Remotion, Next.js, and Supabase
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
