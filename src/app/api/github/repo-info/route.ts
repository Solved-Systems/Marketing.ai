import { auth } from '@/auth'
import { NextResponse } from 'next/server'

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
    const styleFilesFound: { path: string; colors: string[]; content?: string }[] = []
    let tailwindConfig: { path: string; content: string } | null = null
    const stylesheets: { path: string; content: string }[] = []

    allStyleFiles.forEach((path, index) => {
      const content = styleContents[index]
      if (content) {
        const colors = extractColors(content)
        const fonts = extractFonts(content)

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
      },
      fonts: {
        extracted: uniqueFonts,
        sources: styleFilesFound.filter(s => extractFonts(s.content || '').length > 0).map(s => s.path),
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
