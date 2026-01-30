import { auth } from '@/auth'
import { NextResponse } from 'next/server'

// Color context types for semantic mapping
interface ColorWithContext {
  color: string
  context: string // e.g., 'primary', 'background', 'text', 'accent', 'border', 'link'
  source: string // e.g., '--primary', 'bg-blue-500', '.btn-primary'
}

// Font context types for semantic mapping
interface FontWithContext {
  font: string
  context: string // e.g., 'heading', 'body', 'code', 'display'
  source: string // e.g., '--font-heading', 'h1', '.title'
}

// Extract hex colors from content
function extractColors(content: string): string[] {
  const hexPattern = /#(?:[0-9a-fA-F]{3}){1,2}\b/g
  const matches = content.match(hexPattern) || []
  // Deduplicate and filter out common non-brand colors
  const filtered = [...new Set(matches)].filter(c => {
    const lower = c.toLowerCase()
    // Filter out pure black/white/gray
    return !['#fff', '#ffffff', '#000', '#000000', '#111', '#222', '#333', '#444', '#555', '#666', '#777', '#888', '#999', '#aaa', '#bbb', '#ccc', '#ddd', '#eee'].includes(lower)
  })
  return filtered.slice(0, 20) // Limit to 20 colors
}

// Extract colors with their semantic context
function extractColorsWithContext(content: string): ColorWithContext[] {
  const colors: ColorWithContext[] = []
  const seen = new Set<string>()

  // Helper to add color if not seen
  const addColor = (color: string, context: string, source: string) => {
    const key = `${color.toLowerCase()}-${context}`
    if (!seen.has(key) && color.match(/^#[0-9a-fA-F]{3,6}$/i)) {
      seen.add(key)
      colors.push({ color: color.toLowerCase(), context, source })
    }
  }

  // CSS variable patterns with semantic names
  const cssVarPatterns = [
    // Primary/brand colors
    { pattern: /--(?:primary|brand)(?:-color)?[^:]*:\s*(#[0-9a-fA-F]{3,6})/gi, context: 'primary' },
    { pattern: /--(?:primary|brand)(?:-color)?[^:]*:\s*oklch\([^)]+\)/gi, context: 'primary', isOklch: true },
    // Secondary colors
    { pattern: /--secondary(?:-color)?[^:]*:\s*(#[0-9a-fA-F]{3,6})/gi, context: 'secondary' },
    // Accent colors
    { pattern: /--accent(?:-color)?[^:]*:\s*(#[0-9a-fA-F]{3,6})/gi, context: 'accent' },
    // Background colors
    { pattern: /--(?:background|bg)(?:-color)?[^:]*:\s*(#[0-9a-fA-F]{3,6})/gi, context: 'background' },
    { pattern: /--card(?:-background)?[^:]*:\s*(#[0-9a-fA-F]{3,6})/gi, context: 'cardBackground' },
    // Text/foreground colors
    { pattern: /--(?:foreground|text)(?:-color)?[^:]*:\s*(#[0-9a-fA-F]{3,6})/gi, context: 'text' },
    { pattern: /--muted(?:-foreground)?[^:]*:\s*(#[0-9a-fA-F]{3,6})/gi, context: 'mutedText' },
    // Border colors
    { pattern: /--border(?:-color)?[^:]*:\s*(#[0-9a-fA-F]{3,6})/gi, context: 'border' },
    // Link colors
    { pattern: /--link(?:-color)?[^:]*:\s*(#[0-9a-fA-F]{3,6})/gi, context: 'link' },
    // Destructive/error colors
    { pattern: /--(?:destructive|error|danger)(?:-color)?[^:]*:\s*(#[0-9a-fA-F]{3,6})/gi, context: 'destructive' },
    // Success colors
    { pattern: /--(?:success|green)(?:-color)?[^:]*:\s*(#[0-9a-fA-F]{3,6})/gi, context: 'success' },
    // Warning colors
    { pattern: /--(?:warning|yellow)(?:-color)?[^:]*:\s*(#[0-9a-fA-F]{3,6})/gi, context: 'warning' },
  ]

  for (const { pattern, context } of cssVarPatterns) {
    let match
    while ((match = pattern.exec(content)) !== null) {
      if (match[1]) {
        addColor(match[1], context, match[0].split(':')[0].trim())
      }
    }
  }

  // Tailwind config color patterns
  const tailwindColorPatterns = [
    { pattern: /primary\s*:\s*['"]?(#[0-9a-fA-F]{3,6})['"]?/gi, context: 'primary' },
    { pattern: /secondary\s*:\s*['"]?(#[0-9a-fA-F]{3,6})['"]?/gi, context: 'secondary' },
    { pattern: /accent\s*:\s*['"]?(#[0-9a-fA-F]{3,6})['"]?/gi, context: 'accent' },
    { pattern: /background\s*:\s*['"]?(#[0-9a-fA-F]{3,6})['"]?/gi, context: 'background' },
    { pattern: /foreground\s*:\s*['"]?(#[0-9a-fA-F]{3,6})['"]?/gi, context: 'text' },
  ]

  for (const { pattern, context } of tailwindColorPatterns) {
    let match
    while ((match = pattern.exec(content)) !== null) {
      if (match[1]) {
        addColor(match[1], context, `tailwind.${context}`)
      }
    }
  }

  // CSS class-based color detection
  const classPatterns = [
    // Button colors
    { pattern: /\.btn-primary[^{]*\{[^}]*(?:background|background-color)\s*:\s*(#[0-9a-fA-F]{3,6})/gi, context: 'buttonPrimary' },
    { pattern: /\.btn-secondary[^{]*\{[^}]*(?:background|background-color)\s*:\s*(#[0-9a-fA-F]{3,6})/gi, context: 'buttonSecondary' },
    // Link colors
    { pattern: /a\s*\{[^}]*color\s*:\s*(#[0-9a-fA-F]{3,6})/gi, context: 'link' },
    { pattern: /a:hover[^{]*\{[^}]*color\s*:\s*(#[0-9a-fA-F]{3,6})/gi, context: 'linkHover' },
    // Heading colors
    { pattern: /h[1-6][^{]*\{[^}]*color\s*:\s*(#[0-9a-fA-F]{3,6})/gi, context: 'heading' },
    // Body colors
    { pattern: /body[^{]*\{[^}]*(?:background|background-color)\s*:\s*(#[0-9a-fA-F]{3,6})/gi, context: 'pageBackground' },
    { pattern: /body[^{]*\{[^}]*color\s*:\s*(#[0-9a-fA-F]{3,6})/gi, context: 'bodyText' },
  ]

  for (const { pattern, context } of classPatterns) {
    let match
    while ((match = pattern.exec(content)) !== null) {
      if (match[1]) {
        addColor(match[1], context, `class.${context}`)
      }
    }
  }

  return colors
}

// Extract fonts with their semantic context
function extractFontsWithContext(content: string): FontWithContext[] {
  const fonts: FontWithContext[] = []
  const seen = new Set<string>()

  const genericFonts = ['inherit', 'initial', 'unset', 'sans-serif', 'serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-sans-serif', 'ui-serif', 'ui-monospace']

  // Helper to add font if not seen
  const addFont = (font: string, context: string, source: string) => {
    const cleanFont = font.trim().replace(/^["']|["']$/g, '').trim()
    if (!cleanFont || genericFonts.includes(cleanFont.toLowerCase())) return
    const key = `${cleanFont.toLowerCase()}-${context}`
    if (!seen.has(key)) {
      seen.add(key)
      fonts.push({ font: cleanFont, context, source })
    }
  }

  // CSS variable font patterns
  const fontVarPatterns = [
    { pattern: /--font-(?:heading|display|title)[^:]*:\s*["']?([^;"'\n}]+)/gi, context: 'heading' },
    { pattern: /--font-(?:body|text|sans)[^:]*:\s*["']?([^;"'\n}]+)/gi, context: 'body' },
    { pattern: /--font-(?:mono|code)[^:]*:\s*["']?([^;"'\n}]+)/gi, context: 'code' },
  ]

  for (const { pattern, context } of fontVarPatterns) {
    let match
    while ((match = pattern.exec(content)) !== null) {
      if (match[1] && !match[1].startsWith('var(')) {
        const fontValue = match[1].split(',')[0] // Get first font in stack
        addFont(fontValue, context, match[0].split(':')[0].trim())
      }
    }
  }

  // Tailwind fontFamily config patterns
  const tailwindFontPatterns = [
    { pattern: /(?:heading|display|title)\s*:\s*\[\s*["']([^"']+)["']/gi, context: 'heading' },
    { pattern: /(?:sans|body|text)\s*:\s*\[\s*["']([^"']+)["']/gi, context: 'body' },
    { pattern: /(?:mono|code)\s*:\s*\[\s*["']([^"']+)["']/gi, context: 'code' },
  ]

  for (const { pattern, context } of tailwindFontPatterns) {
    let match
    while ((match = pattern.exec(content)) !== null) {
      if (match[1]) {
        addFont(match[1], context, `tailwind.fontFamily.${context}`)
      }
    }
  }

  // CSS selector-based font detection
  const selectorPatterns = [
    // Headings
    { pattern: /h[1-3][^{]*\{[^}]*font-family\s*:\s*([^;}\n]+)/gi, context: 'heading' },
    { pattern: /\.(?:heading|title|display)[^{]*\{[^}]*font-family\s*:\s*([^;}\n]+)/gi, context: 'heading' },
    // Body
    { pattern: /body[^{]*\{[^}]*font-family\s*:\s*([^;}\n]+)/gi, context: 'body' },
    { pattern: /p[^{]*\{[^}]*font-family\s*:\s*([^;}\n]+)/gi, context: 'body' },
    { pattern: /\.(?:body|text|prose)[^{]*\{[^}]*font-family\s*:\s*([^;}\n]+)/gi, context: 'body' },
    // Code
    { pattern: /(?:code|pre|\.code)[^{]*\{[^}]*font-family\s*:\s*([^;}\n]+)/gi, context: 'code' },
  ]

  for (const { pattern, context } of selectorPatterns) {
    let match
    while ((match = pattern.exec(content)) !== null) {
      if (match[1]) {
        const fontValue = match[1].split(',')[0] // Get first font in stack
        addFont(fontValue, context, `selector.${context}`)
      }
    }
  }

  // Next.js font imports with variable names
  const nextFontVarPattern = /const\s+(\w+)\s*=\s*(\w+)\s*\(\s*\{[^}]*variable\s*:\s*["']([^"']+)["']/g
  let match
  while ((match = nextFontVarPattern.exec(content)) !== null) {
    const varName = match[1]
    const fontName = match[2].replace(/_/g, ' ')
    const cssVar = match[3]

    // Infer context from variable name or CSS variable
    let context = 'body'
    if (cssVar.includes('heading') || cssVar.includes('display') || varName.toLowerCase().includes('heading')) {
      context = 'heading'
    } else if (cssVar.includes('mono') || cssVar.includes('code') || varName.toLowerCase().includes('mono')) {
      context = 'code'
    }

    addFont(fontName, context, cssVar)
  }

  return fonts
}

// Extract font names from content (CSS, Tailwind config, etc.)
function extractFonts(content: string): string[] {
  const fonts: Set<string> = new Set()

  // Match font-family declarations in CSS
  const fontFamilyPattern = /font-family\s*:\s*([^;}\n]+)/gi
  let match
  while ((match = fontFamilyPattern.exec(content)) !== null) {
    const fontValue = match[1].trim()
    // Extract individual font names, handling quotes
    const fontNames = fontValue.split(',').map(f =>
      f.trim().replace(/^["']|["']$/g, '').trim()
    ).filter(f => f && !['inherit', 'initial', 'unset', 'sans-serif', 'serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-sans-serif', 'ui-serif', 'ui-monospace'].includes(f.toLowerCase()))
    fontNames.forEach(f => fonts.add(f))
  }

  // Match CSS variable font definitions --font-*
  const fontVarPattern = /--font-[\w-]+\s*:\s*["']?([^;"'\n}]+)/gi
  while ((match = fontVarPattern.exec(content)) !== null) {
    const fontValue = match[1].trim()
    if (fontValue && !fontValue.startsWith('var(')) {
      fonts.add(fontValue)
    }
  }

  // Match Google Fonts imports
  const googleFontsPattern = /fonts\.googleapis\.com\/css2?\?family=([^&"'\s)]+)/gi
  while ((match = googleFontsPattern.exec(content)) !== null) {
    const fontParam = decodeURIComponent(match[1])
    // Parse font family names (format: Font+Name:wght@400;700)
    const fontFamilies = fontParam.split('|').map(f => f.split(':')[0].replace(/\+/g, ' '))
    fontFamilies.forEach(f => fonts.add(f))
  }

  // Match Next.js font imports (e.g., import { Inter } from "next/font/google")
  const nextFontPattern = /from\s+["']next\/font\/google["'][^}]*\{([^}]+)\}/g
  while ((match = nextFontPattern.exec(content)) !== null) {
    const imports = match[1]
    const fontMatches = imports.match(/\b([A-Z][a-z]+(?:_[A-Z][a-z]+)*)\b/g)
    if (fontMatches) {
      fontMatches.forEach(f => fonts.add(f.replace(/_/g, ' ')))
    }
  }

  // Match Tailwind fontFamily config
  const tailwindFontPattern = /fontFamily\s*:\s*\{([^}]+)\}/gs
  while ((match = tailwindFontPattern.exec(content)) !== null) {
    const fontConfig = match[1]
    // Extract font names from arrays like: sans: ['Inter', 'system-ui']
    const arrayPattern = /["']([^"']+)["']/g
    let arrayMatch
    while ((arrayMatch = arrayPattern.exec(fontConfig)) !== null) {
      const fontName = arrayMatch[1].trim()
      if (fontName && !['sans-serif', 'serif', 'monospace', 'system-ui', 'ui-sans-serif'].includes(fontName.toLowerCase())) {
        fonts.add(fontName)
      }
    }
  }

  return Array.from(fonts).slice(0, 10) // Limit to 10 fonts
}

// Fetch file content from GitHub
async function fetchFileContent(repo: string, path: string, headers: HeadersInit): Promise<string | null> {
  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, { headers })
    if (!response.ok) return null
    const data = await response.json()
    if (data.content) {
      return Buffer.from(data.content, 'base64').toString('utf-8')
    }
    return null
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  const session = await auth()

  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const repo = searchParams.get('repo') // format: owner/repo

  if (!repo) {
    return NextResponse.json({ error: 'Missing repo parameter' }, { status: 400 })
  }

  try {
    const headers = {
      Authorization: `Bearer ${session.accessToken}`,
      Accept: 'application/vnd.github.v3+json',
    }

    // Fetch repo info, README, and package.json in parallel
    const [repoResponse, readmeResponse, packageJsonResponse] = await Promise.all([
      fetch(`https://api.github.com/repos/${repo}`, { headers }),
      fetch(`https://api.github.com/repos/${repo}/readme`, { headers }).catch(() => null),
      fetch(`https://api.github.com/repos/${repo}/contents/package.json`, { headers }).catch(() => null),
    ])

    if (!repoResponse.ok) {
      throw new Error('Failed to fetch repo')
    }

    const repoData = await repoResponse.json()

    // Get README content
    let readmeContent = null
    if (readmeResponse?.ok) {
      const readmeData = await readmeResponse.json()
      if (readmeData.content) {
        readmeContent = Buffer.from(readmeData.content, 'base64').toString('utf-8')
        // Limit README to first 3000 chars to not overwhelm the AI
        if (readmeContent.length > 3000) {
          readmeContent = readmeContent.substring(0, 3000) + '...'
        }
      }
    }

    // Get package.json content
    let packageJson = null
    if (packageJsonResponse?.ok) {
      const packageData = await packageJsonResponse.json()
      if (packageData.content) {
        try {
          packageJson = JSON.parse(Buffer.from(packageData.content, 'base64').toString('utf-8'))
        } catch {
          // Invalid JSON, ignore
        }
      }
    }

    // Fetch ALL images from public folder and subdirectories
    const imageExtensions = ['.png', '.svg', '.jpg', '.jpeg', '.webp', '.gif', '.ico']

    interface ImageFile {
      path: string
      downloadUrl: string
      size: number
    }

    async function findImagesInDirectory(dirPath: string): Promise<ImageFile[]> {
      try {
        const url = `https://api.github.com/repos/${repo}/contents/${dirPath}`
        const response = await fetch(url, { headers })
        if (!response.ok) return []
        const contents = await response.json()
        if (!Array.isArray(contents)) return []

        const images: ImageFile[] = []
        const subdirs: string[] = []

        for (const item of contents) {
          if (item.type === 'dir') {
            subdirs.push(item.path)
          } else if (item.type === 'file') {
            const name = item.name.toLowerCase()
            if (imageExtensions.some(ext => name.endsWith(ext))) {
              const downloadUrl = item.download_url || `/api/github/file?repo=${encodeURIComponent(repo!)}&path=${encodeURIComponent(item.path)}`
              images.push({
                path: item.path,
                downloadUrl,
                size: item.size,
              })
            }
          }
        }

        // Recursively search subdirectories (limit depth)
        if (subdirs.length > 0) {
          const subResults = await Promise.all(subdirs.map(dir => findImagesInDirectory(dir)))
          images.push(...subResults.flat())
        }

        return images
      } catch {
        return []
      }
    }

    // Fetch all images from public folder
    const logosFound = await findImagesInDirectory('public')

    // Fetch Tailwind config files
    const tailwindConfigFiles = [
      'tailwind.config.js',
      'tailwind.config.ts',
      'tailwind.config.mjs',
      'tailwind.config.cjs',
    ]

    // Fetch stylesheet files
    const stylesheetFiles = [
      'src/app/globals.css',
      'app/globals.css',
      'styles/globals.css',
      'src/styles/globals.css',
      'src/index.css',
      'src/App.css',
      'styles/main.css',
      'src/styles/main.css',
      'css/style.css',
      'styles.css',
    ]

    // Also check for layout files that might contain font imports
    const layoutFiles = [
      'src/app/layout.tsx',
      'src/app/layout.js',
      'app/layout.tsx',
      'app/layout.js',
      'pages/_app.tsx',
      'pages/_app.js',
    ]

    const allStyleFiles = [...tailwindConfigFiles, ...stylesheetFiles, ...layoutFiles]

    const styleContents = await Promise.all(
      allStyleFiles.map(path => fetchFileContent(repo, path, headers))
    )

    // Extract colors and fonts from all style files
    const allColors: string[] = []
    const allFonts: string[] = []
    const allColorsWithContext: ColorWithContext[] = []
    const allFontsWithContext: FontWithContext[] = []
    const styleFilesFound: { path: string; colors: string[]; content?: string }[] = []
    let tailwindConfig: { path: string; content: string } | null = null
    const stylesheets: { path: string; content: string }[] = []

    allStyleFiles.forEach((path, index) => {
      const content = styleContents[index]
      if (content) {
        const colors = extractColors(content)
        const fonts = extractFonts(content)
        const colorsWithContext = extractColorsWithContext(content)
        const fontsWithContext = extractFontsWithContext(content)

        // Store Tailwind config separately (full content)
        if (tailwindConfigFiles.includes(path)) {
          tailwindConfig = { path, content }
        }

        // Store stylesheets (full content, limited to first 5000 chars)
        if (stylesheetFiles.includes(path)) {
          stylesheets.push({
            path,
            content: content.length > 5000 ? content.substring(0, 5000) + '\n/* ... truncated ... */' : content
          })
        }

        if (colors.length > 0 || fonts.length > 0) {
          styleFilesFound.push({ path, colors, content: content.substring(0, 2000) })
          allColors.push(...colors)
          allFonts.push(...fonts)
        }

        // Add contextualized colors and fonts
        colorsWithContext.forEach(c => {
          allColorsWithContext.push({ ...c, source: `${path}:${c.source}` })
        })
        fontsWithContext.forEach(f => {
          allFontsWithContext.push({ ...f, source: `${path}:${f.source}` })
        })

        // Extract fonts from layout files too
        if (layoutFiles.includes(path)) {
          allFonts.push(...fonts)
        }
      }
    })

    // Also extract colors from README if it has color codes
    if (readmeContent) {
      const readmeColors = extractColors(readmeContent)
      if (readmeColors.length > 0) {
        styleFilesFound.push({ path: 'README.md', colors: readmeColors })
        allColors.push(...readmeColors)
      }
    }

    // Deduplicate colors and fonts
    const uniqueColors = [...new Set(allColors)]
    const uniqueFonts = [...new Set(allFonts)]

    // Deduplicate contextualized colors by context (keep first of each context)
    const seenColorContexts = new Set<string>()
    const uniqueColorsWithContext = allColorsWithContext.filter(c => {
      if (seenColorContexts.has(c.context)) return false
      seenColorContexts.add(c.context)
      return true
    })

    // Deduplicate contextualized fonts by context (keep first of each context)
    const seenFontContexts = new Set<string>()
    const uniqueFontsWithContext = allFontsWithContext.filter(f => {
      if (seenFontContexts.has(f.context)) return false
      seenFontContexts.add(f.context)
      return true
    })

    return NextResponse.json({
      name: repoData.name,
      fullName: repoData.full_name,
      description: repoData.description,
      homepage: repoData.homepage,
      topics: repoData.topics || [],
      language: repoData.language,
      stargazersCount: repoData.stargazers_count,
      readme: readmeContent,
      packageJson: packageJson ? {
        name: packageJson.name,
        description: packageJson.description,
        keywords: packageJson.keywords,
        author: packageJson.author,
      } : null,
      colors: {
        extracted: uniqueColors,
        sources: styleFilesFound,
        withContext: uniqueColorsWithContext,
      },
      fonts: {
        extracted: uniqueFonts,
        sources: styleFilesFound.filter(s => extractFonts(s.content || '').length > 0).map(s => s.path),
        withContext: uniqueFontsWithContext,
      },
      tailwindConfig: tailwindConfig,
      stylesheets: stylesheets,
      logos: logosFound,
    })
  } catch (error) {
    console.error('Error fetching repo info:', error)
    return NextResponse.json({ error: 'Failed to fetch repo info' }, { status: 500 })
  }
}
