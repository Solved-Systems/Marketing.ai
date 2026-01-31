import { auth } from '@/auth'
import { NextResponse } from 'next/server'

interface StyleFile {
  path: string
  content: string
}

interface PublicAsset {
  path: string
  downloadUrl: string
  size: number
  type: 'image' | 'font' | 'other'
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

// Determine asset type from file extension
function getAssetType(filename: string): 'image' | 'font' | 'other' {
  const lower = filename.toLowerCase()
  const imageExtensions = ['.png', '.svg', '.jpg', '.jpeg', '.webp', '.gif', '.ico']
  const fontExtensions = ['.woff', '.woff2', '.ttf', '.otf', '.eot']

  if (imageExtensions.some(ext => lower.endsWith(ext))) return 'image'
  if (fontExtensions.some(ext => lower.endsWith(ext))) return 'font'
  return 'other'
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

    // Fetch ALL files from public folder and subdirectories
    async function findAssetsInDirectory(dirPath: string, maxDepth: number = 5): Promise<PublicAsset[]> {
      if (maxDepth <= 0) return []
      try {
        const url = `https://api.github.com/repos/${repo}/contents/${dirPath}`
        const response = await fetch(url, { headers })
        if (!response.ok) return []
        const contents = await response.json()
        if (!Array.isArray(contents)) return []

        const assets: PublicAsset[] = []
        const subdirs: string[] = []

        for (const item of contents) {
          if (item.type === 'dir') {
            subdirs.push(item.path)
          } else if (item.type === 'file') {
            const downloadUrl = item.download_url || `/api/github/file?repo=${encodeURIComponent(repo!)}&path=${encodeURIComponent(item.path)}`
            assets.push({
              path: item.path,
              downloadUrl,
              size: item.size,
              type: getAssetType(item.name),
            })
          }
        }

        // Recursively search subdirectories
        if (subdirs.length > 0) {
          const subResults = await Promise.all(subdirs.map(dir => findAssetsInDirectory(dir, maxDepth - 1)))
          assets.push(...subResults.flat())
        }

        return assets
      } catch {
        return []
      }
    }

    // Recursively find all CSS/SCSS/style files in the repo
    const styleExtensions = ['.css', '.scss', '.sass', '.less']
    const styleFileNames = ['tailwind.config', 'theme', 'variables', 'globals', 'styles']

    async function findStyleFilesInDirectory(dirPath: string, maxDepth: number = 4): Promise<string[]> {
      if (maxDepth <= 0) return []
      try {
        const url = `https://api.github.com/repos/${repo}/contents/${dirPath}`
        const response = await fetch(url, { headers })
        if (!response.ok) return []
        const contents = await response.json()
        if (!Array.isArray(contents)) return []

        const stylePaths: string[] = []
        const subdirs: string[] = []

        for (const item of contents) {
          if (item.type === 'dir') {
            // Skip common non-style directories
            const skipDirs = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '__tests__', 'test']
            if (!skipDirs.includes(item.name)) {
              subdirs.push(item.path)
            }
          } else if (item.type === 'file') {
            const name = item.name.toLowerCase()
            // Include all CSS/SCSS files
            if (styleExtensions.some(ext => name.endsWith(ext))) {
              stylePaths.push(item.path)
            }
            // Include config files that might have theme/style info
            if (name.includes('tailwind') && (name.endsWith('.js') || name.endsWith('.ts') || name.endsWith('.mjs'))) {
              stylePaths.push(item.path)
            }
            // Include layout files (may have font imports)
            if (name === 'layout.tsx' || name === 'layout.js') {
              stylePaths.push(item.path)
            }
            // Include theme files
            if (name.startsWith('theme') && (name.endsWith('.ts') || name.endsWith('.js') || name.endsWith('.json'))) {
              stylePaths.push(item.path)
            }
            // Include components.json (shadcn/ui)
            if (name === 'components.json') {
              stylePaths.push(item.path)
            }
          }
        }

        // Recursively search subdirectories (prioritize src, app, styles directories)
        const priorityDirs = subdirs.filter(d => ['src', 'app', 'styles', 'theme', 'css'].some(p => d.includes(p)))
        const otherDirs = subdirs.filter(d => !priorityDirs.includes(d))

        // Search priority dirs first with higher depth
        if (priorityDirs.length > 0) {
          const priorityResults = await Promise.all(priorityDirs.map(dir => findStyleFilesInDirectory(dir, maxDepth)))
          stylePaths.push(...priorityResults.flat())
        }

        // Search other dirs with lower depth
        if (otherDirs.length > 0) {
          const otherResults = await Promise.all(otherDirs.map(dir => findStyleFilesInDirectory(dir, maxDepth - 1)))
          stylePaths.push(...otherResults.flat())
        }

        return stylePaths
      } catch {
        return []
      }
    }

    // Fetch all assets from public folder (check multiple common locations)
    const publicFolderPaths = [
      'public',
      'client/public',
      'frontend/public',
      'app/public',
      'web/public',
      'src/public',
      'static',
      'assets',
    ]

    // Try each possible public folder location
    let publicAssets: PublicAsset[] = []
    for (const folderPath of publicFolderPaths) {
      const assets = await findAssetsInDirectory(folderPath)
      if (assets.length > 0) {
        publicAssets = [...publicAssets, ...assets]
      }
    }

    // Filter just images for logo selection (backwards compatible)
    const logosFound = publicAssets.filter(a => a.type === 'image')

    // Dynamically find all style files in the repo
    const discoveredStylePaths = await findStyleFilesInDirectory('')

    // Also check common root-level config files
    const rootConfigPaths = [
      'tailwind.config.js',
      'tailwind.config.ts',
      'tailwind.config.mjs',
      'components.json',
      'theme.js',
      'theme.ts',
    ]

    // Combine discovered paths with root configs (deduplicate)
    const allStylePaths = [...new Set([...discoveredStylePaths, ...rootConfigPaths])]

    // Fetch all style file contents in parallel
    const styleContents = await Promise.all(
      allStylePaths.map(path => fetchFileContent(repo, path, headers))
    )

    // Collect found style files with their content
    const styleFiles: StyleFile[] = []
    allStylePaths.forEach((path, index) => {
      const content = styleContents[index]
      if (content) {
        // Increase limit to 8000 chars per file for more complete CSS extraction
        styleFiles.push({
          path,
          content: content.length > 8000 ? content.substring(0, 8000) + '\n/* ... truncated ... */' : content
        })
      }
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
      styleFiles,
      logos: logosFound,
      publicAssets, // All files from public folder
    })
  } catch (error) {
    console.error('Error fetching repo info:', error)
    return NextResponse.json({ error: 'Failed to fetch repo info' }, { status: 500 })
  }
}
