'use client'

import { useState, useEffect, useCallback } from 'react'
import type {
  UserRole,
  AdminUserWithDetails,
  AdminStats,
  InvitationWithInviter,
  CreateInvitationRequest,
  UpdateUserRequest,
} from '@/types/admin'

// Hook to check admin status
export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [role, setRole] = useState<UserRole | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/check')
      const data = await response.json()

      if (response.ok) {
        setIsAdmin(data.isAdmin)
        setIsSuperAdmin(data.isSuperAdmin)
        setRole(data.role || null)
        setError(null)
      } else {
        setIsAdmin(false)
        setIsSuperAdmin(false)
        setRole(null)
      }
    } catch (err) {
      console.error('Error checking admin status:', err)
      setError('Failed to check admin status')
      setIsAdmin(false)
      setIsSuperAdmin(false)
      setRole(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { isAdmin, isSuperAdmin, role, isLoading, error, refetch }
}

// Hook to manage users
export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUserWithDetails[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [lockedFilter, setLockedFilter] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      })
      if (search) params.set('search', search)
      if (roleFilter) params.set('role', roleFilter)
      if (lockedFilter !== null) params.set('locked', lockedFilter.toString())

      const response = await fetch(`/api/admin/users?${params}`)
      const data = await response.json()

      if (response.ok) {
        setUsers(data.users)
        setTotal(data.total)
        setError(null)
      } else {
        setError(data.error || 'Failed to fetch users')
      }
    } catch (err) {
      console.error('Error fetching users:', err)
      setError('Failed to fetch users')
    } finally {
      setIsLoading(false)
    }
  }, [page, pageSize, search, roleFilter, lockedFilter])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const updateUser = useCallback(
    async (userId: string, updates: UpdateUserRequest): Promise<boolean> => {
      try {
        const response = await fetch('/api/admin/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, ...updates }),
        })

        if (response.ok) {
          await fetchUsers()
          return true
        } else {
          const data = await response.json()
          setError(data.error || 'Failed to update user')
          return false
        }
      } catch (err) {
        console.error('Error updating user:', err)
        setError('Failed to update user')
        return false
      }
    },
    [fetchUsers]
  )

  const lockUser = useCallback(
    (userId: string) => updateUser(userId, { is_locked: true }),
    [updateUser]
  )

  const unlockUser = useCallback(
    (userId: string) => updateUser(userId, { is_locked: false }),
    [updateUser]
  )

  const changeRole = useCallback(
    (userId: string, role: UserRole) => updateUser(userId, { role }),
    [updateUser]
  )

  return {
    users,
    total,
    page,
    pageSize,
    search,
    roleFilter,
    lockedFilter,
    isLoading,
    error,
    setPage,
    setPageSize,
    setSearch,
    setRoleFilter,
    setLockedFilter,
    refetch: fetchUsers,
    updateUser,
    lockUser,
    unlockUser,
    changeRole,
  }
}

// Hook to fetch admin stats
export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/stats')
      const data = await response.json()

      if (response.ok) {
        setStats(data)
        setError(null)
      } else {
        setError(data.error || 'Failed to fetch stats')
      }
    } catch (err) {
      console.error('Error fetching stats:', err)
      setError('Failed to fetch stats')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return { stats, isLoading, error, refetch: fetchStats }
}

// Hook to manage invitations
export function useAdminInvites() {
  const [invitations, setInvitations] = useState<InvitationWithInviter[]>([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState<'pending' | 'accepted' | 'expired' | 'all'>('pending')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInvites = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/admin/invites?status=${status}`)
      const data = await response.json()

      if (response.ok) {
        setInvitations(data.invitations)
        setTotal(data.total)
        setError(null)
      } else {
        setError(data.error || 'Failed to fetch invitations')
      }
    } catch (err) {
      console.error('Error fetching invitations:', err)
      setError('Failed to fetch invitations')
    } finally {
      setIsLoading(false)
    }
  }, [status])

  useEffect(() => {
    fetchInvites()
  }, [fetchInvites])

  const createInvite = useCallback(
    async (
      invite: CreateInvitationRequest
    ): Promise<{ success: boolean; token?: string; error?: string }> => {
      try {
        const response = await fetch('/api/admin/invites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invite),
        })

        const data = await response.json()

        if (response.ok) {
          await fetchInvites()
          return { success: true, token: data.invitation?.token }
        } else {
          return { success: false, error: data.error || 'Failed to create invitation' }
        }
      } catch (err) {
        console.error('Error creating invitation:', err)
        return { success: false, error: 'Failed to create invitation' }
      }
    },
    [fetchInvites]
  )

  const deleteInvite = useCallback(
    async (inviteId: string): Promise<boolean> => {
      try {
        const response = await fetch(`/api/admin/invites?id=${inviteId}`, {
          method: 'DELETE',
        })

        if (response.ok) {
          await fetchInvites()
          return true
        } else {
          const data = await response.json()
          setError(data.error || 'Failed to delete invitation')
          return false
        }
      } catch (err) {
        console.error('Error deleting invitation:', err)
        setError('Failed to delete invitation')
        return false
      }
    },
    [fetchInvites]
  )

  return {
    invitations,
    total,
    status,
    isLoading,
    error,
    setStatus,
    refetch: fetchInvites,
    createInvite,
    deleteInvite,
  }
}

// Hook to manage system settings (super_admin only)
export function useAdminSettings() {
  const [settings, setSettings] = useState<Record<string, unknown>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/settings')
      const data = await response.json()

      if (response.ok) {
        setSettings(data)
        setError(null)
      } else {
        setError(data.error || 'Failed to fetch settings')
      }
    } catch (err) {
      console.error('Error fetching settings:', err)
      setError('Failed to fetch settings')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const updateSetting = useCallback(
    async (key: string, value: Record<string, unknown>): Promise<boolean> => {
      try {
        const response = await fetch('/api/admin/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value }),
        })

        if (response.ok) {
          await fetchSettings()
          return true
        } else {
          const data = await response.json()
          setError(data.error || 'Failed to update setting')
          return false
        }
      } catch (err) {
        console.error('Error updating setting:', err)
        setError('Failed to update setting')
        return false
      }
    },
    [fetchSettings]
  )

  return { settings, isLoading, error, refetch: fetchSettings, updateSetting }
}
