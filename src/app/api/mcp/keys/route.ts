import { randomUUID } from 'crypto'
import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { decryptToken, encryptToken, hashApiKey } from '@/lib/mcp/auth'

interface AuthenticatedUser {
  id: string
}

interface ActiveKeyRow {
  id: string
  key_prefix: string
  scopes: string[] | null
  last_used_at: string | null
  created_at: string
  token_encrypted: string | null
}

function toGuidPreview(guid: string) {
  if (guid.length <= 14) return guid
  return `${guid.slice(0, 8)}...${guid.slice(-6)}`
}

function buildEndpoint(origin: string, guid: string) {
  return `${origin}/api/mcp?guid=${encodeURIComponent(guid)}`
}

async function getAuthenticatedUser(): Promise<{ user: AuthenticatedUser; accessToken?: string }> {
  const session = await auth()
  if (!session?.user?.email) {
    throw new Error('Unauthorized')
  }

  const supabase = createAdminClient()
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email)
    .single()

  if (!user) {
    throw new Error('User not found')
  }

  return {
    user,
    accessToken: session.accessToken as string | undefined,
  }
}

async function createGuidCredential(params: {
  userId: string
  accessToken?: string
}): Promise<{ key: Omit<ActiveKeyRow, 'token_encrypted'>; guid: string }> {
  const supabase = createAdminClient()
  const guid = randomUUID()

  const tokenEncrypted = encryptToken(guid)

  let githubTokenEncrypted: string | null = null
  if (params.accessToken) {
    try {
      githubTokenEncrypted = encryptToken(params.accessToken)
    } catch {
      githubTokenEncrypted = null
    }
  }

  const { data: inserted, error } = await supabase
    .from('mcp_keys')
    .insert({
      user_id: params.userId,
      name: 'Authenticated MCP GUID',
      key_prefix: guid.slice(0, 12),
      key_hash: hashApiKey(guid),
      token_encrypted: tokenEncrypted,
      github_access_token_encrypted: githubTokenEncrypted,
      scopes: ['images', 'videos', 'github'],
    })
    .select('id, key_prefix, scopes, last_used_at, created_at')
    .single()

  if (error || !inserted) {
    throw new Error('Failed to create MCP GUID')
  }

  return {
    key: inserted,
    guid,
  }
}

async function getLatestActiveKey(userId: string): Promise<ActiveKeyRow | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('mcp_keys')
    .select('id, key_prefix, scopes, last_used_at, created_at, token_encrypted')
    .eq('user_id', userId)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error('Failed to fetch MCP credentials')
  }

  return data
}

async function revokeAllActiveKeys(userId: string) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('mcp_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('revoked_at', null)

  if (error) {
    throw new Error('Failed to rotate MCP GUID')
  }
}

export async function GET(request: Request) {
  try {
    const { user, accessToken } = await getAuthenticatedUser()
    const origin = new URL(request.url).origin

    let activeKey = await getLatestActiveKey(user.id)
    let guid: string | null = null

    if (activeKey?.token_encrypted) {
      try {
        guid = decryptToken(activeKey.token_encrypted)
      } catch {
        guid = null
      }
    }

    if (!activeKey || !guid) {
      if (activeKey && !guid) {
        await revokeAllActiveKeys(user.id)
      }
      const created = await createGuidCredential({ userId: user.id, accessToken })
      activeKey = {
        ...created.key,
        token_encrypted: null,
      }
      guid = created.guid
    }

    return Response.json({
      endpoint: buildEndpoint(origin, guid),
      baseUrl: `${origin}/api/mcp`,
      guid,
      guidPreview: toGuidPreview(guid),
      keyId: activeKey.id,
      scopes: activeKey.scopes || ['images', 'videos', 'github'],
      lastUsedAt: activeKey.last_used_at,
      rotatedAt: activeKey.created_at,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch MCP credential'
    if (message === 'Unauthorized') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (message === 'User not found') {
      return Response.json({ error: 'User not found' }, { status: 404 })
    }
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { user, accessToken } = await getAuthenticatedUser()
    const origin = new URL(request.url).origin

    await revokeAllActiveKeys(user.id)
    const created = await createGuidCredential({ userId: user.id, accessToken })

    return Response.json({
      endpoint: buildEndpoint(origin, created.guid),
      baseUrl: `${origin}/api/mcp`,
      guid: created.guid,
      guidPreview: toGuidPreview(created.guid),
      keyId: created.key.id,
      scopes: created.key.scopes || ['images', 'videos', 'github'],
      lastUsedAt: created.key.last_used_at,
      rotatedAt: created.key.created_at,
      rotated: true,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to rotate MCP credential'
    if (message === 'Unauthorized') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (message === 'User not found') {
      return Response.json({ error: 'User not found' }, { status: 404 })
    }
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const { user } = await getAuthenticatedUser()
    await revokeAllActiveKeys(user.id)
    return Response.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to revoke MCP credential'
    if (message === 'Unauthorized') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (message === 'User not found') {
      return Response.json({ error: 'User not found' }, { status: 404 })
    }
    return Response.json({ error: message }, { status: 500 })
  }
}
