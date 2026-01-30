// Credit check and deduction API
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { deductCredits, hasEnoughCredits, getCurrentCredits } from '@/lib/billing/credits'
import type { GenerationType } from '@/types/billing'

// GET: Check if user has enough credits
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const type = request.nextUrl.searchParams.get('type') as GenerationType
    if (!type) {
      return NextResponse.json({ error: 'Generation type required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get user ID
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (!user) {
      return NextResponse.json({ canAfford: false, remaining: 0 })
    }

    const canAfford = await hasEnoughCredits(user.id, type)
    const balance = await getCurrentCredits(user.id)

    return NextResponse.json({
      canAfford,
      remaining: balance?.credits_remaining || 0,
    })
  } catch (error) {
    console.error('Credit check error:', error)
    return NextResponse.json({ error: 'Failed to check credits' }, { status: 500 })
  }
}

// POST: Deduct credits for a generation
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { type, metadata } = await request.json() as {
      type: GenerationType
      metadata?: Record<string, unknown>
    }

    if (!type) {
      return NextResponse.json({ error: 'Generation type required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get user ID
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (!user) {
      return NextResponse.json(
        { error: 'User not found. Please ensure you have an active subscription.' },
        { status: 404 }
      )
    }

    // Deduct credits
    const result = await deductCredits(user.id, type, metadata)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, remaining: result.remaining },
        { status: 402 } // Payment Required
      )
    }

    return NextResponse.json({
      success: true,
      remaining: result.remaining,
    })
  } catch (error) {
    console.error('Credit deduction error:', error)
    return NextResponse.json({ error: 'Failed to deduct credits' }, { status: 500 })
  }
}
