import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminNav } from '@/components/admin/nav'

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
    <div className="flex min-h-screen">
      <AdminNav />
      <main className="flex-1 overflow-auto">
        <div className="scanlines fixed inset-0 pointer-events-none" />
        {children}
      </main>
    </div>
  )
}
