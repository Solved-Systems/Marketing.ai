'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAdmin } from '@/hooks/use-admin'
import {
  Terminal,
  Users,
  Mail,
  BarChart3,
  Activity,
  Settings,
  ChevronRight,
  Shield,
  ArrowLeft,
} from 'lucide-react'

const navItems = [
  { title: 'Users', href: '/admin', icon: Users },
  { title: 'Invites', href: '/admin/invites', icon: Mail },
  { title: 'Stats', href: '/admin/stats', icon: BarChart3 },
  { title: 'Health', href: '/admin/health', icon: Activity },
]

const superAdminItems = [
  { title: 'Settings', href: '/admin/settings', icon: Settings },
]

export function AdminNav() {
  const pathname = usePathname()
  const { isSuperAdmin, role, isLoading } = useAdmin()

  const allNavItems = isSuperAdmin ? [...navItems, ...superAdminItems] : navItems

  return (
    <aside className="flex min-h-screen w-[270px] flex-col border-r border-red-900/40 bg-sidebar/90 backdrop-blur">
      {/* Logo */}
      <div className="border-b border-red-900/40 p-5">
        <Link href="/admin" className="flex items-center gap-2.5">
          <Terminal className="h-5 w-5 text-red-500" />
          <span className="text-sm font-semibold uppercase tracking-wide text-red-200">Admin</span>
        </Link>
      </div>

      {/* Back to Dashboard */}
      <div className="border-b border-red-900/30 p-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-xl border border-transparent px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:border-border/60 hover:bg-muted/55 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to dashboard</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3">
        <ul className="space-y-1">
          {allNavItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-colors',
                    isActive
                      ? 'border-red-500/35 bg-red-500/16 text-red-200'
                      : 'border-transparent text-muted-foreground hover:border-border/70 hover:bg-muted/60 hover:text-foreground'
                  )}
                >
                  <item.icon className={cn('h-4 w-4', isActive ? 'text-red-300' : 'text-muted-foreground')} />
                  <span>{item.title}</span>
                  {isActive && <ChevronRight className="ml-auto h-3.5 w-3.5 text-red-300" />}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Admin Status */}
      <div className="border-t border-red-900/40 p-3">
        <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-3 text-xs">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-muted-foreground">role</span>
            <Shield className="h-3 w-3 text-red-500" />
          </div>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <p className="text-lg font-semibold text-red-300">{role || 'unknown'}</p>
          )}
        </div>
      </div>
    </aside>
  )
}
