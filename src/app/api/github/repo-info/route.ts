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

    // Search for logos by listing directories and finding image files
    const logoKeywords = ['logo', 'icon', 'favicon', 'brand', 'mark', 'vizual', 'symbol']
    const imageExtensions = ['.png', '.svg', '.jpg', '.jpeg', '.webp']

    interface LogoCandidate {
      path: string
      downloadUrl: string
      size: number
      score: number
    }

    async function findLogosInDirectory(dirPath: string): Promise<LogoCandidate[]> {
      try {
        const url = `https://api.github.com/repos/${repo}/contents/${dirPath}`
        const response = await fetch(url, { headers })
        if (!response.ok) return []
        const contents = await response.json()
        if (!Array.isArray(contents)) return []

        return contents
          .filter((item: { type: string; name: string }) => {
            if (item.type !== 'file') return false
            const name = item.name.toLowerCase()
            return imageExtensions.some(ext => name.endsWith(ext))
          })
          .map((item: { name: string; download_url: string | null; size: number; path: string }) => {
            const nameLower = item.name.toLowerCase()
            const nameWithoutExt = nameLower.replace(/\.[^.]+$/, '')
            // Score based on keywords in filename
            let score = 0
            if (nameLower.includes('logo')) score += 100
            if (nameLower.includes('icon')) score += 50
            if (nameLower.includes('favicon')) score += 50
            if (nameLower.includes('brand')) score += 80
            if (nameLower.includes('mark')) score += 40
            if (nameLower.includes('symbol')) score += 40
            if (nameLower.includes('emblem')) score += 40
            // Boost if it's in a likely logo directory
            if (dirPath === '' || dirPath === 'public' || dirPath === '.github') score += 10
            // Exclude tutorial/screenshot images
            if (nameLower.includes('tutorial')) score -= 100
            if (nameLower.includes('screenshot')) score -= 100
            if (nameLower.includes('coding')) score -= 50
            if (nameLower.includes('example')) score -= 30
            if (nameLower.includes('demo')) score -= 30
            // Include repo name matches (exact match gets higher score)
            const repoName = repo?.split('/')[1]?.toLowerCase() || ''
            if (repoName) {
              if (nameWithoutExt === repoName) score += 120 // Exact match like "vizual.png"
              else if (nameLower.includes(repoName)) score += 60
            }

            const filePath = dirPath ? `${dirPath}/${item.name}` : item.name
            // For private repos, download_url is null - use our proxy endpoint
            const downloadUrl = item.download_url || `/api/github/file?repo=${encodeURIComponent(repo!)}&path=${encodeURIComponent(filePath)}`

            return {
              path: filePath,
              downloadUrl,
              size: item.size,
              score,
            }
          })
          .filter((item: LogoCandidate) => item.score > -50) // Filter out obvious non-logos
      } catch {
        return []
      }
    }

    // Search multiple directories for logos (including root and common locations)
    const logoDirectories = [
      '',  // root directory
      'public',
      'public/images',
      'public/img',
      'public/assets',
      'src/assets',
      'src/assets/images',
      'src/images',
      'assets',
      'assets/images',
      'images',
      'img',
      'static',
      'static/images',
      'app',
      '.github',
    ]
    const logoResults = await Promise.all(logoDirectories.map(dir => findLogosInDirectory(dir)))
    let logosFound = logoResults.flat()

    // If no images with logo keywords found, include all images with score >= 0
    const keywordMatches = logosFound.filter(l => l.score > 0)
    if (keywordMatches.length === 0) {
      // No keyword matches - keep all images but boost common logo names
      logosFound = logosFound.map(logo => {
        const nameLower = logo.path.toLowerCase()
        // Boost common logo filenames even without keywords
        if (nameLower.match(/\/(logo|icon|brand|mark|favicon|symbol)\./)) {
          return { ...logo, score: logo.score + 50 }
        }
        return logo
      })
    }

    // Sort by score (highest first), then by size
    logosFound.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return b.size - a.size
    })

    // Limit to top 8 most relevant
    logosFound = logosFound.slice(0, 8)

    // Fetch styling files to extract colors
    const styleFiles = [
      'tailwind.config.js',
      'tailwind.config.ts',
      'src/app/globals.css',
      'app/globals.css',
      'styles/globals.css',
      'src/styles/globals.css',
      'src/index.css',
      'src/App.css',
    ]

    const styleContents = await Promise.all(
      styleFiles.map(path => fetchFileContent(repo, path, headers))
    )

    // Extract colors from all style files
    const allColors: string[] = []
    const styleFilesFound: { path: string; colors: string[] }[] = []

    styleFiles.forEach((path, index) => {
      const content = styleContents[index]
      if (content) {
        const colors = extractColors(content)
        if (colors.length > 0) {
          styleFilesFound.push({ path, colors })
          allColors.push(...colors)
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

    // Deduplicate colors
    const uniqueColors = [...new Set(allColors)]

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
      logos: logosFound,
    })
  } catch (error) {
    console.error('Error fetching repo info:', error)
    return NextResponse.json({ error: 'Failed to fetch repo info' }, { status: 500 })
  }
}
