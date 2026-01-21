import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const redirect = requestUrl.searchParams.get('redirect') || '/dashboard'
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Check if user has an organization, if not create one
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: existingUser } = await supabase
          .from('users')
          .select('organization_id')
          .eq('id', user.id)
          .single()

        if (!existingUser?.organization_id) {
          // Create organization for new user
          const { data: org } = await supabase
            .from('organizations')
            .insert({
              name: user.user_metadata.full_name || user.email?.split('@')[0] || 'My Organization',
              slug: `org-${user.id.slice(0, 8)}`,
            })
            .select()
            .single()

          if (org) {
            // Update user with organization and create user record
            await supabase
              .from('users')
              .upsert({
                id: user.id,
                email: user.email!,
                full_name: user.user_metadata.full_name,
                avatar_url: user.user_metadata.avatar_url,
                organization_id: org.id,
                role: 'owner',
              })
          }
        }
      }

      return NextResponse.redirect(`${origin}${redirect}`)
    }
  }

  // Auth error - redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
