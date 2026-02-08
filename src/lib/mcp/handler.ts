import type { NextApiRequest, NextApiResponse } from 'next'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { randomUUID } from 'crypto'
import { createMrktMcpServer } from '@/lib/mcp/server'
import { validateMcpKey } from '@/lib/mcp/auth'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

// In-memory session storage (shared across routes, per Vercel instance)
const sessions = new Map<string, {
  transport: StreamableHTTPServerTransport
  server: McpServer
  lastActivity: number
}>()

// Session cleanup: 10-minute TTL, max 100 sessions
const SESSION_TTL_MS = 10 * 60 * 1000
setInterval(() => {
  const now = Date.now()
  for (const [sessionId, session] of sessions) {
    if (now - session.lastActivity > SESSION_TTL_MS || sessions.size > 100) {
      session.transport.close().catch(() => {})
      sessions.delete(sessionId)
    }
  }
}, 60 * 1000)

/** Parse raw body from request stream */
function parseBody(req: NextApiRequest): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString()
      try {
        resolve(JSON.parse(body))
      } catch {
        resolve(body)
      }
    })
    req.on('error', reject)
  })
}

/**
 * Shared MCP request handler.
 * @param token - The API key (from URL path or Authorization header)
 */
export async function handleMcpRequest(
  req: NextApiRequest,
  res: NextApiResponse,
  token: string,
) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, mcp-session-id, Last-Event-ID')
    res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id')
    return res.status(204).end()
  }

  // CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id')

  const sessionId = req.headers['mcp-session-id'] as string | undefined

  try {
    if (req.method === 'POST') {
      let session = sessionId ? sessions.get(sessionId) : undefined

      if (!session) {
        // Authenticate on new session creation
        const context = await validateMcpKey(token)

        const newSessionId = randomUUID()
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => newSessionId,
        })
        const server = createMrktMcpServer(context)
        await server.connect(transport)

        session = { transport, server, lastActivity: Date.now() }
        sessions.set(newSessionId, session)

        transport.onclose = () => {
          sessions.delete(newSessionId)
        }
      } else {
        session.lastActivity = Date.now()
      }

      const body = await parseBody(req)
      await session.transport.handleRequest(req, res, body)

    } else if (req.method === 'GET') {
      // SSE stream for existing session
      if (!sessionId) {
        return res.status(400).json({ error: 'mcp-session-id header required for SSE' })
      }

      const session = sessions.get(sessionId)
      if (!session) {
        return res.status(404).json({ error: 'Session not found' })
      }

      session.lastActivity = Date.now()
      await session.transport.handleRequest(req, res)

    } else if (req.method === 'DELETE') {
      if (!sessionId) {
        return res.status(400).json({ error: 'mcp-session-id header required' })
      }

      const session = sessions.get(sessionId)
      if (session) {
        await session.transport.close()
        sessions.delete(sessionId)
      }

      return res.status(204).end()

    } else {
      return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('MCP handler error:', error)
    if (!res.headersSent) {
      const message = error instanceof Error ? error.message : 'Internal server error'
      // Auth errors get 401
      if (message.includes('Invalid API key') || message.includes('Authorization') || message.includes('expired')) {
        return res.status(401).json({
          jsonrpc: '2.0',
          error: { code: -32600, message },
          id: null,
        })
      }
      return res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message },
        id: null,
      })
    }
  }
}
