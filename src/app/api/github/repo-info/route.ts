import { auth } from '@/auth'
import { NextResponse } from 'next/server'

// Convert oklch to hex
function oklchToHex(l: number, c: number, h: number): string {
  // Convert OKLCH to linear sRGB via OKLab
  const a_ = c * Math.cos(h * Math.PI / 180)
  const b_ = c * Math.sin(h * Math.PI / 180)

  // OKLab to linear RGB
  const l_ = l + 0.3963377774 * a_ + 0.2158037573 * b_
  const m_ = l - 0.1055613458 * a_ - 0.0638541728 * b_
  const s_ = l - 0.0894841775 * a_ - 1.2914855480 * b_

  const l3 = l_ * l_ * l_
  const m3 = m_ * m_ * m_
  const s3 = s_ * s_ * s_

  let r = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3
  let g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3
  let b = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3

  // Apply gamma correction
  const gammaCorrect = (x: number) => x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1/2.4) - 0.055
  r = Math.round(Math.min(255, Math.max(0, gammaCorrect(r) * 255)))
  g = Math.round(Math.min(255, Math.max(0, gammaCorrect(g) * 255)))
  b = Math.round(Math.min(255, Math.max(0, gammaCorrect(b) * 255)))

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

// Convert HSL to hex
function hslToHex(h: number, s: number, l: number): string {
  s = s / 100
  l = l / 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = l - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }
  r = Math.round((r + m) * 255)
  g = Math.round((g + m) * 255)
  b = Math.round((b + m) * 255)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

