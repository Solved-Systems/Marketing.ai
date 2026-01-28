import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(
      new URL(`/integrations/github?error=${encodeURIComponent(error)}`, request.url)
    )
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/integrations/github?error=no_code', request.url)
    )
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_APP_CLIENT_ID,
        client_secret: process.env.GITHUB_APP_CLIENT_SECRET,
        code,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error)
    }

    const accessToken = tokenData.access_token

    // Get user info from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    })

    const userData = await userResponse.json()

    // Save connection to database
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Not authenticated')
    }

    const { data: profile } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      throw new Error('Organization not found')
    }

    // Check if connection already exists
    const { data: existing } = await supabase
      .from('github_connections')
      .select('id')
      .eq('organization_id', profile.organization_id)
      .eq('account_login', userData.login)
      .single()

    if (existing) {
      // Update existing connection
      await supabase
        .from('github_connections')
        .update({
          access_token_encrypted: accessToken, // In production, encrypt this!
          account_avatar_url: userData.avatar_url,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
    } else {
      // Create new connection
      await supabase
        .from('github_connections')
        .insert({
          organization_id: profile.organization_id,
          installation_id: userData.id,
          account_type: userData.type === 'Organization' ? 'organization' : 'user',
          account_login: userData.login,
          account_avatar_url: userData.avatar_url,
          access_token_encrypted: accessToken, // In production, encrypt this!
          is_active: true,
        })
    }

    return NextResponse.redirect(
      new URL('/integrations/github?success=true', request.url)
    )
  } catch (error) {
    console.error('GitHub OAuth error:', error)
    return NextResponse.redirect(
      new URL(`/integrations/github?error=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`, request.url)
    )
  }
}
