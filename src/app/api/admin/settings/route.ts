// Admin settings API endpoint
import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, logAdminAction } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { UpdateSettingsRequest } from '@/types/admin'

// GET /api/admin/settings - Get all system settings
export async function GET() {
  try {
    await requireSuperAdmin()

    const supabase = createAdminClient()

    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('key')

    if (error) {
      console.error('Error fetching settings:', error)
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }

    // Transform to key-value map
    const settingsMap: Record<string, unknown> = {}
    settings?.forEach((setting) => {
      settingsMap[setting.key] = setting.value
    })

    return NextResponse.json(settingsMap)
  } catch (error) {
    console.error('Admin settings GET error:', error)
    if (error instanceof Error && error.message.includes('access required')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

// PATCH /api/admin/settings - Update a system setting
export async function PATCH(request: NextRequest) {
  try {
    const adminSession = await requireSuperAdmin()

    const body = (await request.json()) as UpdateSettingsRequest
    const { key, value } = body

    if (!key) {
      return NextResponse.json({ error: 'Setting key is required' }, { status: 400 })
    }

    if (value === undefined) {
      return NextResponse.json({ error: 'Setting value is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get current value for logging
    const { data: currentSetting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', key)
      .single()

    // Upsert the setting
    const { data: setting, error } = await supabase
      .from('system_settings')
      .upsert(
        {
          key,
          value,
          updated_by: adminSession.user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      )
      .select()
      .single()

    if (error) {
      console.error('Error updating setting:', error)
      return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 })
    }

    await logAdminAction(adminSession.user.id, 'settings.update', 'system_setting', setting.id, {
      key,
      previous_value: currentSetting?.value,
      new_value: value,
    })

    return NextResponse.json({ success: true, setting })
  } catch (error) {
    console.error('Admin settings PATCH error:', error)
    if (error instanceof Error && error.message.includes('access required')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
