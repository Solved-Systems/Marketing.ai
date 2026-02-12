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
    <div className="flex min-h-screen bg-background">
      {/* Mobile Navigation */}
      <MobileNav variant="dashboard" />

      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden lg:block">
        <DashboardNav />
      </div>

      {/* Main Content - with top padding for mobile header */}
      <main className="relative flex-1 overflow-auto pt-14 lg:pt-0">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(65%_50%_at_100%_0%,rgba(255,190,120,0.08),transparent_70%)]" />
        <div className="relative min-h-full">{children}</div>
      </main>
    </div>
  )
}
