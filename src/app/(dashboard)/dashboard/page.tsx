'use client'

import Link from 'next/link'
import { Activity, ArrowRight, Image as ImageIcon, MessageSquare, Palette, Video, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DashboardPage() {
  return (
    <div className="p-4 md:p-8">
      <div className="mb-8 md:mb-10">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Welcome to your workspace</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
          Create new campaigns, manage brand assets, and generate content from one place.
        </p>
      </div>

      <section className="mb-8 md:mb-10">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Quick actions</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickActionCard
            icon={<Palette className="h-5 w-5" />}
            title="New Brand"
            description="Set up a new brand profile and style guide."
            href="/brands/new"
          />
          <QuickActionCard
            icon={<Video className="h-5 w-5" />}
            title="Create Video"
            description="Open the studio and generate a short video."
            href="/chat"
            badge="AI"
          />
          <QuickActionCard
            icon={<ImageIcon className="h-5 w-5" />}
            title="Create Image"
            description="Generate visual assets for your channels."
            href="/chat"
            badge="AI"
          />
          <QuickActionCard
            icon={<MessageSquare className="h-5 w-5" />}
            title="Write Post"
            description="Draft social content using your brand context."
            href="/chat"
            badge="AI"
          />
        </div>
      </section>

      <section className="mb-8 md:mb-10">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Snapshot</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="bg-card/65">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Brands</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-semibold tracking-tight">0</p>
              <p className="mt-2 text-sm text-muted-foreground">
                <Link href="/brands/new" className="text-primary transition-colors hover:text-primary/80">
                  Create your first brand
                </Link>
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/65">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Content Generated</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-semibold tracking-tight">0</p>
              <p className="mt-2 text-sm text-muted-foreground">Videos, images, and social posts.</p>
            </CardContent>
          </Card>

          <Card className="bg-card/65">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">AI Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-400" />
                <span className="text-xl font-semibold">Online</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Ready when you are.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <Card className="bg-card/65">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Zap className="h-4 w-4 text-primary" />
              Getting started
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Step
              number={1}
              title="Create a brand"
              description="Add brand identity details, colors, and logo assets."
              href="/brands/new"
            />
            <Step
              number={2}
              title="Connect your repo"
              description="Link GitHub to generate content from product updates."
              href="/integrations"
            />
            <Step
              number={3}
              title="Generate and publish"
              description="Use chat workflows to produce posts, images, and videos."
              href="/chat"
            />
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function QuickActionCard({
  icon,
  title,
  description,
  href,
  badge,
}: {
  icon: React.ReactNode
  title: string
  description: string
  href: string
  badge?: string
}) {
  return (
    <Link
      href={href}
      className="group h-full rounded-2xl border border-border/70 bg-card/65 p-4 transition-colors hover:bg-card/90"
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="text-primary">{icon}</div>
        {badge ? (
          <Badge variant="outline" className="border-primary/35 text-[10px] text-primary">
            {badge}
          </Badge>
        ) : null}
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </Link>
  )
}

function Step({
  number,
  title,
  description,
  href,
}: {
  number: number
  title: string
  description: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-xl border border-border/70 bg-card/45 px-4 py-3 transition-colors hover:bg-card/75"
    >
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/18 text-sm font-semibold text-primary">
        {number}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
    </Link>
  )
}
