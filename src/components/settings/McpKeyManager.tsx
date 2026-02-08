'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, Copy, Key, RefreshCw, ShieldCheck } from 'lucide-react'

interface McpCredential {
  endpoint: string
  baseUrl: string
  guid: string
  guidPreview: string
  keyId: string
  scopes: string[]
  lastUsedAt: string | null
  rotatedAt: string
}

type Tab = 'claude-web' | 'claude-desktop' | 'vscode' | 'generic'

function formatDate(value: string | null) {
  if (!value) return 'Never'
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function McpKeyManager() {
  const [credential, setCredential] = useState<McpCredential | null>(null)
  const [loading, setLoading] = useState(true)
  const [rotating, setRotating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('claude-web')
  const [error, setError] = useState<string | null>(null)

  const copyText = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }, [])

  const fetchCredential = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/mcp/keys')
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error || 'Failed to load MCP credential')
      }

      const data = (await response.json()) as McpCredential
      setCredential(data)
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load MCP credential')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchCredential()
  }, [fetchCredential])

  const rotateGuid = useCallback(async () => {
    setRotating(true)
    setError(null)
    try {
      const response = await fetch('/api/mcp/keys', {
        method: 'POST',
      })

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error || 'Failed to rotate MCP GUID')
      }

      const data = (await response.json()) as McpCredential
      setCredential(data)
    } catch (rotateError) {
      setError(rotateError instanceof Error ? rotateError.message : 'Failed to rotate MCP GUID')
    } finally {
      setRotating(false)
    }
  }, [])

  const tabs: { key: Tab; label: string }[] = [
    { key: 'claude-web', label: 'Claude (web)' },
    { key: 'claude-desktop', label: 'Desktop' },
    { key: 'vscode', label: 'VS Code' },
    { key: 'generic', label: 'Other' },
  ]

  const desktopConfig = credential
    ? JSON.stringify(
        {
          mcpServers: {
            mrktcmd: {
              url: credential.endpoint,
            },
          },
        },
        null,
        2
      )
    : ''

  const vscodeConfig = credential
    ? JSON.stringify(
        {
          servers: {
            mrktcmd: {
              type: 'http',
              url: credential.endpoint,
            },
          },
        },
        null,
        2
      )
    : ''

  return (
    <Card className="terminal-border bg-card/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-mono text-sm">
          <Key className="h-4 w-4 text-primary" />
          mcp_authenticated_endpoint
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <div className="rounded-lg border border-border/50 bg-muted/20 p-4 text-sm text-muted-foreground">
            Loading authenticated MCP endpoint...
          </div>
        ) : credential ? (
          <>
            <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-mono text-primary">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  authenticated_guid
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => copyText(credential.endpoint, 'endpoint')}
                  >
                    {copied === 'endpoint' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5"
                    onClick={rotateGuid}
                    disabled={rotating}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${rotating ? 'animate-spin' : ''}`} />
                    Rotate GUID
                  </Button>
                </div>
              </div>

              <code className="block break-all rounded bg-background/80 px-3 py-2 text-xs text-primary">
                {credential.endpoint}
              </code>

              <div className="mt-3 grid gap-2 text-[11px] text-muted-foreground sm:grid-cols-3">
                <p>GUID: {credential.guidPreview}</p>
                <p>Rotated: {formatDate(credential.rotatedAt)}</p>
                <p>Last used: {formatDate(credential.lastUsedAt)}</p>
              </div>

              <p className="mt-3 text-[11px] text-muted-foreground">
                This URL is already authenticated. Treat it like a secret and rotate immediately if shared.
              </p>
            </div>

            <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-3">
              <div className="flex gap-1 border-b border-border/50">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-3 py-1.5 text-xs font-mono border-b-2 transition-colors ${
                      activeTab === tab.key
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="text-xs space-y-2 pt-1">
                {activeTab === 'claude-web' && (
                  <>
                    <p className="text-muted-foreground">Connect from <strong>claude.ai</strong>:</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>Go to <strong>Settings</strong> → <strong>Connectors</strong></li>
                      <li>Click <strong>Add Custom Connector</strong></li>
                      <li>Paste the authenticated endpoint above</li>
                      <li>No additional API key/header is required</li>
                    </ol>
                  </>
                )}

                {activeTab === 'claude-desktop' && (
                  <>
                    <p className="text-muted-foreground">
                      Add to <code className="text-primary">claude_desktop_config.json</code>:
                    </p>
                    <div className="relative">
                      <pre className="overflow-x-auto rounded bg-background/80 p-3 text-[11px] font-mono">{desktopConfig}</pre>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1 h-6 w-6 p-0"
                        onClick={() => copyText(desktopConfig, 'desktop-config')}
                      >
                        {copied === 'desktop-config' ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </>
                )}

                {activeTab === 'vscode' && (
                  <>
                    <p className="text-muted-foreground">Add to VS Code / Cursor MCP settings:</p>
                    <div className="relative">
                      <pre className="overflow-x-auto rounded bg-background/80 p-3 text-[11px] font-mono">{vscodeConfig}</pre>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1 h-6 w-6 p-0"
                        onClick={() => copyText(vscodeConfig, 'vscode-config')}
                      >
                        {copied === 'vscode-config' ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </>
                )}

                {activeTab === 'generic' && (
                  <>
                    <p className="text-muted-foreground">For Streamable HTTP MCP clients:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>
                        URL: <code className="text-primary break-all">{credential.endpoint}</code>
                      </li>
                      <li>
                        Transport: <code className="text-primary">Streamable HTTP</code>
                      </li>
                      <li>No additional auth header needed</li>
                    </ul>
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            Failed to load authenticated MCP endpoint.
          </div>
        )}

        {error && (
          <div className="rounded border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
