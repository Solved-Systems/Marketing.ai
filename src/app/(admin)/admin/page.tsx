'use client'

import { useState } from 'react'
import { useAdminUsers, useAdmin } from '@/hooks/use-admin'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Users,
  Search,
  Lock,
  Unlock,
  Shield,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types/admin'

export default function AdminUsersPage() {
  const { isSuperAdmin } = useAdmin()
  const {
    users,
    total,
    page,
    pageSize,
    search,
    roleFilter,
    isLoading,
    error,
    setPage,
    setSearch,
    setRoleFilter,
    lockUser,
    unlockUser,
    changeRole,
  } = useAdminUsers()

  const [searchInput, setSearchInput] = useState(search)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const totalPages = Math.ceil(total / pageSize)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const handleLock = async (userId: string) => {
    setActionLoading(userId)
    await lockUser(userId)
    setActionLoading(null)
  }

  const handleUnlock = async (userId: string) => {
    setActionLoading(userId)
    await unlockUser(userId)
    setActionLoading(null)
  }

  const handleRoleChange = async (userId: string, role: UserRole) => {
    setActionLoading(userId)
    await changeRole(userId, role)
    setActionLoading(null)
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-xl md:text-2xl font-mono font-bold text-red-500 flex items-center gap-2">
          <Users className="h-5 w-5 md:h-6 md:w-6" />
          User Management
        </h1>
        <p className="text-muted-foreground font-mono text-sm mt-1">
          Manage users, roles, and account status
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-4 md:mb-6 border-red-900/30">
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 md:gap-4 items-stretch sm:items-center">
            <form onSubmit={handleSearch} className="flex gap-2 flex-1 sm:flex-initial">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-background border border-border rounded font-mono text-sm w-full sm:w-64"
                />
              </div>
              <Button type="submit" variant="outline" size="sm">
                Search
              </Button>
            </form>

            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value)
                setPage(1)
              }}
              className="px-3 py-2 bg-background border border-border rounded font-mono text-sm"
            >
              <option value="">All Roles</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>

            <span className="text-muted-foreground font-mono text-sm sm:ml-auto text-center sm:text-left">
              {total} users total
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Error display */}
      {error && (
        <div className="mb-6 p-4 bg-red-950/50 border border-red-500/50 rounded text-red-400 font-mono text-sm">
          {error}
        </div>
      )}

      {/* Users Table */}
      <Card className="border-red-900/30">
        <CardHeader className="border-b border-red-900/30">
          <CardTitle className="font-mono text-sm text-muted-foreground">
            $ ls -la /users
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-red-500" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 font-mono text-xs text-muted-foreground">User</th>
                    <th className="px-4 py-3 font-mono text-xs text-muted-foreground">Role</th>
                    <th className="px-4 py-3 font-mono text-xs text-muted-foreground">Plan</th>
                    <th className="px-4 py-3 font-mono text-xs text-muted-foreground">Credits</th>
                    <th className="px-4 py-3 font-mono text-xs text-muted-foreground">Status</th>
                    <th className="px-4 py-3 font-mono text-xs text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt=""
                              className="h-8 w-8 rounded-full"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                              <span className="text-xs font-mono">
                                {user.email?.[0]?.toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="font-mono text-sm">{user.name || 'Unknown'}</p>
                            <p className="font-mono text-xs text-muted-foreground">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isSuperAdmin ? (
                          <select
                            value={user.role}
                            onChange={(e) =>
                              handleRoleChange(user.id, e.target.value as UserRole)
                            }
                            disabled={actionLoading === user.id}
                            className={cn(
                              'px-2 py-1 rounded font-mono text-xs border',
                              user.role === 'super_admin'
                                ? 'bg-red-950/50 border-red-500/50 text-red-400'
                                : user.role === 'admin'
                                  ? 'bg-yellow-950/50 border-yellow-500/50 text-yellow-400'
                                  : 'bg-muted border-border'
                            )}
                          >
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                            <option value="super_admin">super_admin</option>
                          </select>
                        ) : (
                          <span
                            className={cn(
                              'px-2 py-1 rounded font-mono text-xs',
                              user.role === 'super_admin'
                                ? 'bg-red-950/50 text-red-400'
                                : user.role === 'admin'
                                  ? 'bg-yellow-950/50 text-yellow-400'
                                  : 'bg-muted'
                            )}
                          >
                            {user.role}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm">
                        {user.subscription?.plan_name || (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm">
                        {user.credits ? (
                          <span>
                            {user.credits.remaining}/{user.credits.total}
                          </span>
                        ) : user.role === 'super_admin' ? (
                          <span className="text-red-400">unlimited</span>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'px-2 py-1 rounded font-mono text-xs',
                            user.is_locked
                              ? 'bg-red-950/50 text-red-400'
                              : 'bg-green-950/50 text-green-400'
                          )}
                        >
                          {user.is_locked ? 'locked' : 'active'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {user.is_locked ? (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleUnlock(user.id)}
                              disabled={actionLoading === user.id}
                              title="Unlock user"
                            >
                              {actionLoading === user.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Unlock className="h-4 w-4 text-green-500" />
                              )}
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleLock(user.id)}
                              disabled={actionLoading === user.id}
                              title="Lock user"
                            >
                              {actionLoading === user.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Lock className="h-4 w-4 text-red-500" />
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-muted-foreground font-mono text-sm">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
