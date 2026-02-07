import { App } from '@modelcontextprotocol/ext-apps'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

interface ImageResult {
  success: boolean
  images: Array<{ url: string; index?: number }>
  prompt: string
  provider: string
  count: number
  preset?: string | null
}

const appEl = document.getElementById('app')!

function parseToolResult(result: CallToolResult): ImageResult | null {
  if (!result?.content) return null
  for (const part of result.content) {
    if (part.type === 'text') {
      try {
        const data = JSON.parse(part.text)
        if (data.images && Array.isArray(data.images)) return data
      } catch { /* not JSON */ }
    }
  }
  return null
}

function renderGallery(data: ImageResult) {
  let html = ''

  // Prompt bar
  html += `<div class="prompt-display">
    <span class="label">prompt</span>${escapeHtml(data.prompt)}
    <span class="provider">${data.provider} (${data.count})</span>
  </div>`

  html += '<div class="gallery">'
  data.images.forEach((img, i) => {
    html += `
      <div class="image-card">
        <img src="${escapeAttr(img.url)}" alt="Generated image ${i + 1}" loading="lazy" />
        <div class="overlay">
          <button class="btn" data-action="download" data-index="${i}">Save</button>
          <button class="btn btn-primary" data-action="edit" data-index="${i}">Edit</button>
          <button class="btn" data-action="animate" data-index="${i}">Animate</button>
        </div>
        <div class="meta">#${i + 1}</div>
      </div>`
  })
  html += '</div>'

  appEl.innerHTML = html

  // Attach event listeners
  appEl.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => handleAction(
      btn.getAttribute('data-action')!,
      data.images[parseInt(btn.getAttribute('data-index')!)],
    ))
  })
}

let appInstance: App | null = null

async function handleAction(action: string, image: { url: string }) {
  if (!appInstance) return

  if (action === 'download') {
    window.open(image.url, '_blank')
    return
  }

  if (action === 'edit') {
    const result = await appInstance.callServerTool({
      name: 'edit_image',
      arguments: {
        prompt: 'Enhance the image quality and colors',
        imageUrl: image.url,
        preset: 'enhance',
        n: 1,
      },
    })
    const data = parseToolResult(result)
    if (data) renderGallery(data)
    return
  }

  if (action === 'animate') {
    await appInstance.callServerTool({
      name: 'generate_video',
      arguments: {
        prompt: 'Smooth cinematic animation with subtle motion',
        imageUrl: image.url,
        duration: 5,
        aspectRatio: '16:9',
      },
    })
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
      { name: 'MRKTCMD Image Gallery', version: '1.0.0' },
      {},
    )

    // Register handlers before connecting
    app.ontoolresult = (params) => {
      const result = params as unknown as CallToolResult
      const data = parseToolResult(result)
      if (data) renderGallery(data)
    }

    app.onerror = (error: Error) => {
      console.error('MCP App error:', error)
      appEl.innerHTML = `<div class="status">Error: ${escapeHtml(error.message)}</div>`
    }

    await app.connect()
    appInstance = app
  } catch (error) {
    console.error('Failed to initialize MCP App:', error)
  }
}

init()
