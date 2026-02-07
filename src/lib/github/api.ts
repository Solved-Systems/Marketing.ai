export async function fetchGitHubRepoInfo(accessToken: string, owner: string, repo: string) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/vnd.github.v3+json',
  }

  const fullRepo = `${owner}/${repo}`

  const [repoRes, readmeRes, pkgRes] = await Promise.all([
    fetch(`https://api.github.com/repos/${fullRepo}`, { headers }),
    fetch(`https://api.github.com/repos/${fullRepo}/readme`, { headers }).catch(() => null),
    fetch(`https://api.github.com/repos/${fullRepo}/contents/package.json`, { headers }).catch(() => null),
  ])

  if (!repoRes.ok) throw new Error(`Repo not found: ${fullRepo}`)
  const repoData = await repoRes.json()

  let readme = null
  if (readmeRes?.ok) {
    const readmeData = await readmeRes.json()
    if (readmeData.content) {
      readme = Buffer.from(readmeData.content, 'base64').toString('utf-8')
      if (readme.length > 4000) readme = readme.substring(0, 4000) + '\n...(truncated)'
    }
  }

  let packageJson = null
  if (pkgRes?.ok) {
    const pkgData = await pkgRes.json()
    if (pkgData.content) {
      try {
        packageJson = JSON.parse(Buffer.from(pkgData.content, 'base64').toString('utf-8'))
      } catch { /* ignore */ }
    }
  }

  return {
    name: repoData.name,
    fullName: repoData.full_name,
    description: repoData.description,
    stars: repoData.stargazers_count,
    forks: repoData.forks_count,
    watchers: repoData.watchers_count,
    language: repoData.language,
    topics: repoData.topics || [],
    url: repoData.html_url,
    homepage: repoData.homepage,
    readme,
    packageJson: packageJson
      ? {
          name: packageJson.name,
          description: packageJson.description,
          dependencies: Object.keys(packageJson.dependencies || {}),
          devDependencies: Object.keys(packageJson.devDependencies || {}),
        }
      : null,
  }
}

export async function fetchGitHubActivity(accessToken: string, owner: string, repo: string) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/vnd.github.v3+json',
  }

  const fullRepo = `${owner}/${repo}`

  const [prsRes, commitsRes] = await Promise.all([
    fetch(`https://api.github.com/repos/${fullRepo}/pulls?state=closed&sort=updated&direction=desc&per_page=10`, { headers }),
    fetch(`https://api.github.com/repos/${fullRepo}/commits?per_page=15`, { headers }),
  ])

  const prs = prsRes.ok ? await prsRes.json() : []
  const commits = commitsRes.ok ? await commitsRes.json() : []

  return {
    mergedPRs: (Array.isArray(prs) ? prs : [])
      .filter((pr: any) => pr.merged_at)
      .slice(0, 5)
      .map((pr: any) => ({
        number: pr.number,
        title: pr.title,
        mergedAt: pr.merged_at,
        url: pr.html_url,
        author: pr.user?.login,
      })),
    recentCommits: (Array.isArray(commits) ? commits : []).slice(0, 10).map((c: any) => ({
      sha: c.sha?.substring(0, 7),
      message: c.commit?.message?.split('\n')[0],
      date: c.commit?.author?.date,
      author: c.author?.login || c.commit?.author?.name,
    })),
  }
}

export async function fetchGitHubFile(accessToken: string, owner: string, repo: string, path: string) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/vnd.github.v3+json',
  }

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    { headers }
  )

  if (!response.ok) throw new Error(`File not found: ${path}`)
  const data = await response.json()

  if (data.content) {
    const content = Buffer.from(data.content, 'base64').toString('utf-8')
    return {
      path: data.path,
      size: data.size,
      content: content.length > 10000 ? content.substring(0, 10000) + '\n...(truncated)' : content,
    }
  }

  // Directory listing
  if (Array.isArray(data)) {
    return {
      path,
      type: 'directory' as const,
      entries: data.map((item: any) => ({
        name: item.name,
        type: item.type,
        size: item.size,
        path: item.path,
      })),
    }
  }

  throw new Error('Unexpected response format')
}
