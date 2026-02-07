import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateApiKey, encryptToken } from '@/lib/mcp/auth'

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email)
    .single()

  if (!user) return Response.json({ error: 'User not found' }, { status: 404 })

  const { data: keys } = await supabase
    .from('mcp_keys')
    .select('id, name, key_prefix, scopes, default_brand_id, last_used_at, created_at, revoked_at')
    .eq('user_id', user.id)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })

  return Response.json({ keys: keys || [] })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email)
    .single()

  if (!user) return Response.json({ error: 'User not found' }, { status: 404 })

  const body = await request.json()
  const { name, defaultBrandId, scopes } = body as {
    name: string
    defaultBrandId?: string
    scopes?: string[]
  }

  if (!name || name.trim().length === 0) {
    return Response.json({ error: 'Key name is required' }, { status: 400 })
  }

  const { plaintext, prefix, hash } = generateApiKey()

  // Encrypt the user's GitHub access token if available
  let githubTokenEncrypted: string | null = null
  const accessToken = session.accessToken as string | undefined
  if (accessToken) {
    try {
      githubTokenEncrypted = encryptToken(accessToken)
    } catch {
      // Continue without GitHub token encryption
    }
  }

  const { error } = await supabase.from('mcp_keys').insert({
    user_id: user.id,
    name: name.trim(),
    key_prefix: prefix,
    key_hash: hash,
    github_access_token_encrypted: githubTokenEncrypted,
    default_brand_id: defaultBrandId || null,
    scopes: scopes || ['images', 'videos', 'github'],
  })

  if (error) {
    return Response.json({ error: 'Failed to create key' }, { status: 500 })
  }

  return Response.json({
    key: plaintext,
    prefix,
    name: name.trim(),
  })
}

export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email)
    .single()

  if (!user) return Response.json({ error: 'User not found' }, { status: 404 })

  const { searchParams } = new URL(request.url)
  const keyId = searchParams.get('id')
  if (!keyId) return Response.json({ error: 'Key ID required' }, { status: 400 })

  const { error } = await supabase
    .from('mcp_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', keyId)
    .eq('user_id', user.id)

  if (error) {
    return Response.json({ error: 'Failed to revoke key' }, { status: 500 })
  }

  return Response.json({ success: true })
}
