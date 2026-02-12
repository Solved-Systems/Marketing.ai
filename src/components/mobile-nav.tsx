'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useCredits } from '@/hooks/use-credits'
import { useAdmin } from '@/hooks/use-admin'
import { signOut } from 'next-auth/react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Calendar,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  Palette,
  Plug,
  Settings,
  Shield,
  Terminal,
  Users,
  Video,
  Zap,
} from 'lucide-react'

const dashboardNavItems = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Brands', href: '/brands', icon: Palette },
  { title: 'Calendar', href: '/calendar', icon: Calendar },
  { title: 'Chat', href: '/chat', icon: MessageSquare },
  { title: 'Video Studio', href: '/video-editor', icon: Video },
  { title: 'Integrations', href: '/integrations', icon: Plug },
  { title: 'Settings', href: '/settings', icon: Settings },
  { title: 'Billing', href: '/settings/billing', icon: CreditCard },
]

const adminNavItems = [
  { title: 'Users', href: '/admin', icon: Users },
  { title: 'Invites', href: '/admin/invites', icon: Mail },
  { title: 'Stats', href: '/admin/stats', icon: BarChart3 },
  { title: 'Health', href: '/admin/health', icon: Activity },
]

const superAdminItems = [{ title: 'Settings', href: '/admin/settings', icon: Settings }]

interface MobileNavProps {
  variant?: 'dashboard' | 'admin'
}

export function MobileNav({ variant = 'dashboard' }: MobileNavProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const { remaining, total, isLoading: creditsLoading } = useCredits()
  const { isAdmin, isSuperAdmin, role, isLoading: adminLoading } = useAdmin()

  const isAdminVariant = variant === 'admin'
  const accentClass = isAdminVariant ? 'text-red-400' : 'text-primary'
  const borderClass = isAdminVariant ? 'border-red-900/45' : 'border-border/60'

  const navItems = isAdminVariant
    ? isSuperAdmin
      ? [...adminNavItems, ...superAdminItems]
      : adminNavItems
    : dashboardNavItems

  const handleLinkClick = () => {
    setOpen(false)
  }

  const handleSignOut = () => {
    setOpen(false)
    signOut({ callbackUrl: '/' })
  }

  return (
    <>
      <header
        className={cn(
          'fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b bg-sidebar/92 px-4 backdrop-blur lg:hidden',
          borderClass
        )}
      >
        <Link href={isAdminVariant ? '/admin' : '/dashboard'} className="flex items-center gap-2.5">
          <Terminal className={cn('h-5 w-5', accentClass)} />
          <span className="text-sm font-semibold tracking-wide text-foreground">
            {isAdminVariant ? 'Admin' : 'MRKTCMD'}
          </span>
        </Link>
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          aria-label="Open navigation menu"
        >
          <Menu className={cn('h-5 w-5', accentClass)} />
        </button>
      </header>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className={cn('flex w-[286px] flex-col p-0 sm:w-[320px]', borderClass, 'bg-sidebar')}
          showCloseButton={false}
        >
          <SheetHeader className={cn('border-b px-4 py-4 text-left', borderClass)}>
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SheetDescription className="sr-only">
              Main navigation menu for the {isAdminVariant ? 'admin' : 'dashboard'}.
            </SheetDescription>
            <Link
              href={isAdminVariant ? '/admin' : '/dashboard'}
              className="flex items-center gap-2.5"
              onClick={handleLinkClick}
            >
              <Terminal className={cn('h-5 w-5', accentClass)} />
              <span className="text-sm font-semibold tracking-wide text-foreground">
                {isAdminVariant ? 'Admin' : 'MRKTCMD'}
              </span>
            </Link>
          </SheetHeader>

          {isAdminVariant && (
            <div className={cn('border-b p-3', borderClass)}>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded-xl border border-transparent px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:border-border/60 hover:bg-muted/55 hover:text-foreground"
                onClick={handleLinkClick}
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to dashboard</span>
              </Link>
            </div>
          )}

          <nav className="flex-1 overflow-y-auto p-3">
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
                        'flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-colors',
                        isActive
                          ? isAdminVariant
                            ? 'border-red-500/35 bg-red-500/16 text-red-200'
                            : 'border-primary/30 bg-primary/14 text-foreground'
                          : 'border-transparent text-muted-foreground hover:border-border/70 hover:bg-muted/60 hover:text-foreground'
                      )}
                    >
                      <item.icon className={cn('h-4 w-4', isActive ? accentClass : 'text-muted-foreground')} />
                      <span>{item.title}</span>
                      {isActive && <ChevronRight className={cn('ml-auto h-3.5 w-3.5', accentClass)} />}
                    </Link>
                  </li>
                )
              })}

              {!isAdminVariant && isAdmin && (
                <li className="mt-4 border-t border-border/60 pt-4">
                  <Link
                    href="/admin"
                    onClick={handleLinkClick}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-colors',
                      pathname?.startsWith('/admin')
                        ? 'border-red-500/35 bg-red-500/16 text-red-200'
                        : 'border-transparent text-red-300/80 hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-200'
                    )}
                  >
                    <Shield className="h-4 w-4" />
                    <span>Admin</span>
                    {pathname?.startsWith('/admin') && <ChevronRight className="ml-auto h-3.5 w-3.5" />}
                  </Link>
                </li>
              )}
            </ul>
          </nav>

          <div className={cn('border-t p-3', borderClass)}>
            {isAdminVariant ? (
              <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-3 text-xs">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-muted-foreground">Role</span>
                  <Shield className="h-3.5 w-3.5 text-red-400" />
                </div>
                {adminLoading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : (
                  <p className="text-base font-semibold text-red-200">{role || 'unknown'}</p>
                )}
              </div>
            ) : (
              <Link href="/settings/billing" onClick={handleLinkClick} className="block">
                <div className="rounded-xl border border-border/70 bg-card/70 p-3 text-xs transition-colors hover:bg-card/90">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-muted-foreground">Credits</span>
                    <Zap className="h-3.5 w-3.5 text-primary" />
                  </div>
                  {creditsLoading ? (
                    <p className="text-muted-foreground">Loading...</p>
                  ) : total > 0 ? (
                    <>
                      <p className="text-lg font-semibold text-foreground">{remaining}</p>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/80">
                        <div className="h-full bg-primary transition-all" style={{ width: `${(remaining / total) * 100}%` }} />
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

          <div className={cn('border-t p-3', borderClass)}>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 rounded-xl border border-transparent px-3.5 py-2.5 text-sm text-muted-foreground transition-colors hover:border-border/70 hover:bg-muted/60 hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
