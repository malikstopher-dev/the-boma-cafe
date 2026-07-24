import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth/requireRole'
import { blockedDateSchema } from '@/lib/booking/validation'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  let query = (await getAdminClient())
    .from('blocked_dates')
    .select('*, venue_area:venue_areas(name)')
    .order('start_date', { ascending: false })

  if (from) query = query.gte('start_date', from)
  if (to) query = query.lte('end_date', to)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Failed to load blocked dates' }, { status: 500 })
  }

  return NextResponse.json(data || [])
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const parsed = blockedDateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: (parsed as any).error.flatten().fieldErrors }, { status: 400 })
    }

    const { data, error } = await (await getAdminClient())
      .from('blocked_dates')
      .insert({
        venue_area_id: parsed.data.venue_area_id || null,
        start_date: parsed.data.start_date,
        end_date: parsed.data.end_date,
        reason: parsed.data.reason || null,
        is_recurring: parsed.data.is_recurring,
        recurring_pattern: parsed.data.recurring_pattern || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create blocked date' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Blocked date ID required' }, { status: 400 })
  }

  const { error } = await (await getAdminClient())
    .from('blocked_dates')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Failed to delete blocked date' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}