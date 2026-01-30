import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { DashboardNav } from '@/components/dashboard/nav'

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
      <DashboardNav />
      <main className="flex-1 overflow-auto">
        <div className="scanlines fixed inset-0 pointer-events-none" />
        {children}
      </main>
    </div>
  )
}
