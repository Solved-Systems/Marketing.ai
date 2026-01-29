'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  LayoutDashboard,
  FolderOpen,
  Video,
  Settings,
  Palette,
  Calendar,
  Plug,
  BookOpen,
} from 'lucide-react'

const navItems = [
  {
    title: './dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: './brands',
    href: '/brands',
    icon: Palette,
  },
  {
    title: './style-guides',
    href: '/style-guides',
    icon: BookOpen,
  },
  {
    title: './calendar',
    href: '/calendar',
    icon: Calendar,
  },
  {
    title: './projects',
    href: '/projects',
    icon: FolderOpen,
  },
  {
    title: './videos',
    href: '/videos',
    icon: Video,
  },
  {
    title: './integrations',
    href: '/integrations',
    icon: Plug,
  },
  {
    title: './config',
    href: '/settings',
    icon: Settings,
  },
]

export function DashboardNav() {
  const pathname = usePathname()

  return (
    <ScrollArea className="h-full py-6 pr-6 lg:py-8">
      <div className="text-xs text-muted-foreground mb-4 font-mono">
        <span className="text-primary">$</span> ls -la /modules
      </div>
      <nav className="grid items-start gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center rounded-sm px-3 py-2 text-sm font-mono transition-all',
                isActive
                  ? 'bg-primary/10 text-primary border-l-2 border-primary'
                  : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
              )}
            >
              <item.icon className={cn(
                'mr-2 h-4 w-4',
                isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'
              )} />
              <span>{item.title}</span>
            </Link>
          )
        })}
      </nav>
    </ScrollArea>
  )
}
