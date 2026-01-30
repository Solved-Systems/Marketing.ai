// Admin authentication and authorization helpers

import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { UserRole, AdminAction, AdminUser } from '@/types/admin'

export interface AdminSession {
  user: AdminUser
  isAdmin: boolean
  isSuperAdmin: boolean
}

// Get admin session with user details
export async function getAdminSession(): Promise<AdminSession | null> {
  const session = await auth()

  if (!session?.user?.email) {
    return null
  }

  const supabase = createAdminClient()

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', session.user.email)
    .single()

  if (error || !user) {
    return null
  }

  // Check if user is locked
  if (user.is_locked) {
    return null
  }

  const isAdmin = user.role === 'admin' || user.role === 'super_admin'
  const isSuperAdmin = user.role === 'super_admin'

  return {
    user: user as AdminUser,
    isAdmin,
    isSuperAdmin,
  }
}

// Require admin role - returns user or throws
export async function requireAdmin(): Promise<AdminSession> {
  const adminSession = await getAdminSession()

  if (!adminSession) {
    throw new Error('Unauthorized')
  }

  if (!adminSession.isAdmin) {
    throw new Error('Admin access required')
  }

  return adminSession
}

// Require super_admin role - returns user or throws
export async function requireSuperAdmin(): Promise<AdminSession> {
  const adminSession = await getAdminSession()

  if (!adminSession) {
    throw new Error('Unauthorized')
  }

  if (!adminSession.isSuperAdmin) {
    throw new Error('Super admin access required')
  }

  return adminSession
}

// Log admin action to audit log
export async function logAdminAction(
  adminId: string,
  action: AdminAction | string,
  targetType: string,
  targetId?: string,
  details?: Record<string, unknown>
): Promise<void> {
  const supabase = createAdminClient()

  const { error } = await supabase.from('admin_audit_log').insert({
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId || null,
    details: details || {},
  })

  if (error) {
    console.error('Failed to log admin action:', error)
  }
}

// Check if user is super_admin by ID
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  if (error || !data) {
    return false
  }

  return data.role === 'super_admin'
}

// Check if user is admin or super_admin by ID
export async function isAdmin(userId: string): Promise<boolean> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  if (error || !data) {
    return false
  }

  return data.role === 'admin' || data.role === 'super_admin'
}

// Get user role by ID
export async function getUserRole(userId: string): Promise<UserRole | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  if (error || !data) {
    return null
  }

  return data.role as UserRole
}
