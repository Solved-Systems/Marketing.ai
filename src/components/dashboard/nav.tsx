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
  { title: './dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: './brands', href: '/brands', icon: Palette },
  { title: './calendar', href: '/calendar', icon: Calendar },
  { title: './chat', href: '/chat', icon: MessageSquare },
  { title: './video-editor', href: '/video-editor', icon: Video },
  { title: './integrations', href: '/integrations', icon: Plug },
  { title: './config', href: '/settings', icon: Settings },
  { title: './billing', href: '/settings/billing', icon: CreditCard },
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
        'min-h-screen border-r border-border/50 bg-sidebar flex flex-col transition-[width] duration-200',
        collapsed ? 'w-[76px]' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn('border-b border-border/50', collapsed ? 'p-2' : 'p-6')}>
        <div className={cn('flex items-center', collapsed ? 'flex-col gap-2' : 'justify-between gap-2')}>
          <Link href="/dashboard" className={cn('flex items-center', collapsed ? 'justify-center' : 'gap-2')}>
            <Terminal className="h-5 w-5 text-primary shrink-0" />
            {!collapsed && <span className="font-mono text-primary crt-glow font-semibold">mrktcmd</span>}
          </Link>
          <button
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className={cn('flex-1', collapsed ? 'p-2' : 'p-4')}>
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
                    'flex items-center rounded text-sm font-mono transition-all',
                    collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2',
                    isActive
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                  {!collapsed && isActive && <ChevronRight className="h-3 w-3 ml-auto" />}
                </Link>
              </li>
            )
          })}
          {/* Admin Link */}
          {isAdmin && (
            <li className={cn('border-t border-border/50', collapsed ? 'mt-3 pt-3' : 'mt-4 pt-4')}>
              <Link
                href="/admin"
                aria-label={collapsed ? './admin' : undefined}
                title={collapsed ? './admin' : undefined}
                className={cn(
                  'flex items-center rounded text-sm font-mono transition-all',
                  collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2',
                  pathname?.startsWith('/admin')
                    ? 'bg-red-500/20 text-red-500 border border-red-500/30'
                    : 'text-red-500/70 hover:text-red-500 hover:bg-red-500/10'
                )}
              >
                <Shield className="h-4 w-4 shrink-0" />
                {!collapsed && <span>./admin</span>}
                {!collapsed && pathname?.startsWith('/admin') && <ChevronRight className="h-3 w-3 ml-auto" />}
              </Link>
            </li>
          )}
        </ul>
      </nav>

      {/* Credits Display */}
      <div className={cn('border-t border-border/50', collapsed ? 'p-2' : 'p-4')}>
        {collapsed ? (
          <Link
            href="/settings/billing"
            className="flex h-10 items-center justify-center rounded border border-border/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="credits"
            aria-label="credits"
          >
            <Zap className="h-4 w-4 text-primary" />
          </Link>
        ) : (
          <Link href="/settings/billing" className="block">
            <div className="terminal-border rounded p-3 text-xs font-mono hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground">credits</span>
                <Zap className="h-3 w-3 text-primary" />
              </div>
              {isLoading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : total > 0 ? (
                <>
                  <p className="text-lg font-bold text-primary">{remaining}</p>
                  <div className="mt-1 h-1 bg-muted rounded overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${(remaining / total) * 100}%` }}
                    />
                  </div>
                  <p className="text-muted-foreground mt-1">{remaining}/{total}</p>
                </>
              ) : (
                <p className="text-yellow-500">No subscription</p>
              )}
            </div>
          </Link>
        )}
      </div>

      {/* Footer */}
      <div className={cn('border-t border-border/50', collapsed ? 'p-2 space-y-2' : 'p-4 space-y-3')}>
        {!collapsed && (
          <div className="terminal-border rounded p-3 text-xs font-mono">
            <p className="text-muted-foreground">$ status</p>
            <p className="text-primary">system: online</p>
            <p className="text-green-500/70">ai: ready</p>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          title="./logout"
          aria-label="./logout"
          className={cn(
            'flex items-center rounded text-sm font-mono text-muted-foreground hover:text-foreground hover:bg-muted transition-all',
            collapsed ? 'w-full justify-center px-2 py-2.5' : 'w-full gap-2 px-3 py-2'
          )}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>./logout</span>}
        </button>
      </div>
    </aside>
  )
}
