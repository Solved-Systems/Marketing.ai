import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'
import { createClient } from '@supabase/supabase-js'
import { fetchWithTimeout } from '@/lib/supabase/fetch-with-timeout'

const SIGN_IN_SYNC_TIMEOUT_MS = 2500

// Create Supabase admin client for user sync
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    global: {
      fetch: fetchWithTimeout,
    },
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// Clean env vars that might have escaped newlines from Vercel
const cleanEnvValue = (val: string | undefined) => val?.replace(/\\n|\n/g, '').trim()

async function syncUserToSupabase({
  email,
  name,
  image,
  githubId,
}: {
  email: string
  name: string | null | undefined
  image: string | null | undefined
  githubId: string | undefined
}) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return

  // Check if user exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single()

  if (existingUser) {
    // Update existing user
    await supabase
      .from('users')
      .update({
        name,
        avatar_url: image,
        github_id: githubId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingUser.id)
    return
  }

  // Check for pending invitation
  const now = new Date().toISOString()
  const { data: invitation } = await supabase
    .from('invitations')
    .select('id, role')
    .eq('email', email)
    .is('accepted_at', null)
    .gte('expires_at', now)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // Determine role from invitation or default to 'user'
  const role = invitation?.role || 'user'

  // Create new user with role
  await supabase.from('users').insert({
    email,
    name,
    avatar_url: image,
    github_id: githubId,
    role,
  })

  // Mark invitation as accepted if found
  if (invitation) {
    await supabase
      .from('invitations')
      .update({ accepted_at: now })
      .eq('id', invitation.id)
  }
}

async function syncUserToSupabaseWithTimeout(params: {
  email: string
  name: string | null | undefined
  image: string | null | undefined
  githubId: string | undefined
}) {
  let completed = false
  const syncPromise = syncUserToSupabase(params)
    .catch((error) => {
      console.error('Error syncing user to Supabase:', error)
    })
    .finally(() => {
      completed = true
    })

  await Promise.race([
    syncPromise,
    new Promise<void>((resolve) => {
      setTimeout(resolve, SIGN_IN_SYNC_TIMEOUT_MS)
    }),
  ])

  if (!completed) {
    console.warn(
      `Supabase user sync exceeded ${SIGN_IN_SYNC_TIMEOUT_MS}ms; continuing GitHub sign-in without waiting`
    )
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    GitHub({
      clientId: cleanEnvValue(process.env.GITHUB_CLIENT_ID)!,
      clientSecret: cleanEnvValue(process.env.GITHUB_CLIENT_SECRET)!,
      authorization: {
        params: {
          // Request access to user's repos
          scope: 'read:user user:email repo',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Persist the GitHub access token to the JWT
      if (account) {
        token.accessToken = account.access_token
        token.githubId = profile?.id?.toString() || account.providerAccountId
      }
      return token
    },
    async session({ session, token }) {
      // Make the access token available in the session
      session.accessToken = token.accessToken as string
      return session
    },
  },
  events: {
    async signIn({ user, account, profile }) {
      // Never block OAuth callback on Supabase availability.
      if (!user.email) return

      await syncUserToSupabaseWithTimeout({
        email: user.email,
        name: user.name,
        image: user.image,
        githubId: profile?.id?.toString() || account?.providerAccountId,
      })
    },
  },
  pages: {
    signIn: '/login',
  },
})
