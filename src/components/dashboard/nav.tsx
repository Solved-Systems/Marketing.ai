'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  LayoutDashboard,
  FolderOpen,
  Video,
  Github,
  Share2,
  Settings,
  Sparkles,
} from 'lucide-react'

const navItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Projects',
    href: '/projects',
    icon: FolderOpen,
  },
  {
    title: 'Videos',
    href: '/videos',
    icon: Video,
  },
  {
    title: 'AI Studio',
    href: '/dashboard/ai',
    icon: Sparkles,
  },
  {
    title: 'GitHub',
    href: '/dashboard/github',
    icon: Github,
  },
  {
    title: 'Social',
    href: '/dashboard/social',
    icon: Share2,
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
  },
]

export function DashboardNav() {
  const pathname = usePathname()

  return (
    <ScrollArea className="h-full py-6 pr-6 lg:py-8">
      <nav className="grid items-start gap-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground',
                isActive ? 'bg-accent text-accent-foreground' : 'transparent'
              )}
            >
              <item.icon className="mr-2 h-4 w-4" />
              <span>{item.title}</span>
            </Link>
          )
        })}
      </nav>
    </ScrollArea>
  )
}
