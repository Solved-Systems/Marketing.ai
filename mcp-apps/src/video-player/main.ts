import { App } from '@modelcontextprotocol/ext-apps'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

interface VideoStartResult {
  success: boolean
  videoId: string
  requestId?: string
  renderId?: string
  status: string
  message: string
  template?: string
  duration?: string
}

interface VideoStatusResult {
  status: string
  outputUrl?: string
  progress?: number
  message?: string
  error?: string
}

const appEl = document.getElementById('app')!

let appInstance: App | null = null
let pollTimer: ReturnType<typeof setTimeout> | null = null
let currentVideoId: string | null = null
let currentRequestId: string | null = null
let isRemotionVideo = false

function parseResult(result: CallToolResult): VideoStartResult | VideoStatusResult | null {
  if (!result?.content) return null
  for (const part of result.content) {
    if (part.type === 'text') {
      try { return JSON.parse(part.text) } catch { /* not JSON */ }
    }
  }
  return null
}

function renderProgress(status: string, progress?: number, message?: string) {
  const pct = progress ?? 0
  appEl.innerHTML = `
    <div class="player-container">
      <div class="progress-container">
        <div class="spinner"></div>
        <div class="progress-bar"><div class="progress-fill" style="width: ${pct}%"></div></div>
        <div class="status-text">
          <span class="highlight">${escapeHtml(status)}</span>
          ${message ? ` — ${escapeHtml(message)}` : ''}
        </div>
      </div>
    </div>`
}

function renderPlayer(url: string) {
  if (pollTimer) { clearTimeout(pollTimer); pollTimer = null }

  appEl.innerHTML = `
    <div class="player-container">
      <video src="${escapeAttr(url)}" controls autoplay loop playsinline></video>
      <div class="controls">
        <a class="btn btn-primary" href="${escapeAttr(url)}" target="_blank" rel="noopener">Open</a>
        <button class="btn" id="download-btn">Download</button>
      </div>
      <div class="meta">Ready</div>
    </div>`

  document.getElementById('download-btn')?.addEventListener('click', () => {
    const a = document.createElement('a')
    a.href = url
    a.download = 'mrktcmd-video.mp4'
    a.click()
  })
}

function renderError(error: string) {
  if (pollTimer) { clearTimeout(pollTimer); pollTimer = null }

  appEl.innerHTML = `
    <div class="player-container">
      <div class="progress-container">
        <div class="status-text" style="color: #ef4444;">
          Failed: ${escapeHtml(error)}
        </div>
      </div>
    </div>`
}

async function pollStatus() {
  if (!appInstance) return

  try {
    let result: CallToolResult

    if (isRemotionVideo && currentVideoId) {
      result = await appInstance.callServerTool({
        name: 'check_remotion_status',
        arguments: { videoId: currentVideoId },
      })
    } else if (currentRequestId) {
      result = await appInstance.callServerTool({
        name: 'check_video_status',
        arguments: { requestId: currentRequestId },
      })
    } else {
      return
    }

    const data = parseResult(result) as VideoStatusResult | null
    if (!data) return

    if (data.status === 'completed' && data.outputUrl) {
      renderPlayer(data.outputUrl)
      return
    }

    if (data.status === 'failed') {
      renderError(data.error || 'Generation failed')
      return
    }

    renderProgress(data.status, data.progress, data.message)
    pollTimer = setTimeout(pollStatus, 3000)
  } catch (error) {
    console.error('Poll error:', error)
    pollTimer = setTimeout(pollStatus, 5000)
  }
}

function handleToolResult(result: CallToolResult) {
  const data = parseResult(result)
  if (!data) return

  // Check if this is a video start result
  if ('videoId' in data && 'status' in data) {
    const startData = data as VideoStartResult

    if (startData.status === 'completed' && 'outputUrl' in startData) {
      renderPlayer((startData as any).outputUrl)
      return
    }

    currentVideoId = startData.videoId
    currentRequestId = startData.requestId || null
    isRemotionVideo = !!startData.renderId

    renderProgress(startData.status, undefined, startData.message)
    pollTimer = setTimeout(pollStatus, 3000)
    return
  }

  // Check if this is a status result
  if ('status' in data) {
    const statusData = data as VideoStatusResult

    if (statusData.status === 'completed' && statusData.outputUrl) {
      renderPlayer(statusData.outputUrl)
    } else if (statusData.status === 'failed') {
      renderError(statusData.error || 'Failed')
    } else {
      renderProgress(statusData.status, statusData.progress, statusData.message)
    }
  }
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeAttr(s: string) {
  return s.replace(/"/g, '&quot;')
}

async function init() {
  try {
    const app = new App(
      { name: 'MRKTCMD Video Player', version: '1.0.0' },
      {},
    )

    // Register handlers before connecting
    app.ontoolresult = (params) => {
      handleToolResult(params as unknown as CallToolResult)
    }

    app.onerror = (error: Error) => {
      console.error('MCP App error:', error)
      renderError(error.message)
    }

    await app.connect()
    appInstance = app
  } catch (error) {
    console.error('Failed to initialize MCP App:', error)
  }
}

init()
