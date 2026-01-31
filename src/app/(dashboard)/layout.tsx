import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { DashboardNav } from '@/components/dashboard/nav'
import { MobileNav } from '@/components/mobile-nav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen">
      {/* Mobile Navigation */}
      <MobileNav variant="dashboard" />

      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden lg:block">
        <DashboardNav />
      </div>

      {/* Main Content - with top padding for mobile header */}
      <main className="flex-1 overflow-auto pt-14 lg:pt-0">
        <div className="scanlines fixed inset-0 pointer-events-none" />
        {children}
      </main>
    </div>
  )
}
