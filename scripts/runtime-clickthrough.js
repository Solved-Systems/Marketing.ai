const { chromium } = require('playwright')
const { encode } = require('@auth/core/jwt')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
require('dotenv').config({ path: '/Users/jeffreybernard/MRKTCMD/.env.local' })

const BASE_URL = 'http://127.0.0.1:3000'
const USER_ID = '508422af-db8e-4b36-9e57-5c18f5867759'
const USER_EMAIL = 'jeff@solvedsystems.com'

async function makeSessionToken() {
  return encode({
    token: {
      name: 'Jeff Bernard',
      email: USER_EMAIL,
      picture: null,
      sub: USER_ID,
      accessToken: 'runtime-clickthrough',
    },
    secret: process.env.AUTH_SECRET,
    salt: 'authjs.session-token',
  })
}

async function expectVisible(page, selector, label) {
  const element = page.locator(selector)
  await element.first().waitFor({ state: 'visible', timeout: 20000 })
  console.log(`PASS: ${label}`)
}

async function textValue(page, selector) {
  const val = await page.locator(selector).first().inputValue()
  return (val || '').trim()
}

function resolveChromiumExecutablePath() {
  if (process.env.PLAYWRIGHT_EXECUTABLE_PATH) return process.env.PLAYWRIGHT_EXECUTABLE_PATH
  if (process.platform !== 'darwin') return undefined

  const cacheRoot = path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright')
  if (!fs.existsSync(cacheRoot)) return undefined

  const shellDirs = fs
    .readdirSync(cacheRoot)
    .filter((name) => name.startsWith('chromium_headless_shell-'))
    .sort()
    .reverse()

  for (const dir of shellDirs) {
    const base = path.join(cacheRoot, dir)
    const candidates = [
      path.join(base, 'chrome-headless-shell-mac-x64', 'chrome-headless-shell'),
      path.join(base, 'chrome-headless-shell-mac-arm64', 'chrome-headless-shell'),
    ]
    const match = candidates.find((candidate) => fs.existsSync(candidate))
    if (match) return match
  }

  return undefined
}

async function runDesktop(context) {
  const page = await context.newPage()
  await page.setViewportSize({ width: 1440, height: 900 })

  await page.goto(`${BASE_URL}/brands`, { waitUntil: 'networkidle' })
  await expectVisible(page, 'h1:has-text("Brands")', 'brands page renders for authenticated session')

  const firstBrandLink = page.locator('a[href^="/brands/"]:not([href="/brands/new"])').first()
  await firstBrandLink.waitFor({ state: 'visible', timeout: 20000 })
  const href = await firstBrandLink.getAttribute('href')
  if (!href) throw new Error('No brand href found')
  const brandId = href.split('/')[2]
  console.log(`INFO: Using brand ${brandId}`)

  await firstBrandLink.click()
  await page.waitForURL(/\/brands\/[a-f0-9-]+$/, { timeout: 20000 })
  await expectVisible(page, 'button:has-text("Create Content")', 'brand detail create content action visible')

  await page.click('button:has-text("Create Content")')
  await page.waitForURL(/\/brands\/[a-f0-9-]+\/chat$/, { timeout: 20000 })

  await expectVisible(page, 'aside:has-text("New chat")', 'desktop chat sidebar visible')
  await expectVisible(page, 'input[placeholder="Search chats"]', 'desktop sidebar search input visible')
  await expectVisible(page, 'textarea[placeholder*="Ask the agent"]', 'chat input visible')

  await page.goto(`${BASE_URL}/brands/${brandId}/create/image`, { waitUntil: 'networkidle' })
  await page.waitForURL(/\/brands\/[a-f0-9-]+\/chat\?workflow=image$/, { timeout: 20000 })
  const imagePrefill = await textValue(page, 'textarea[placeholder*="Ask the agent"]')
  if (!imagePrefill.includes('Generate a social image pack')) {
    throw new Error(`Image workflow prefill missing. Got: ${imagePrefill}`)
  }
  console.log('PASS: /create/image redirects and pre-fills chat workflow prompt')

  await page.goto(`${BASE_URL}/brands/${brandId}/create/post`, { waitUntil: 'networkidle' })
  await page.waitForURL(/\/brands\/[a-f0-9-]+\/chat\?workflow=post$/, { timeout: 20000 })
  const postPrefill = await textValue(page, 'textarea[placeholder*="Ask the agent"]')
  if (!postPrefill.includes('Create a social post set')) {
    throw new Error(`Post workflow prefill missing. Got: ${postPrefill}`)
  }
  console.log('PASS: /create/post redirects and pre-fills chat workflow prompt')

  await page.goto(`${BASE_URL}/videos`, { waitUntil: 'networkidle' })
  await expectVisible(page, 'h1:has-text("Content Library")', 'content library page renders')

  const brandButtons = page.locator('button').filter({ has: page.locator('p.font-medium') })
  const count = await brandButtons.count()
  if (count > 0) {
    await brandButtons.first().click()
    await page.waitForURL(/\/brands\/[a-f0-9-]+\/chat$/, { timeout: 20000 })
    console.log('PASS: /videos brand selector routes into /chat')
  } else {
    console.log('WARN: No brand button found on /videos to validate routing')
  }

  await page.screenshot({ path: '/tmp/mrktcmd-desktop-chat.png', fullPage: true })
  console.log('INFO: Desktop screenshot saved to /tmp/mrktcmd-desktop-chat.png')

  return { brandId }
}

async function runMobile(context, brandId) {
  const page = await context.newPage()
  await page.setViewportSize({ width: 390, height: 844 })

  await page.goto(`${BASE_URL}/brands/${brandId}/chat`, { waitUntil: 'networkidle' })
  await expectVisible(page, 'button:has(svg.lucide-panel-left)', 'mobile sidebar open button visible')

  await page.click('button:has(svg.lucide-panel-left)')
  await expectVisible(page, '[data-slot="sheet-content"] input[placeholder="Search chats"]', 'mobile sidebar opens with search')
  await expectVisible(page, '[data-slot="sheet-content"] button:has-text("New chat")', 'mobile sidebar new chat visible')

  await page.screenshot({ path: '/tmp/mrktcmd-mobile-sidebar.png', fullPage: true })
  console.log('INFO: Mobile screenshot saved to /tmp/mrktcmd-mobile-sidebar.png')
}

;(async () => {
  const token = await makeSessionToken()
  const launchOptions = { headless: true }
  const executablePath = resolveChromiumExecutablePath()
  if (executablePath) {
    launchOptions.executablePath = executablePath
    console.log(`INFO: Using Chromium executable: ${executablePath}`)
  }
  const browser = await chromium.launch(launchOptions)

  try {
    const context = await browser.newContext()
    await context.addCookies([
      {
        name: 'authjs.session-token',
        value: token,
        url: BASE_URL,
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ])

    const { brandId } = await runDesktop(context)
    await runMobile(context, brandId)

    console.log('DONE: Runtime click-through completed successfully')
  } finally {
    await browser.close()
  }
})().catch((error) => {
  console.error('FAILED:', error)
  process.exit(1)
})
