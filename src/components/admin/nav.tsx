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
  { title: './users', href: '/admin', icon: Users },
  { title: './invites', href: '/admin/invites', icon: Mail },
  { title: './stats', href: '/admin/stats', icon: BarChart3 },
  { title: './health', href: '/admin/health', icon: Activity },
]

const superAdminItems = [
  { title: './settings', href: '/admin/settings', icon: Settings },
]

export function AdminNav() {
  const pathname = usePathname()
  const { isSuperAdmin, role, isLoading } = useAdmin()

  const allNavItems = isSuperAdmin ? [...navItems, ...superAdminItems] : navItems

  return (
    <aside className="w-64 border-r border-red-900/50 bg-sidebar min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-red-900/50">
        <Link href="/admin" className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-red-500" />
          <span className="font-mono text-red-500 font-semibold">admin</span>
        </Link>
      </div>

      {/* Back to Dashboard */}
      <div className="p-4 border-b border-red-900/30">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>back to dashboard</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {allNavItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded text-sm font-mono transition-all',
                    isActive
                      ? 'bg-red-500/20 text-red-500 border border-red-500/30'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                  {isActive && <ChevronRight className="h-3 w-3 ml-auto" />}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Admin Status */}
      <div className="p-4 border-t border-red-900/50">
        <div className="border border-red-900/50 rounded p-3 text-xs font-mono bg-red-950/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground">role</span>
            <Shield className="h-3 w-3 text-red-500" />
          </div>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <p className="text-lg font-bold text-red-500">{role || 'unknown'}</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-red-900/50">
        <div className="border border-red-900/50 rounded p-3 text-xs font-mono bg-red-950/20">
          <p className="text-muted-foreground">$ admin_status</p>
          <p className="text-red-500">mode: privileged</p>
          <p className="text-yellow-500/70">audit: enabled</p>
        </div>
      </div>
    </aside>
  )
}
