'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useCredits } from '@/hooks/use-credits'
import { useAdmin } from '@/hooks/use-admin'
import { signOut } from 'next-auth/react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
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
  Menu,
  Users,
  Mail,
  BarChart3,
  Activity,
  ArrowLeft,
} from 'lucide-react'

const dashboardNavItems = [
  { title: './dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: './brands', href: '/brands', icon: Palette },
  { title: './calendar', href: '/calendar', icon: Calendar },
  { title: './chat', href: '/chat', icon: MessageSquare },
  { title: './integrations', href: '/integrations', icon: Plug },
  { title: './config', href: '/settings', icon: Settings },
  { title: './billing', href: '/settings/billing', icon: CreditCard },
]

const adminNavItems = [
  { title: './users', href: '/admin', icon: Users },
  { title: './invites', href: '/admin/invites', icon: Mail },
  { title: './stats', href: '/admin/stats', icon: BarChart3 },
  { title: './health', href: '/admin/health', icon: Activity },
]

const superAdminItems = [
  { title: './settings', href: '/admin/settings', icon: Settings },
]

interface MobileNavProps {
  variant?: 'dashboard' | 'admin'
}

export function MobileNav({ variant = 'dashboard' }: MobileNavProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const { remaining, total, isLoading: creditsLoading } = useCredits()
  const { isAdmin, isSuperAdmin, role, isLoading: adminLoading } = useAdmin()

  const isAdminVariant = variant === 'admin'
  const primaryColor = isAdminVariant ? 'text-red-500' : 'text-primary'
  const borderColor = isAdminVariant ? 'border-red-900/50' : 'border-border/50'
  const bgColor = isAdminVariant ? 'bg-red-950/20' : 'bg-muted/50'

  const navItems = isAdminVariant
    ? isSuperAdmin
      ? [...adminNavItems, ...superAdminItems]
      : adminNavItems
    : dashboardNavItems

  const handleLinkClick = () => {
    setOpen(false)
  }

  return (
    <>
      {/* Mobile Header */}
      <header className={cn(
        "lg:hidden fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-4 bg-sidebar border-b",
        borderColor
      )}>
        <Link href={isAdminVariant ? '/admin' : '/dashboard'} className="flex items-center gap-2">
          <Terminal className={cn("h-5 w-5", primaryColor)} />
          <span className={cn("font-mono font-semibold crt-glow", primaryColor)}>
            {isAdminVariant ? 'admin' : 'mrktcmd'}
          </span>
        </Link>
        <button
          onClick={() => setOpen(true)}
          className={cn(
            "p-2 rounded transition-colors",
            isAdminVariant ? "hover:bg-red-500/10" : "hover:bg-muted"
          )}
          aria-label="Open menu"
        >
          <Menu className={cn("h-6 w-6", primaryColor)} />
        </button>
      </header>

      {/* Mobile Navigation Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className={cn("w-[280px] sm:w-[320px] p-0 bg-sidebar", borderColor)}
          showCloseButton={false}
        >
          <SheetHeader className={cn("p-4 border-b", borderColor)}>
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <SheetDescription className="sr-only">
              Main navigation menu for the {isAdminVariant ? 'admin' : 'dashboard'}
            </SheetDescription>
            <Link
              href={isAdminVariant ? '/admin' : '/dashboard'}
              className="flex items-center gap-2"
              onClick={handleLinkClick}
            >
              <Terminal className={cn("h-5 w-5", primaryColor)} />
              <span className={cn("font-mono font-semibold crt-glow", primaryColor)}>
                {isAdminVariant ? 'admin' : 'mrktcmd'}
              </span>
            </Link>
          </SheetHeader>

          {/* Back to Dashboard (Admin only) */}
          {isAdminVariant && (
            <div className={cn("p-4 border-b", borderColor)}>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-foreground transition-colors"
                onClick={handleLinkClick}
              >
                <ArrowLeft className="h-4 w-4" />
                <span>back to dashboard</span>
              </Link>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const isActive = isAdminVariant
                  ? pathname === item.href
                  : pathname === item.href || pathname?.startsWith(item.href + '/')
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={handleLinkClick}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded text-sm font-mono transition-all',
                        isActive
                          ? isAdminVariant
                            ? 'bg-red-500/20 text-red-500 border border-red-500/30'
                            : 'bg-primary/20 text-primary border border-primary/30'
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
              {/* Admin Link (Dashboard only) */}
              {!isAdminVariant && isAdmin && (
                <li className="mt-4 pt-4 border-t border-border/50">
                  <Link
                    href="/admin"
                    onClick={handleLinkClick}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded text-sm font-mono transition-all',
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

          {/* Credits Display (Dashboard only) */}
          {!isAdminVariant && (
            <div className={cn("p-4 border-t", borderColor)}>
              <Link href="/settings/billing" onClick={handleLinkClick} className="block">
                <div className={cn("terminal-border rounded p-3 text-xs font-mono hover:bg-muted/50 transition-colors")}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-muted-foreground">credits</span>
                    <Zap className="h-3 w-3 text-primary" />
                  </div>
                  {creditsLoading ? (
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
          )}

          {/* Admin Status (Admin only) */}
          {isAdminVariant && (
            <div className={cn("p-4 border-t", borderColor)}>
              <div className={cn("border rounded p-3 text-xs font-mono", borderColor, bgColor)}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted-foreground">role</span>
                  <Shield className="h-3 w-3 text-red-500" />
                </div>
                {adminLoading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : (
                  <p className="text-lg font-bold text-red-500">{role || 'unknown'}</p>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className={cn("p-4 border-t", borderColor, "space-y-3")}>
            <div className={cn(
              "rounded p-3 text-xs font-mono",
              isAdminVariant ? "border border-red-900/50 bg-red-950/20" : "terminal-border"
            )}>
              {isAdminVariant ? (
                <>
                  <p className="text-muted-foreground">$ admin_status</p>
                  <p className="text-red-500">mode: privileged</p>
                  <p className="text-yellow-500/70">audit: enabled</p>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground">$ status</p>
                  <p className="text-primary">system: online</p>
                  <p className="text-green-500/70">ai: ready</p>
                </>
              )}
            </div>
            {!isAdminVariant && (
              <button
                onClick={() => {
                  setOpen(false)
                  signOut({ callbackUrl: '/' })
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm font-mono text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                <LogOut className="h-4 w-4" />
                <span>./logout</span>
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
