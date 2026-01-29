import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()

  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=50', {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch repos')
    }

    const repos = await response.json()

    // Return simplified repo data
    const simplifiedRepos = repos.map((repo: {
      id: number
      name: string
      full_name: string
      html_url: string
      description: string | null
      private: boolean
    }) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      url: repo.html_url,
      description: repo.description,
      private: repo.private,
    }))

    return NextResponse.json(simplifiedRepos)
  } catch (error) {
    console.error('Error fetching repos:', error)
    return NextResponse.json({ error: 'Failed to fetch repos' }, { status: 500 })
  }
}
