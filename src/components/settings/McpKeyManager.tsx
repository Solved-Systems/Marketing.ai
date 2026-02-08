'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Key, Copy, Check, Trash2, Plus } from 'lucide-react'

interface McpKey {
  id: string
  name: string
  key_prefix: string
  scopes: string[]
  last_used_at: string | null
  created_at: string
}

type Tab = 'claude-web' | 'claude-desktop' | 'vscode' | 'generic'

const MCP_KEY_STORAGE = 'mrktcmd_mcp_key'

export function McpKeyManager() {
  const [keys, setKeys] = useState<McpKey[]>([])
  const [newKeyName, setNewKeyName] = useState('')
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('claude-web')
  const [mcpBaseUrl, setMcpBaseUrl] = useState('/api/mcp')

  useEffect(() => {
    setMcpBaseUrl(`${window.location.origin}/api/mcp`)
  }, [])

  const mcpUrl = apiKey ? `${mcpBaseUrl}/${apiKey}` : null

  const fetchKeys = useCallback(async () => {
    const res = await fetch('/api/mcp/keys')
    if (res.ok) {
      const data = await res.json()
      setKeys(data.keys || [])
      return data.keys || []
    }
    return []
  }, [])

  // Auto-provision: load key from localStorage or create one
  useEffect(() => {
    const stored = localStorage.getItem(MCP_KEY_STORAGE)
    if (stored) {
      setApiKey(stored)
      fetchKeys()
      return
    }
    // No stored key — create one automatically
    ;(async () => {
      const res = await fetch('/api/mcp/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Default' }),
      })
      if (res.ok) {
        const data = await res.json()
        localStorage.setItem(MCP_KEY_STORAGE, data.key)
        setApiKey(data.key)
        fetchKeys()
      }
    })()
  }, [fetchKeys])

  const createKey = async () => {
    if (!newKeyName.trim() || loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/mcp/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        localStorage.setItem(MCP_KEY_STORAGE, data.key)
        setApiKey(data.key)
        setNewKeyName('')
        fetchKeys()
      }
    } finally {
      setLoading(false)
    }
  }

  const revokeKey = async (id: string, keyPrefix: string) => {
    await fetch(`/api/mcp/keys?id=${id}`, { method: 'DELETE' })
    // If revoking the active key, clear it and auto-provision a new one
    if (apiKey?.startsWith(keyPrefix)) {
      localStorage.removeItem(MCP_KEY_STORAGE)
      setApiKey(null)
      const res = await fetch('/api/mcp/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Default' }),
      })
      if (res.ok) {
        const data = await res.json()
        localStorage.setItem(MCP_KEY_STORAGE, data.key)
        setApiKey(data.key)
      }
    }
    fetchKeys()
  }

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never'

  const tabs: { key: Tab; label: string }[] = [
    { key: 'claude-web', label: 'Claude (web)' },
    { key: 'claude-desktop', label: 'Desktop' },
    { key: 'vscode', label: 'VS Code' },
    { key: 'generic', label: 'Other' },
  ]

  return (
    <Card className="terminal-border bg-card/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-mono text-sm">
          <Key className="h-4 w-4 text-primary" />
          mcp_api_keys
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Connection Info */}
        <div className="rounded-lg border border-border/50 bg-muted/30 p-3 sm:p-4 space-y-3 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-xs text-muted-foreground">MCP Server URL</p>
            {mcpUrl && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 font-mono text-xs shrink-0"
                onClick={() => copyText(mcpUrl, 'url')}
              >
                {copied === 'url' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            )}
          </div>
          <code className="block text-sm sm:text-xs font-mono text-primary break-all bg-background/60 rounded px-2 py-1.5">{mcpUrl ?? 'Loading...'}</code>

          {/* Setup Tabs */}
          <div className="flex gap-1 border-b border-border/50 mt-3 overflow-x-auto">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-2.5 sm:px-3 py-1.5 text-xs font-mono border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === t.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="text-xs space-y-2 pt-1">
            {activeTab === 'claude-web' && (
              <>
                <p className="text-muted-foreground">Connect from <strong>claude.ai</strong> (Pro/Max/Team):</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Go to <strong>Settings</strong> → <strong>Connectors</strong></li>
                  <li>Click <strong>Add Custom Connector</strong></li>
                  <li>Paste the MCP URL above</li>
                </ol>
                <p className="text-muted-foreground">MCP Apps render images and videos inline in chat.</p>
              </>
            )}
            {activeTab === 'claude-desktop' && (
              <>
                <p className="text-muted-foreground">
                  Add to <code className="text-primary">claude_desktop_config.json</code>:
                </p>
                <div className="relative">
                  <pre className="bg-background/80 rounded p-3 overflow-x-auto text-[11px] font-mono">
{`{
  "mcpServers": {
    "mrktcmd": {
      "url": "${mcpUrl}"
    }
  }
}`}
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-1 right-1 h-6 w-6 p-0"
                    onClick={() =>
                      copyText(
                        JSON.stringify({ mcpServers: { mrktcmd: { url: mcpUrl } } }, null, 2),
                        'desktop-config'
                      )
                    }
                  >
                    {copied === 'desktop-config' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </>
            )}
            {activeTab === 'vscode' && (
              <>
                <p className="text-muted-foreground">
                  Add to VS Code / Cursor MCP settings:
                </p>
                <div className="relative">
                  <pre className="bg-background/80 rounded p-3 overflow-x-auto text-[11px] font-mono">
{`{
  "servers": {
    "mrktcmd": {
      "type": "http",
      "url": "${mcpUrl}"
    }
  }
}`}
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-1 right-1 h-6 w-6 p-0"
                    onClick={() =>
                      copyText(
                        JSON.stringify({ servers: { mrktcmd: { type: 'http', url: mcpUrl } } }, null, 2),
                        'vscode-config'
                      )
                    }
                  >
                    {copied === 'vscode-config' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </>
            )}
            {activeTab === 'generic' && (
              <>
                <p className="text-muted-foreground">For any MCP client supporting Streamable HTTP transport:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>URL: <code className="text-primary">{mcpUrl}</code></li>
                  <li>Transport: <code className="text-primary">Streamable HTTP</code></li>
                </ul>
              </>
            )}
          </div>
        </div>

        {/* Create Key */}
        <div className="space-y-3">
          <Label className="font-mono text-sm">Create API Key</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Key name (e.g. Claude Desktop)"
              className="font-mono text-sm"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createKey()}
            />
            <Button
              variant="terminal"
              size="sm"
              onClick={createKey}
              disabled={loading || !newKeyName.trim()}
              className="shrink-0"
            >
              <Plus className="h-3 w-3 mr-1" />
              Create
            </Button>
          </div>
        </div>

        {/* Key List */}
        {keys.length > 0 && (
          <div className="space-y-2">
            <Label className="font-mono text-xs text-muted-foreground">Active Keys</Label>
            {keys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-3 py-2"
              >
                <div className="space-y-0.5">
                  <p className="font-mono text-xs font-medium">{key.name}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {key.key_prefix}... · Created {formatDate(key.created_at)} · Used {formatDate(key.last_used_at)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => revokeKey(key.id, key.key_prefix)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
