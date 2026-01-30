// Admin system types for MRKTCMD

export type UserRole = 'user' | 'admin' | 'super_admin'

// Extended User interface with admin fields
export interface AdminUser {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  github_id: string | null
  stripe_customer_id: string | null
  role: UserRole
  is_locked: boolean
  locked_at: string | null
  locked_by: string | null
  created_at: string
  updated_at: string
}

// User with subscription and credit info for admin views
export interface AdminUserWithDetails extends AdminUser {
  subscription: {
    plan_name: string
    status: string
    current_period_end: string | null
  } | null
  credits: {
    remaining: number
    used: number
    total: number
  } | null
}

// Invitation types
export interface Invitation {
  id: string
  email: string
  role: UserRole
  token: string
  invited_by: string
  expires_at: string
  accepted_at: string | null
  created_at: string
}

export interface InvitationWithInviter extends Invitation {
  inviter: {
    id: string
    email: string
    name: string | null
  }
}

export interface CreateInvitationRequest {
  email: string
  role: UserRole
}

// System settings types
export interface SystemSetting {
  id: string
  key: string
  value: Record<string, unknown>
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface ModelPreferences {
  text: {
    enabled: boolean
    default_model: string
  }
  image: {
    enabled: boolean
    default_model: string
    allowed_tiers: string[]
  }
  video: {
    enabled: boolean
    default_model: string
    allowed_tiers: string[]
  }
}

export interface InvitationSettings {
  expiry_days: number
  max_pending: number
}

export interface MaintenanceMode {
  enabled: boolean
  message: string
}

// Admin audit log types
export interface AdminAuditLog {
  id: string
  admin_id: string
  action: string
  target_type: string
  target_id: string | null
  details: Record<string, unknown>
  created_at: string
}

export interface AdminAuditLogWithAdmin extends AdminAuditLog {
  admin: {
    id: string
    email: string
    name: string | null
  }
}

// Admin action types
export type AdminAction =
  | 'user.lock'
  | 'user.unlock'
  | 'user.role_change'
  | 'user.delete'
  | 'invitation.create'
  | 'invitation.delete'
  | 'settings.update'
  | 'credits.adjust'

// API response types
export interface AdminStats {
  users: {
    total: number
    active: number
    locked: number
    byRole: {
      user: number
      admin: number
      super_admin: number
    }
  }
  subscriptions: {
    total: number
    active: number
    canceled: number
    byPlan: Record<string, number>
  }
  credits: {
    totalConsumed: number
    byType: Record<string, number>
    last30Days: number
  }
  invitations: {
    pending: number
    accepted: number
    expired: number
  }
}

export interface AdminUsersResponse {
  users: AdminUserWithDetails[]
  total: number
  page: number
  pageSize: number
}

export interface AdminInvitationsResponse {
  invitations: InvitationWithInviter[]
  total: number
}

// Request types
export interface UpdateUserRequest {
  role?: UserRole
  is_locked?: boolean
}

export interface UpdateSettingsRequest {
  key: string
  value: Record<string, unknown>
}