// Convert RGB to hex
function rgbToHex(r: number, g: number, b: number): string {
  return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`
}

interface ExtractedColor {
  hex: string
  name?: string // CSS variable name like "primary", "accent", etc.
  source?: string // Where it came from
}

interface ExtractedFont {
  family: string
  source?: string
}

// Extract all color formats from content
function extractColors(content: string): ExtractedColor[] {
  const colors: ExtractedColor[] = []
  const seenHex = new Set<string>()

  // Helper to add color with deduplication
  const addColor = (hex: string, name?: string) => {
    const normalized = hex.toLowerCase()
    // Filter out pure black/white/gray
    const grays = ['#fff', '#ffffff', '#000', '#000000', '#111', '#111111', '#222', '#222222', '#333', '#333333', '#444', '#444444', '#555', '#555555', '#666', '#666666', '#777', '#777777', '#888', '#888888', '#999', '#999999', '#aaa', '#aaaaaa', '#bbb', '#bbbbbb', '#ccc', '#cccccc', '#ddd', '#dddddd', '#eee', '#eeeeee']
    if (grays.includes(normalized)) return
    if (seenHex.has(normalized)) return
    seenHex.add(normalized)
    colors.push({ hex: normalized, name })
  }

  // 1. Extract CSS variables with color values
  // Match patterns like: --primary: oklch(0.75 0.18 55);
  const cssVarPattern = /--([\w-]+):\s*(oklch|hsl|rgb|#)([^;]+);/gi
  let match
  while ((match = cssVarPattern.exec(content)) !== null) {
    const varName = match[1]
    const colorType = match[2].toLowerCase()
    const colorValue = match[3].trim()

    // Skip non-color variables (radius, font, etc.)
    if (varName.includes('radius') || varName.includes('font') || varName.includes('spacing')) continue

    try {
      if (colorType === 'oklch') {
        // Parse oklch(0.75 0.18 55) or oklch(0.75 0.18 55 / 0.5)
        const oklchMatch = colorValue.match(/\(?\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/)
        if (oklchMatch) {
          const hex = oklchToHex(parseFloat(oklchMatch[1]), parseFloat(oklchMatch[2]), parseFloat(oklchMatch[3]))
          addColor(hex, varName)
        }
      } else if (colorType === 'hsl') {
        // Parse hsl(210 50% 60%) or hsl(210, 50%, 60%)
        const hslMatch = colorValue.match(/\(?\s*([\d.]+)[,\s]+([\d.]+)%?[,\s]+([\d.]+)%?/)
        if (hslMatch) {
          const hex = hslToHex(parseFloat(hslMatch[1]), parseFloat(hslMatch[2]), parseFloat(hslMatch[3]))
          addColor(hex, varName)
        }
      } else if (colorType === 'rgb') {
        // Parse rgb(255, 128, 0) or rgb(255 128 0)
        const rgbMatch = colorValue.match(/\(?\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/)
        if (rgbMatch) {
          const hex = rgbToHex(parseFloat(rgbMatch[1]), parseFloat(rgbMatch[2]), parseFloat(rgbMatch[3]))
          addColor(hex, varName)
        }
      } else if (colorType === '#') {
        // Already hex
        addColor('#' + colorValue.replace(/[^0-9a-fA-F]/g, '').slice(0, 6), varName)
      }
    } catch {
      // Invalid color, skip
    }
  }

  // 2. Extract standalone oklch colors (not in CSS vars)
  const oklchPattern = /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/gi
  while ((match = oklchPattern.exec(content)) !== null) {
    try {
      const hex = oklchToHex(parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3]))
      addColor(hex)
    } catch {
      // Invalid, skip
    }
  }

  // 3. Extract standalone hsl colors
  const hslPattern = /hsl\(\s*([\d.]+)[,\s]+([\d.]+)%?[,\s]+([\d.]+)%?/gi
  while ((match = hslPattern.exec(content)) !== null) {
    try {
      const hex = hslToHex(parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3]))
      addColor(hex)
    } catch {
      // Invalid, skip
    }
  }

  // 4. Extract standalone rgb colors
  const rgbPattern = /rgb\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/gi
  while ((match = rgbPattern.exec(content)) !== null) {
    try {
      const hex = rgbToHex(parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3]))
      addColor(hex)
    } catch {
      // Invalid, skip
    }
  }

  // 5. Extract hex colors
  const hexPattern = /#(?:[0-9a-fA-F]{3}){1,2}\b/g
  while ((match = hexPattern.exec(content)) !== null) {
    let hex = match[0].toLowerCase()
    // Expand 3-char hex to 6-char
    if (hex.length === 4) {
      hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    }
    addColor(hex)
  }

  // 6. Extract Tailwind config theme colors
  // Match: primary: '#ff8c00' or "primary": "#ff8c00" or primary: { DEFAULT: '#ff8c00' }
  const tailwindColorPattern = /['"]?(primary|secondary|accent|brand|success|warning|error|info)['"]?\s*:\s*['"]?(#[0-9a-fA-F]{3,6})['"]?/gi
  while ((match = tailwindColorPattern.exec(content)) !== null) {
    addColor(match[2], match[1])
  }

  return colors.slice(0, 30) // Limit to 30 colors
}

// Extract font families from content
function extractFonts(content: string): ExtractedFont[] {
  const fonts: ExtractedFont[] = []
  const seenFonts = new Set<string>()

  const addFont = (family: string, source?: string) => {
    // Clean up font name
    family = family.replace(/['"]/g, '').trim()
    // Skip generic fonts and CSS vars
    const generics = ['sans-serif', 'serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-monospace', 'inherit', 'initial']
    if (generics.includes(family.toLowerCase())) return
    if (family.startsWith('var(')) return
    if (family.startsWith('--')) return

    const normalized = family.toLowerCase()
    if (seenFonts.has(normalized)) return
    seenFonts.add(normalized)
    fonts.push({ family, source })
  }

  // 1. Extract from @font-face declarations
  const fontFacePattern = /font-family:\s*['"]?([^'";,\n]+)['"]?/gi
  let match
  while ((match = fontFacePattern.exec(content)) !== null) {
    addFont(match[1], '@font-face')
  }

  // 2. Extract from CSS var definitions: --font-sans: 'Inter', sans-serif
  const fontVarPattern = /--font-[\w-]+:\s*['"]?([^'";,\n]+)/gi
  while ((match = fontVarPattern.exec(content)) !== null) {
    addFont(match[1], 'CSS variable')
  }

  // 3. Extract from import statements: @import url('...fonts.googleapis.com/css2?family=Inter...')
  const googleFontPattern = /fonts\.googleapis\.com\/css2?\?family=([^&'")\s]+)/gi
  while ((match = googleFontPattern.exec(content)) !== null) {
    const fontName = decodeURIComponent(match[1]).replace(/\+/g, ' ').split(':')[0]
    addFont(fontName, 'Google Fonts import')
  }

  // 4. Extract from next/font imports: const inter = Inter({ ... }) or import { Inter } from 'next/font/google'
  const nextFontPattern = /(?:import\s*{\s*|const\s+\w+\s*=\s*)(Inter|Roboto|Open_Sans|Lato|Montserrat|Poppins|Source_Sans|Raleway|IBM_Plex_Mono|JetBrains_Mono|Fira_Code|Source_Code_Pro|Ubuntu|Nunito|Playfair_Display|Merriweather|Work_Sans|DM_Sans|Space_Grotesk|Outfit|Plus_Jakarta_Sans)/g
  while ((match = nextFontPattern.exec(content)) !== null) {
    const fontName = match[1].replace(/_/g, ' ')
    addFont(fontName, 'next/font')
  }

  // 5. Extract from Tailwind config fontFamily
  const tailwindFontPattern = /fontFamily:\s*{[^}]*['"]?(\w+)['"]?:\s*\[['"]([^'"]+)['"]/gi
  while ((match = tailwindFontPattern.exec(content)) !== null) {
    addFont(match[2], 'tailwind.config')
  }

  return fonts.slice(0, 10)
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

    // Fetch styling files to extract colors and fonts
    // Include more comprehensive list of potential style/config files
    const styleFiles = [
      // Tailwind configs
      'tailwind.config.js',
      'tailwind.config.ts',
      'tailwind.config.mjs',
      // CSS files
      'src/app/globals.css',
      'app/globals.css',
      'styles/globals.css',
      'src/styles/globals.css',
      'src/index.css',
      'src/App.css',
      'styles/index.css',
      // Theme files
      'src/styles/theme.css',
      'src/theme.css',
      'theme/index.css',
      'styles/variables.css',
      'src/styles/variables.css',
      // SCSS
      'src/styles/variables.scss',
      'src/styles/_variables.scss',
      'styles/variables.scss',
      // Layout files (may have font imports)
      'src/app/layout.tsx',
      'src/app/layout.js',
      'app/layout.tsx',
      'app/layout.js',
      'pages/_app.tsx',
      'pages/_app.js',
    ]

    const styleContents = await Promise.all(
      styleFiles.map(path => fetchFileContent(repo, path, headers))
    )

    // Extract colors and fonts from all style files
    const allColors: ExtractedColor[] = []
    const allFonts: ExtractedFont[] = []
    const styleFilesFound: { path: string; colors: ExtractedColor[] }[] = []
    const fontFilesFound: { path: string; fonts: ExtractedFont[] }[] = []

    styleFiles.forEach((path, index) => {
      const content = styleContents[index]
      if (content) {
        const colors = extractColors(content)
        if (colors.length > 0) {
          styleFilesFound.push({ path, colors })
          allColors.push(...colors)
        }
        const fonts = extractFonts(content)
        if (fonts.length > 0) {
          fontFilesFound.push({ path, fonts })
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

    // Deduplicate colors - prefer named colors (primary, accent, etc.)
    const seenHex = new Set<string>()
    const uniqueColors: ExtractedColor[] = []

    // First pass: add named colors
    for (const color of allColors) {
      if (color.name && !seenHex.has(color.hex)) {
        seenHex.add(color.hex)
        uniqueColors.push(color)
      }
    }
    // Second pass: add unnamed colors
    for (const color of allColors) {
      if (!color.name && !seenHex.has(color.hex)) {
        seenHex.add(color.hex)
        uniqueColors.push(color)
      }
    }

    // Deduplicate fonts
    const seenFontNames = new Set<string>()
    const uniqueFonts: ExtractedFont[] = []
    for (const font of allFonts) {
      const normalized = font.family.toLowerCase()
      if (!seenFontNames.has(normalized)) {
        seenFontNames.add(normalized)
        uniqueFonts.push(font)
      }
    }

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
        sources: fontFilesFound,
      },
      logos: logosFound,
    })
  } catch (error) {
    console.error('Error fetching repo info:', error)
    return NextResponse.json({ error: 'Failed to fetch repo info' }, { status: 500 })
  }
}
