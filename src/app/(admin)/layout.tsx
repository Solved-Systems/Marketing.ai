import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminNav } from '@/components/admin/nav'
import { MobileNav } from '@/components/mobile-nav'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Check authentication
  const session = await auth()

  if (!session?.user?.email) {
    redirect('/login')
  }

  // Check admin role
  const supabase = createAdminClient()
  const { data: user } = await supabase
    .from('users')
    .select('role, is_locked')
    .eq('email', session.user.email)
    .single()

  if (!user || user.is_locked) {
    redirect('/login')
  }

  if (user.role !== 'admin' && user.role !== 'super_admin') {
    redirect('/dashboard')
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile Navigation */}
      <MobileNav variant="admin" />

      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden lg:block">
        <AdminNav />
      </div>

      {/* Main Content - with top padding for mobile header */}
      <main className="relative flex-1 overflow-auto pt-14 lg:pt-0">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_45%_at_100%_0%,rgba(239,68,68,0.1),transparent_72%)]" />
        <div className="relative min-h-full">{children}</div>
      </main>
    </div>
  )
}
