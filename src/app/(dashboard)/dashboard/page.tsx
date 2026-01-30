'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Palette,
  Video,
  Image,
  MessageSquare,
  Plus,
  ArrowRight,
  Activity,
  Zap,
} from 'lucide-react'

export default function DashboardPage() {
  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono mb-2">
          <span>$</span>
          <span className="text-primary">./dashboard</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold">Command Center</h1>
        <p className="text-muted-foreground mt-1 md:mt-2 text-sm md:text-base">
          Manage your brands and generate AI content
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        <QuickActionCard
          icon={<Palette className="h-5 w-5" />}
          title="New Brand"
          description="Create a new brand"
          href="/brands/new"
        />
        <QuickActionCard
          icon={<Video className="h-5 w-5" />}
          title="Create Video"
          description="Generate AI video"
          href="/brands"
          badge="AI"
        />
        <QuickActionCard
          icon={<Image className="h-5 w-5" />}
          title="Create Image"
          description="Generate graphics"
          href="/brands"
          badge="AI"
        />
        <QuickActionCard
          icon={<MessageSquare className="h-5 w-5" />}
          title="Write Post"
          description="Generate social post"
          href="/brands"
          badge="AI"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        <Card className="terminal-border bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-muted-foreground">
              total_brands
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-primary crt-glow">0</p>
            <p className="text-sm text-muted-foreground mt-1">
              <Link href="/brands/new" className="text-primary hover:underline">
                Create your first brand →
              </Link>
            </p>
          </CardContent>
        </Card>

        <Card className="terminal-border bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-muted-foreground">
              content_generated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-primary crt-glow">0</p>
            <p className="text-sm text-muted-foreground mt-1">Videos, images, posts</p>
          </CardContent>
        </Card>

        <Card className="terminal-border bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-muted-foreground">
              ai_status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="h-6 w-6 text-green-500 animate-pulse" />
              <span className="text-2xl font-bold text-green-500">Online</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Ready to generate</p>
          </CardContent>
        </Card>
      </div>

      {/* Getting Started */}
      <Card className="terminal-border bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-mono">./getting-started</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 font-mono text-sm">
            <Step
              number={1}
              title="Create a brand"
              description="Set up your brand with logo, colors, and details"
              href="/brands/new"
              completed={false}
            />
            <Step
              number={2}
              title="Add products"
              description="Define products with features and descriptions"
              href="/brands"
              completed={false}
            />
            <Step
              number={3}
              title="Generate content"
              description="Use AI to create videos, images, and posts"
              href="/brands"
              completed={false}
            />
            <Step
              number={4}
              title="Connect GitHub"
              description="Automate content for releases (optional)"
              href="/integrations"
              completed={false}
            />
          </div>
        </CardContent>
      </Card>
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
    <Link href={href}>
      <Card className="terminal-border bg-card/50 hover:bg-card/70 transition-all cursor-pointer group h-full">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="text-primary group-hover:scale-110 transition-transform">
              {icon}
            </div>
            {badge && (
              <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                {badge}
              </Badge>
            )}
          </div>
          <h3 className="font-semibold text-sm mb-1">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

function Step({
  number,
  title,
  description,
  href,
  completed,
}: {
  number: number
  title: string
  description: string
  href: string
  completed: boolean
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 p-3 rounded terminal-border hover:bg-muted/50 transition-all group"
    >
      <div
        className={`w-8 h-8 rounded flex items-center justify-center text-sm font-bold ${
          completed
            ? 'bg-green-500/20 text-green-500 border border-green-500/50'
            : 'bg-primary/20 text-primary border border-primary/50'
        }`}
      >
        {completed ? '✓' : number}
      </div>
      <div className="flex-1">
        <p className="font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
    </Link>
  )
}
