import { randomBytes, createHash, createCipheriv, createDecipheriv } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

const KEY_PREFIX = 'mrkt_'
const ALGORITHM = 'aes-256-gcm'
let warnedAboutMcpKeyFallback = false

function getEncryptionKey(): Buffer {
  const configured = process.env.MCP_ENCRYPTION_KEY?.trim()
  if (configured) {
    const decoded = Buffer.from(configured, 'base64')
    if (decoded.length !== 32) {
      throw new Error('MCP_ENCRYPTION_KEY must be a base64-encoded 32-byte key')
    }
    return decoded
  }

  const authSecret = process.env.AUTH_SECRET?.trim()
  if (!authSecret) {
    throw new Error('MCP_ENCRYPTION_KEY not configured and AUTH_SECRET is missing')
  }

  if (!warnedAboutMcpKeyFallback) {
    console.warn('MCP_ENCRYPTION_KEY missing; deriving MCP encryption key from AUTH_SECRET')
    warnedAboutMcpKeyFallback = true
  }

  return createHash('sha256').update(authSecret).digest()
}

export function generateApiKey(): { plaintext: string; prefix: string; hash: string } {
  const raw = randomBytes(32)
  const plaintext = KEY_PREFIX + raw.toString('hex')
  const prefix = plaintext.substring(0, 12)
  const hash = hashApiKey(plaintext)
  return { plaintext, prefix, hash }
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

export function encryptToken(token: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  // Format: iv:tag:encrypted (all base64)
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`
}

export function decryptToken(encrypted: string): string {
  const key = getEncryptionKey()
  const [ivB64, tagB64, dataB64] = encrypted.split(':')
  const iv = Buffer.from(ivB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const data = Buffer.from(dataB64, 'base64')
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}

export interface McpUserContext {
  userId: string
  keyId: string
  scopes: string[]
  defaultBrandId: string | null
  githubAccessToken: string | null
}

export async function validateMcpKey(bearerToken: string): Promise<McpUserContext> {
  const hash = hashApiKey(bearerToken)
  const supabase = createAdminClient()

  const { data: key, error } = await supabase
    .from('mcp_keys')
    .select('id, user_id, scopes, default_brand_id, github_access_token_encrypted, expires_at, revoked_at')
    .eq('key_hash', hash)
    .is('revoked_at', null)
    .single()

  if (error || !key) {
    throw new Error('Invalid MCP credential')
  }

  if (key.expires_at && new Date(key.expires_at) < new Date()) {
    throw new Error('MCP credential expired')
  }

  // Update last_used_at (fire and forget)
  supabase
    .from('mcp_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', key.id)
    .then(() => {})

  let githubAccessToken: string | null = null
  if (key.github_access_token_encrypted) {
    try {
      githubAccessToken = decryptToken(key.github_access_token_encrypted)
    } catch {
      // Token decryption failed, continue without GitHub access
    }
  }

  return {
    userId: key.user_id,
    keyId: key.id,
    scopes: key.scopes || ['images', 'videos', 'github'],
    defaultBrandId: key.default_brand_id,
    githubAccessToken,
  }
}
