// Admin check API endpoint
import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin/auth'

export async function GET() {
  try {
    const adminSession = await getAdminSession()

    if (!adminSession) {
      return NextResponse.json({ isAdmin: false, isSuperAdmin: false })
    }

    return NextResponse.json({
      isAdmin: adminSession.isAdmin,
      isSuperAdmin: adminSession.isSuperAdmin,
      role: adminSession.user.role,
    })
  } catch (error) {
    console.error('Admin check error:', error)
    return NextResponse.json({ error: 'Failed to check admin status' }, { status: 500 })
  }
}
