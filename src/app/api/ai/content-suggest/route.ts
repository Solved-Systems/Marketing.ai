import { NextRequest, NextResponse } from 'next/server'
import { generateText, createGateway } from 'ai'
import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'

interface MergedPR {
  id: number
  number: number
  title: string
  mergedAt: string
  url: string
  author: string
  sourceBranch: string
  targetBranch: string
}

interface RecentCommit {
  sha: string
  message: string
  date: string
  url: string
  author: string
}

interface GitHubActivity {
  mergedPRs: MergedPR[]
  recentCommits: RecentCommit[]
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.email || !session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { brandId, contentType, template } = await request.json() as {
      brandId: string
      contentType: 'video' | 'post' | 'image'
      template?: string
    }

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    // Fetch brand data
    const supabase = createAdminClient()
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brandId)
      .single()

    if (brandError || !brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    if (!brand.github_repo) {
      return NextResponse.json(
        { error: 'No GitHub repository connected to this brand' },
        { status: 400 }
      )
    }

    // Fetch GitHub activity
    const headers = {
      Authorization: `Bearer ${session.accessToken}`,
      Accept: 'application/vnd.github.v3+json',
    }

    const [prsResponse, commitsResponse] = await Promise.all([
      fetch(
        `https://api.github.com/repos/${brand.github_repo}/pulls?state=closed&sort=updated&direction=desc&per_page=10`,
        { headers }
      ),
      fetch(
        `https://api.github.com/repos/${brand.github_repo}/commits?per_page=20`,
        { headers }
      ),
    ])

    let activity: GitHubActivity = { mergedPRs: [], recentCommits: [] }

    if (prsResponse.ok && commitsResponse.ok) {
      const prs = await prsResponse.json()
      const commits = await commitsResponse.json()

      activity = {
        mergedPRs: prs
          .filter((pr: { merged_at: string | null }) => pr.merged_at)
          .slice(0, 5)
          .map((pr: { id: number; number: number; title: string; merged_at: string; html_url: string; user: { login: string }; head: { ref: string }; base: { ref: string } }) => ({
            id: pr.id,
            number: pr.number,
            title: pr.title,
            mergedAt: pr.merged_at,
            url: pr.html_url,
            author: pr.user.login,
            sourceBranch: pr.head.ref,
            targetBranch: pr.base.ref,
          })),
        recentCommits: commits.slice(0, 15).map((commit: { sha: string; commit: { message: string; author: { date: string; name: string } }; html_url: string; author?: { login: string } }) => ({
          sha: commit.sha.substring(0, 7),
          message: commit.commit.message.split('\n')[0],
          date: commit.commit.author.date,
          url: commit.html_url,
          author: commit.author?.login || commit.commit.author.name,
        })),
      }
    }

    // Build context for AI
    const brandContext = `
Brand: ${brand.name}
Tagline: ${brand.tagline || 'Not set'}
Description: ${brand.description || 'Not set'}
Repository: ${brand.github_repo}
`

    const activityContext = `
Recent Merged PRs:
${activity.mergedPRs.length > 0
  ? activity.mergedPRs.map(pr => `- #${pr.number}: ${pr.title} (by ${pr.author})`).join('\n')
  : 'No recent merged PRs'}

Recent Commits:
${activity.recentCommits.length > 0
  ? activity.recentCommits.map(c => `- ${c.sha}: ${c.message}`).join('\n')
  : 'No recent commits'}
`

    const apiKey = process.env.AI_GATEWAY_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'AI Gateway API key not configured' }, { status: 500 })
    }

    const gateway = createGateway({ apiKey })

    let systemPrompt = ''
    let userPrompt = ''

    if (contentType === 'video') {
      systemPrompt = `You are a marketing content strategist specializing in developer tools and software products. Your job is to analyze GitHub activity and suggest compelling marketing video content.

You must respond with valid JSON only. No markdown, no explanation, just the JSON object.`

      userPrompt = `Based on the following brand and GitHub activity, suggest content for a marketing video.

${brandContext}
${activityContext}

Content Type: ${contentType}
${template ? `Template: ${template}` : ''}

Analyze the recent activity and suggest:
1. A compelling title for a video (catchy, attention-grabbing)
2. A description of what the video should communicate
3. Key features to highlight (based on recent changes)
4. A strong call to action

Respond with this exact JSON structure:
{
  "title": "string - video title",
  "description": "string - what the video should communicate",
  "features": "string - key features to highlight, one per line",
  "callToAction": "string - call to action"
}

Focus on the most impactful recent changes. Make the content exciting and suitable for social media.`
    } else if (contentType === 'post') {
      systemPrompt = `You are a social media content creator for developer tools. Create engaging posts about software updates and features.

You must respond with valid JSON only. No markdown, no explanation, just the JSON object.`

      userPrompt = `Based on the following brand and GitHub activity, suggest a social media post.

${brandContext}
${activityContext}

Analyze the recent activity and create an engaging social media post.

Respond with this exact JSON structure:
{
  "title": "string - post headline",
  "content": "string - the post content (280 chars for Twitter, or longer for LinkedIn/other)",
  "hashtags": "string - relevant hashtags"
}`
    } else {
      systemPrompt = `You are a marketing content strategist. Suggest compelling content ideas based on product updates.

You must respond with valid JSON only. No markdown, no explanation, just the JSON object.`

      userPrompt = `Based on the following brand and GitHub activity, suggest marketing content.

${brandContext}
${activityContext}

Respond with this exact JSON structure:
{
  "title": "string - content title",
  "description": "string - content description",
  "keyPoints": "string - key points to include"
}`
    }

    const { text } = await generateText({
      model: gateway('anthropic/claude-sonnet-4-20250514'),
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      maxOutputTokens: 1024,
    })

    // Parse AI response
    let suggestion
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        suggestion = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch {
      console.error('Failed to parse AI response:', text)
      return NextResponse.json(
        { error: 'Failed to parse AI suggestion' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      suggestion,
      activity: {
        mergedPRs: activity.mergedPRs.slice(0, 3),
        recentCommits: activity.recentCommits.slice(0, 5),
      },
    })
  } catch (error) {
    console.error('Content suggest error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
