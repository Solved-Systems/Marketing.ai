'use client'

import { useState, useEffect } from 'react'
import { useAdminSettings, useAdmin } from '@/hooks/use-admin'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Settings,
  Save,
  Loader2,
  AlertTriangle,
  Cpu,
  Image as ImageIcon,
  Video,
  Mail,
  Power,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { redirect } from 'next/navigation'
import type { ModelPreferences, InvitationSettings, MaintenanceMode } from '@/types/admin'

export default function AdminSettingsPage() {
  const { isSuperAdmin, isLoading: adminLoading } = useAdmin()
  const { settings, isLoading, error, updateSetting } = useAdminSettings()

  const [modelPrefs, setModelPrefs] = useState<ModelPreferences | null>(null)
  const [inviteSettings, setInviteSettings] = useState<InvitationSettings | null>(null)
  const [maintenanceMode, setMaintenanceMode] = useState<MaintenanceMode | null>(null)

  const [saving, setSaving] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)

  // Sync settings to local state for form editing
  useEffect(() => {
    if (settings) {
      if (settings.model_preferences) {
        setModelPrefs(settings.model_preferences as ModelPreferences)
      }
      if (settings.invitation_settings) {
        setInviteSettings(settings.invitation_settings as InvitationSettings)
      }
      if (settings.maintenance_mode) {
        setMaintenanceMode(settings.maintenance_mode as MaintenanceMode)
      }
    }
  }, [settings])

  // Redirect if not super_admin
  if (!adminLoading && !isSuperAdmin) {
    redirect('/admin')
  }

  const handleSave = async (key: string, value: Record<string, unknown>) => {
    setSaving(key)
    setSaveError(null)
    setSaveSuccess(null)

    const success = await updateSetting(key, value)

    if (success) {
      setSaveSuccess(key)
      setTimeout(() => setSaveSuccess(null), 2000)
    } else {
      setSaveError(`Failed to save ${key}`)
    }

    setSaving(null)
  }

  if (isLoading || adminLoading) {
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
          <Settings className="h-6 w-6" />
          System Settings
        </h1>
        <p className="text-muted-foreground font-mono text-sm mt-1">
          Configure system-wide preferences (super_admin only)
        </p>
      </div>

      {saveError && (
        <div className="mb-6 p-4 bg-red-950/50 border border-red-500/50 rounded text-red-400 font-mono text-sm">
          {saveError}
        </div>
      )}

      <div className="space-y-6">
        {/* Model Preferences */}
        <Card className="border-red-900/30">
          <CardHeader className="border-b border-red-900/30">
            <CardTitle className="font-mono text-sm flex items-center gap-2">
              <Cpu className="h-4 w-4 text-red-500" />
              Model Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {modelPrefs && (
              <>
                {/* Text Generation */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-sm">Text Generation</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pl-6">
                    <div>
                      <label className="block font-mono text-xs text-muted-foreground mb-1">
                        Enabled
                      </label>
                      <select
                        value={modelPrefs.text.enabled ? 'true' : 'false'}
                        onChange={(e) =>
                          setModelPrefs({
                            ...modelPrefs,
                            text: { ...modelPrefs.text, enabled: e.target.value === 'true' },
                          })
                        }
                        className="w-full px-3 py-2 bg-background border border-border rounded font-mono text-sm"
                      >
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-mono text-xs text-muted-foreground mb-1">
                        Default Model
                      </label>
                      <input
                        type="text"
                        value={modelPrefs.text.default_model}
                        onChange={(e) =>
                          setModelPrefs({
                            ...modelPrefs,
                            text: { ...modelPrefs.text, default_model: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 bg-background border border-border rounded font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Image Generation */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-sm">Image Generation</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pl-6">
                    <div>
                      <label className="block font-mono text-xs text-muted-foreground mb-1">
                        Enabled
                      </label>
                      <select
                        value={modelPrefs.image.enabled ? 'true' : 'false'}
                        onChange={(e) =>
                          setModelPrefs({
                            ...modelPrefs,
                            image: { ...modelPrefs.image, enabled: e.target.value === 'true' },
                          })
                        }
                        className="w-full px-3 py-2 bg-background border border-border rounded font-mono text-sm"
                      >
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-mono text-xs text-muted-foreground mb-1">
                        Default Model
                      </label>
                      <input
                        type="text"
                        value={modelPrefs.image.default_model}
                        onChange={(e) =>
                          setModelPrefs({
                            ...modelPrefs,
                            image: { ...modelPrefs.image, default_model: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 bg-background border border-border rounded font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Video Generation */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-sm">Video Generation</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pl-6">
                    <div>
                      <label className="block font-mono text-xs text-muted-foreground mb-1">
                        Enabled
                      </label>
                      <select
                        value={modelPrefs.video.enabled ? 'true' : 'false'}
                        onChange={(e) =>
                          setModelPrefs({
                            ...modelPrefs,
                            video: { ...modelPrefs.video, enabled: e.target.value === 'true' },
                          })
                        }
                        className="w-full px-3 py-2 bg-background border border-border rounded font-mono text-sm"
                      >
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-mono text-xs text-muted-foreground mb-1">
                        Default Model
                      </label>
                      <input
                        type="text"
                        value={modelPrefs.video.default_model}
                        onChange={(e) =>
                          setModelPrefs({
                            ...modelPrefs,
                            video: { ...modelPrefs.video, default_model: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 bg-background border border-border rounded font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => handleSave('model_preferences', modelPrefs as unknown as Record<string, unknown>)}
                  disabled={saving === 'model_preferences'}
                  className={cn(
                    'mt-4',
                    saveSuccess === 'model_preferences'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  )}
                >
                  {saving === 'model_preferences' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {saveSuccess === 'model_preferences' ? 'Saved!' : 'Save Model Preferences'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Invitation Settings */}
        <Card className="border-red-900/30">
          <CardHeader className="border-b border-red-900/30">
            <CardTitle className="font-mono text-sm flex items-center gap-2">
              <Mail className="h-4 w-4 text-red-500" />
              Invitation Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {inviteSettings && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono text-xs text-muted-foreground mb-1">
                      Expiry (days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={inviteSettings.expiry_days}
                      onChange={(e) =>
                        setInviteSettings({
                          ...inviteSettings,
                          expiry_days: parseInt(e.target.value, 10),
                        })
                      }
                      className="w-full px-3 py-2 bg-background border border-border rounded font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-xs text-muted-foreground mb-1">
                      Max Pending Invites
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={inviteSettings.max_pending}
                      onChange={(e) =>
                        setInviteSettings({
                          ...inviteSettings,
                          max_pending: parseInt(e.target.value, 10),
                        })
                      }
                      className="w-full px-3 py-2 bg-background border border-border rounded font-mono text-sm"
                    />
                  </div>
                </div>
                <Button
                  onClick={() => handleSave('invitation_settings', inviteSettings as unknown as Record<string, unknown>)}
                  disabled={saving === 'invitation_settings'}
                  className={cn(
                    'mt-4',
                    saveSuccess === 'invitation_settings'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  )}
                >
                  {saving === 'invitation_settings' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {saveSuccess === 'invitation_settings' ? 'Saved!' : 'Save Invitation Settings'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Maintenance Mode */}
        <Card className="border-red-900/30">
          <CardHeader className="border-b border-red-900/30">
            <CardTitle className="font-mono text-sm flex items-center gap-2">
              <Power className="h-4 w-4 text-red-500" />
              Maintenance Mode
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {maintenanceMode && (
              <>
                {maintenanceMode.enabled && (
                  <div className="mb-4 p-3 bg-yellow-950/50 border border-yellow-500/50 rounded flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <span className="font-mono text-sm text-yellow-400">
                      Maintenance mode is currently ENABLED
                    </span>
                  </div>
                )}
                <div className="space-y-4">
                  <div>
                    <label className="block font-mono text-xs text-muted-foreground mb-1">
                      Status
                    </label>
                    <select
                      value={maintenanceMode.enabled ? 'true' : 'false'}
                      onChange={(e) =>
                        setMaintenanceMode({
                          ...maintenanceMode,
                          enabled: e.target.value === 'true',
                        })
                      }
                      className="w-full px-3 py-2 bg-background border border-border rounded font-mono text-sm"
                    >
                      <option value="false">Disabled</option>
                      <option value="true">Enabled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-mono text-xs text-muted-foreground mb-1">
                      Message
                    </label>
                    <textarea
                      value={maintenanceMode.message}
                      onChange={(e) =>
                        setMaintenanceMode({
                          ...maintenanceMode,
                          message: e.target.value,
                        })
                      }
                      rows={3}
                      className="w-full px-3 py-2 bg-background border border-border rounded font-mono text-sm resize-none"
                    />
                  </div>
                </div>
                <Button
                  onClick={() => handleSave('maintenance_mode', maintenanceMode as unknown as Record<string, unknown>)}
                  disabled={saving === 'maintenance_mode'}
                  className={cn(
                    'mt-4',
                    saveSuccess === 'maintenance_mode'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  )}
                >
                  {saving === 'maintenance_mode' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {saveSuccess === 'maintenance_mode' ? 'Saved!' : 'Save Maintenance Settings'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
