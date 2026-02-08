'use client'

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
  Plug,
  Settings,
  ChevronRight,
  CreditCard,
  Zap,
  Shield,
  LogOut,
} from 'lucide-react'

const navItems = [
  { title: './dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: './brands', href: '/brands', icon: Palette },
  { title: './calendar', href: '/calendar', icon: Calendar },
  { title: './chat', href: '/chat', icon: MessageSquare },
  { title: './integrations', href: '/integrations', icon: Plug },
  { title: './config', href: '/settings', icon: Settings },
  { title: './billing', href: '/settings/billing', icon: CreditCard },
]

export function DashboardNav() {
  const pathname = usePathname()
  const { remaining, total, isLoading } = useCredits()
  const { isAdmin } = useAdmin()

  return (
    <aside className="w-64 border-r border-border/50 bg-sidebar min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border/50">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-primary" />
          <span className="font-mono text-primary crt-glow font-semibold">mrktcmd</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded text-sm font-mono transition-all',
                    isActive
                      ? 'bg-primary/20 text-primary border border-primary/30'
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
          {/* Admin Link */}
          {isAdmin && (
            <li className="mt-4 pt-4 border-t border-border/50">
              <Link
                href="/admin"
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded text-sm font-mono transition-all',
                  pathname?.startsWith('/admin')
                    ? 'bg-red-500/20 text-red-500 border border-red-500/30'
                    : 'text-red-500/70 hover:text-red-500 hover:bg-red-500/10'
                )}
              >
                <Shield className="h-4 w-4" />
                <span>./admin</span>
                {pathname?.startsWith('/admin') && <ChevronRight className="h-3 w-3 ml-auto" />}
              </Link>
            </li>
          )}
        </ul>
      </nav>

      {/* Credits Display */}
      <div className="p-4 border-t border-border/50">
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
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border/50 space-y-3">
        <div className="terminal-border rounded p-3 text-xs font-mono">
          <p className="text-muted-foreground">$ status</p>
          <p className="text-primary">system: online</p>
          <p className="text-green-500/70">ai: ready</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm font-mono text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
        >
          <LogOut className="h-4 w-4" />
          <span>./logout</span>
        </button>
      </div>
    </aside>
  )
}
