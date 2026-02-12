'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useCredits } from '@/hooks/use-credits'
import { useAdmin } from '@/hooks/use-admin'
import { signOut } from 'next-auth/react'
import {
  Terminal,
  LayoutDashboard,
  Palette,
  Calendar,
  MessageSquare,
  Video,
  Plug,
  Settings,
  ChevronRight,
  CreditCard,
  Zap,
  Shield,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'

const navItems = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Brands', href: '/brands', icon: Palette },
  { title: 'Calendar', href: '/calendar', icon: Calendar },
  { title: 'Chat', href: '/chat', icon: MessageSquare },
  { title: 'Video Studio', href: '/video-editor', icon: Video },
  { title: 'Integrations', href: '/integrations', icon: Plug },
  { title: 'Settings', href: '/settings', icon: Settings },
  { title: 'Billing', href: '/settings/billing', icon: CreditCard },
]

export function DashboardNav() {
  const pathname = usePathname()
  const { remaining, total, isLoading } = useCredits()
  const { isAdmin } = useAdmin()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const stored = window.localStorage.getItem('mrktcmd:dashboard-nav-collapsed')
    setCollapsed(stored === '1')
  }, [])

  useEffect(() => {
    window.localStorage.setItem('mrktcmd:dashboard-nav-collapsed', collapsed ? '1' : '0')
  }, [collapsed])

  return (
    <aside
      className={cn(
        'flex min-h-screen flex-col border-r border-border/60 bg-sidebar/90 backdrop-blur transition-[width] duration-200',
        collapsed ? 'w-[82px]' : 'w-[270px]'
      )}
    >
      {/* Logo */}
      <div className={cn('border-b border-border/60', collapsed ? 'p-3' : 'p-5')}>
        <div className={cn('flex items-center', collapsed ? 'flex-col gap-2' : 'justify-between gap-2')}>
          <Link href="/dashboard" className={cn('flex items-center', collapsed ? 'justify-center' : 'gap-2.5')}>
            <Terminal className="h-5 w-5 shrink-0 text-primary" />
            {!collapsed && <span className="text-sm font-semibold tracking-wide text-foreground">MRKTCMD</span>}
          </Link>
          <button
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className={cn('flex-1', collapsed ? 'p-2' : 'p-3')}>
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-label={collapsed ? item.title : undefined}
                  title={collapsed ? item.title : undefined}
                  className={cn(
                    'flex items-center rounded-xl border text-sm transition-colors',
                    collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3.5 py-2.5',
                    isActive
                      ? 'border-primary/30 bg-primary/14 text-foreground'
                      : 'border-transparent text-muted-foreground hover:border-border/70 hover:bg-muted/60 hover:text-foreground'
                  )}
                >
                  <item.icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />
                  {!collapsed && <span>{item.title}</span>}
                  {!collapsed && isActive && <ChevronRight className="ml-auto h-3.5 w-3.5 text-primary" />}
                </Link>
              </li>
            )
          })}
          {/* Admin Link */}
          {isAdmin && (
            <li className={cn('border-t border-border/60', collapsed ? 'mt-3 pt-3' : 'mt-4 pt-4')}>
              <Link
                href="/admin"
                aria-label={collapsed ? 'Admin' : undefined}
                title={collapsed ? 'Admin' : undefined}
                className={cn(
                  'flex items-center rounded-xl border text-sm transition-colors',
                  collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3.5 py-2.5',
                  pathname?.startsWith('/admin')
                    ? 'border-red-500/35 bg-red-500/16 text-red-300'
                    : 'border-transparent text-red-300/80 hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-200'
                )}
              >
                <Shield className="h-4 w-4 shrink-0" />
                {!collapsed && <span>Admin</span>}
                {!collapsed && pathname?.startsWith('/admin') && <ChevronRight className="ml-auto h-3.5 w-3.5" />}
              </Link>
            </li>
          )}
        </ul>
      </nav>

      {/* Credits Display */}
      <div className={cn('border-t border-border/60', collapsed ? 'p-2' : 'p-3')}>
        {collapsed ? (
          <Link
            href="/settings/billing"
            className="flex h-10 items-center justify-center rounded-xl border border-border/70 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            title="Billing"
            aria-label="Billing"
          >
            <Zap className="h-4 w-4 text-primary" />
          </Link>
        ) : (
          <Link href="/settings/billing" className="block">
            <div className="rounded-xl border border-border/70 bg-card/70 p-3 text-xs transition-colors hover:bg-card/90">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-muted-foreground">Credits</span>
                <Zap className="h-3 w-3 text-primary" />
              </div>
              {isLoading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : total > 0 ? (
                <>
                  <p className="text-2xl font-semibold text-foreground">{remaining}</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/80">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${(remaining / total) * 100}%` }}
                    />
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {remaining} of {total} remaining
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">No active subscription</p>
              )}
            </div>
          </Link>
        )}
      </div>

      {/* Footer */}
      <div className={cn('border-t border-border/60', collapsed ? 'p-2' : 'p-3')}>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          title="Sign out"
          aria-label="Sign out"
          className={cn(
            'flex items-center rounded-xl border border-transparent text-sm text-muted-foreground transition-colors hover:border-border/70 hover:bg-muted/60 hover:text-foreground',
            collapsed ? 'w-full justify-center px-2 py-2.5' : 'w-full gap-2 px-3.5 py-2.5'
          )}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  )
}
