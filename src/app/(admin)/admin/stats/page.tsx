'use client'

import { useAdminStats } from '@/hooks/use-admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart3,
  Users,
  CreditCard,
  Zap,
  Mail,
  Loader2,
  TrendingUp,
} from 'lucide-react'

export default function AdminStatsPage() {
  const { stats, isLoading, error } = useAdminStats()

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="p-4 bg-red-950/50 border border-red-500/50 rounded text-red-400 font-mono text-sm">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-mono font-bold text-red-500 flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Statistics
        </h1>
        <p className="text-muted-foreground font-mono text-sm mt-1">
          Platform usage and metrics
        </p>
      </div>

      {/* User Stats */}
      <div className="mb-8">
        <h2 className="text-lg font-mono font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-red-500" />
          Users
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-red-900/30">
            <CardContent className="p-4">
              <p className="text-muted-foreground font-mono text-xs mb-1">Total Users</p>
              <p className="text-3xl font-bold font-mono text-red-500">
                {formatNumber(stats?.users.total || 0)}
              </p>
            </CardContent>
          </Card>
          <Card className="border-red-900/30">
            <CardContent className="p-4">
              <p className="text-muted-foreground font-mono text-xs mb-1">Active</p>
              <p className="text-3xl font-bold font-mono text-green-500">
                {formatNumber(stats?.users.active || 0)}
              </p>
            </CardContent>
          </Card>
          <Card className="border-red-900/30">
            <CardContent className="p-4">
              <p className="text-muted-foreground font-mono text-xs mb-1">Locked</p>
              <p className="text-3xl font-bold font-mono text-yellow-500">
                {formatNumber(stats?.users.locked || 0)}
              </p>
            </CardContent>
          </Card>
          <Card className="border-red-900/30">
            <CardContent className="p-4">
              <p className="text-muted-foreground font-mono text-xs mb-1">Admins</p>
              <p className="text-3xl font-bold font-mono">
                {(stats?.users.byRole.admin || 0) + (stats?.users.byRole.super_admin || 0)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Subscription Stats */}
      <div className="mb-8">
        <h2 className="text-lg font-mono font-semibold mb-4 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-red-500" />
          Subscriptions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-red-900/30">
            <CardContent className="p-4">
              <p className="text-muted-foreground font-mono text-xs mb-1">Total</p>
              <p className="text-3xl font-bold font-mono text-red-500">
                {formatNumber(stats?.subscriptions.total || 0)}
              </p>
            </CardContent>
          </Card>
          <Card className="border-red-900/30">
            <CardContent className="p-4">
              <p className="text-muted-foreground font-mono text-xs mb-1">Active</p>
              <p className="text-3xl font-bold font-mono text-green-500">
                {formatNumber(stats?.subscriptions.active || 0)}
              </p>
            </CardContent>
          </Card>
          <Card className="border-red-900/30">
            <CardContent className="p-4">
              <p className="text-muted-foreground font-mono text-xs mb-1">Canceled</p>
              <p className="text-3xl font-bold font-mono text-muted-foreground">
                {formatNumber(stats?.subscriptions.canceled || 0)}
              </p>
            </CardContent>
          </Card>
          <Card className="border-red-900/30">
            <CardContent className="p-4">
              <p className="text-muted-foreground font-mono text-xs mb-1">By Plan</p>
              <div className="space-y-1 mt-2">
                {Object.entries(stats?.subscriptions.byPlan || {}).map(([plan, count]) => (
                  <div key={plan} className="flex justify-between font-mono text-sm">
                    <span className="text-muted-foreground">{plan}</span>
                    <span>{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Credit Usage Stats */}
      <div className="mb-8">
        <h2 className="text-lg font-mono font-semibold mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-red-500" />
          Credit Usage
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-red-900/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-muted-foreground font-mono text-xs">Total Credits Consumed</p>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
              <p className="text-3xl font-bold font-mono text-red-500">
                {formatNumber(stats?.credits.totalConsumed || 0)}
              </p>
              <p className="text-muted-foreground font-mono text-xs mt-2">
                {formatNumber(stats?.credits.last30Days || 0)} in last 30 days
              </p>
            </CardContent>
          </Card>
          <Card className="border-red-900/30">
            <CardHeader className="pb-2">
              <CardTitle className="font-mono text-sm text-muted-foreground">
                By Generation Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(stats?.credits.byType || {}).map(([type, credits]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="font-mono text-sm text-muted-foreground">
                      {type.replace('_', ' ')}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-muted rounded overflow-hidden">
                        <div
                          className="h-full bg-red-500"
                          style={{
                            width: `${Math.min(
                              100,
                              ((credits as number) / (stats?.credits.totalConsumed || 1)) * 100
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="font-mono text-sm w-16 text-right">
                        {formatNumber(credits as number)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Invitation Stats */}
      <div>
        <h2 className="text-lg font-mono font-semibold mb-4 flex items-center gap-2">
          <Mail className="h-5 w-5 text-red-500" />
          Invitations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-red-900/30">
            <CardContent className="p-4">
              <p className="text-muted-foreground font-mono text-xs mb-1">Pending</p>
              <p className="text-3xl font-bold font-mono text-yellow-500">
                {formatNumber(stats?.invitations.pending || 0)}
              </p>
            </CardContent>
          </Card>
          <Card className="border-red-900/30">
            <CardContent className="p-4">
              <p className="text-muted-foreground font-mono text-xs mb-1">Accepted</p>
              <p className="text-3xl font-bold font-mono text-green-500">
                {formatNumber(stats?.invitations.accepted || 0)}
              </p>
            </CardContent>
          </Card>
          <Card className="border-red-900/30">
            <CardContent className="p-4">
              <p className="text-muted-foreground font-mono text-xs mb-1">Expired</p>
              <p className="text-3xl font-bold font-mono text-muted-foreground">
                {formatNumber(stats?.invitations.expired || 0)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
