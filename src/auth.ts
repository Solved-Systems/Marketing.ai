import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'
import { createClient } from '@supabase/supabase-js'

// Create Supabase admin client for user sync
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// Clean env vars that might have escaped newlines from Vercel
const cleanEnvValue = (val: string | undefined) => val?.replace(/\\n|\n/g, '').trim()

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
      // Sync user to Supabase on sign-in
      const supabase = getSupabaseAdmin()
      if (!supabase || !user.email) return

      try {
        // Check if user exists
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .single()

        if (existingUser) {
          // Update existing user
          await supabase
            .from('users')
            .update({
              name: user.name,
              avatar_url: user.image,
              github_id: profile?.id?.toString() || account?.providerAccountId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingUser.id)
        } else {
          // Check for pending invitation
          const now = new Date().toISOString()
          const { data: invitation } = await supabase
            .from('invitations')
            .select('id, role')
            .eq('email', user.email)
            .is('accepted_at', null)
            .gte('expires_at', now)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          // Determine role from invitation or default to 'user'
          const role = invitation?.role || 'user'

          // Create new user with role
          await supabase.from('users').insert({
            email: user.email,
            name: user.name,
            avatar_url: user.image,
            github_id: profile?.id?.toString() || account?.providerAccountId,
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
      } catch (error) {
        console.error('Error syncing user to Supabase:', error)
      }
    },
  },
  pages: {
    signIn: '/login',
  },
})
