'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Terminal,
  Settings,
  LogOut,
  User as UserIcon,
  Menu,
  LayoutDashboard,
  FolderOpen,
  Video,
  Palette,
  Calendar,
  Plug,
  BookOpen,
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import type { Tables } from '@/lib/database.types'

const navItems = [
  { title: './dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: './brands', href: '/brands', icon: Palette },
  { title: './style-guides', href: '/style-guides', icon: BookOpen },
  { title: './calendar', href: '/calendar', icon: Calendar },
  { title: './projects', href: '/projects', icon: FolderOpen },
  { title: './videos', href: '/videos', icon: Video },
  { title: './integrations', href: '/integrations', icon: Plug },
  { title: './config', href: '/settings', icon: Settings },
]

interface DashboardHeaderProps {
  user: User
  profile: (Tables<'users'> & { organizations: Tables<'organizations'> | null }) | null
}

export function DashboardHeader({ user, profile }: DashboardHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || user.email?.[0].toUpperCase() || 'U'

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="container flex h-14 items-center">
        {/* Mobile Menu */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden mr-2">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] sm:w-[320px]">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2 font-mono">
                <Terminal className="h-5 w-5 text-primary" />
                MRKTCMD
              </SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <div className="text-xs text-muted-foreground mb-4 font-mono">
                <span className="text-primary">$</span> ls -la /modules
              </div>
              <nav className="grid gap-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center rounded-sm px-3 py-2 text-sm font-mono transition-all',
                        isActive
                          ? 'bg-primary/10 text-primary border-l-2 border-primary'
                          : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
                      )}
                    >
                      <item.icon className={cn(
                        'mr-2 h-4 w-4',
                        isActive ? 'text-primary' : 'text-muted-foreground'
                      )} />
                      <span>{item.title}</span>
                    </Link>
                  )
                })}
              </nav>
            </div>
          </SheetContent>
        </Sheet>

        <div className="mr-4 flex">
          <Link href="/dashboard" className="mr-6 flex items-center gap-2 group">
            <Terminal className="h-5 w-5 text-primary glow-text" />
            <span className="hidden font-bold tracking-tight sm:inline-block group-hover:text-primary transition-colors">MRKTCMD</span>
            <span className="text-xs text-muted-foreground hidden md:inline">v1.0.0</span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || ''} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{profile?.full_name || 'User'}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <UserIcon className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </div>
    </header>
  )
}
