import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'

interface PullRequest {
  id: number
  number: number
  title: string
  state: string
  merged_at: string | null
  created_at: string
  updated_at: string
  html_url: string
  user: {
    login: string
    avatar_url: string
  }
  head: {
    ref: string
  }
  base: {
    ref: string
  }
}

interface Commit {
  sha: string
  commit: {
    message: string
    author: {
      name: string
      date: string
    }
  }
  html_url: string
  author: {
    login: string
    avatar_url: string
  } | null
}

export async function GET(request: NextRequest) {
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

    // Fetch merged PRs and recent commits in parallel
    const [prsResponse, commitsResponse] = await Promise.all([
      fetch(
        `https://api.github.com/repos/${repo}/pulls?state=closed&sort=updated&direction=desc&per_page=10`,
        { headers }
      ),
      fetch(
        `https://api.github.com/repos/${repo}/commits?per_page=15`,
        { headers }
      ),
    ])

    if (!prsResponse.ok || !commitsResponse.ok) {
      throw new Error('Failed to fetch GitHub activity')
    }

    const prs: PullRequest[] = await prsResponse.json()
    const commits: Commit[] = await commitsResponse.json()

    // Filter to only merged PRs
    const mergedPRs = prs
      .filter(pr => pr.merged_at)
      .map(pr => ({
        id: pr.id,
        number: pr.number,
        title: pr.title,
        mergedAt: pr.merged_at,
        url: pr.html_url,
        author: pr.user.login,
        authorAvatar: pr.user.avatar_url,
        sourceBranch: pr.head.ref,
        targetBranch: pr.base.ref,
      }))

    // Format recent commits
    const recentCommits = commits.map(commit => ({
      sha: commit.sha.substring(0, 7),
      message: commit.commit.message.split('\n')[0], // First line only
      date: commit.commit.author.date,
      url: commit.html_url,
      author: commit.author?.login || commit.commit.author.name,
      authorAvatar: commit.author?.avatar_url,
    }))

    return NextResponse.json({
      mergedPRs,
      recentCommits,
    })
  } catch (error) {
    console.error('Error fetching GitHub activity:', error)
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 })
  }
}
