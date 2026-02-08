import type { NextApiRequest, NextApiResponse } from 'next'
import { handleMcpRequest } from '@/lib/mcp/handler'

// Disable Next.js body parsing — MCP SDK handles it
export const config = {
  api: { bodyParser: false },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const key = req.query.key as string

  if (!key?.startsWith('mrkt_')) {
    return res.status(401).json({
      jsonrpc: '2.0',
      error: { code: -32600, message: 'Invalid API key in URL' },
      id: null,
    })
  }

  return handleMcpRequest(req, res, key)
}
