'use client'

import { useState } from 'react'
import { useAdminInvites, useAdmin } from '@/hooks/use-admin'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Mail,
  Plus,
  Trash2,
  Copy,
  Check,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types/admin'

export default function AdminInvitesPage() {
  const { isSuperAdmin } = useAdmin()
  const {
    invitations,
    total,
    status,
    isLoading,
    error,
    setStatus,
    createInvite,
    deleteInvite,
  } = useAdminInvites()

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('user')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setCreateError(null)

    const result = await createInvite({ email, role })

    if (result.success) {
      setEmail('')
      setRole('user')
      setShowCreateForm(false)
      if (result.token) {
        copyInviteLink(result.token)
      }
    } else {
      setCreateError(result.error || 'Failed to create invitation')
    }

    setCreating(false)
  }

  const handleDelete = async (inviteId: string) => {
    setDeletingId(inviteId)
    await deleteInvite(inviteId)
    setDeletingId(null)
  }

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/invite/${token}`
    navigator.clipboard.writeText(link)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-mono font-bold text-red-500 flex items-center gap-2">
            <Mail className="h-5 w-5 md:h-6 md:w-6" />
            Invitations
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">
            Manage user invitations
          </p>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="bg-red-600 hover:bg-red-700 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Invitation
        </Button>
      </div>

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md border-red-900/50">
            <CardHeader>
              <CardTitle className="font-mono text-red-500">Create Invitation</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block font-mono text-sm text-muted-foreground mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    required
                    className="w-full px-3 py-2 bg-background border border-border rounded font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block font-mono text-sm text-muted-foreground mb-1">
                    Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-background border border-border rounded font-mono text-sm"
                  >
                    <option value="user">User</option>
                    {isSuperAdmin && (
                      <>
                        <option value="admin">Admin</option>
                        <option value="super_admin">Super Admin</option>
                      </>
                    )}
                  </select>
                </div>
                {createError && (
                  <p className="text-red-400 font-mono text-sm">{createError}</p>
                )}
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                    disabled={creating}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={creating}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {creating ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Create
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status Filter */}
      <div className="mb-4 md:mb-6 flex gap-2 flex-wrap">
        {(['pending', 'accepted', 'expired', 'all'] as const).map((s) => (
          <Button
            key={s}
            variant={status === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatus(s)}
            className={cn(status === s && 'bg-red-600 hover:bg-red-700')}
          >
            {s === 'pending' && <Clock className="h-3 w-3 mr-1" />}
            {s === 'accepted' && <CheckCircle className="h-3 w-3 mr-1" />}
            {s === 'expired' && <XCircle className="h-3 w-3 mr-1" />}
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-6 p-4 bg-red-950/50 border border-red-500/50 rounded text-red-400 font-mono text-sm">
          {error}
        </div>
      )}

      {/* Invitations List */}
      <Card className="border-red-900/30">
        <CardHeader className="border-b border-red-900/30">
          <CardTitle className="font-mono text-sm text-muted-foreground">
            $ cat /invitations/{status}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-red-500" />
            </div>
          ) : invitations.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground font-mono">
              No {status} invitations
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {invitations.map((invite) => (
                <div
                  key={invite.id}
                  className="p-4 flex items-center justify-between hover:bg-muted/30"
                >
                  <div>
                    <p className="font-mono text-sm">{invite.email}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded font-mono text-xs',
                          invite.role === 'super_admin'
                            ? 'bg-red-950/50 text-red-400'
                            : invite.role === 'admin'
                              ? 'bg-yellow-950/50 text-yellow-400'
                              : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {invite.role}
                      </span>
                      <span className="text-muted-foreground font-mono text-xs">
                        by {invite.inviter?.name || invite.inviter?.email || 'Unknown'}
                      </span>
                      <span className="text-muted-foreground font-mono text-xs">
                        expires {formatDate(invite.expires_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!invite.accepted_at && new Date(invite.expires_at) > new Date() && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyInviteLink(invite.token)}
                        title="Copy invite link"
                      >
                        {copiedToken === invite.token ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(invite.id)}
                      disabled={deletingId === invite.id}
                      title="Delete invitation"
                    >
                      {deletingId === invite.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-red-500" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
