import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@supabase/supabase-js'
import type { Tables } from '@/lib/database.types'

interface UserState {
  user: User | null
  profile: Tables<'users'> | null
  organization: Tables<'organizations'> | null
  setUser: (user: User | null) => void
  setProfile: (profile: Tables<'users'> | null) => void
  setOrganization: (organization: Tables<'organizations'> | null) => void
  clear: () => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      profile: null,
      organization: null,
      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      setOrganization: (organization) => set({ organization }),
      clear: () => set({ user: null, profile: null, organization: null }),
    }),
    {
      name: 'mrktcmd-user',
      partialize: (state) => ({
        // Only persist non-sensitive data
        profile: state.profile ? { id: state.profile.id, full_name: state.profile.full_name } : null,
        organization: state.organization ? { id: state.organization.id, name: state.organization.name } : null,
      }),
    }
  )
)
