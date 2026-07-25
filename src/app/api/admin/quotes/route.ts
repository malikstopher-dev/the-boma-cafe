import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth/requireRole'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0)

  const client = await getAdminClient()

  let query = client
    .from('quotes')
    .select('*, booking:bookings(id, name, email, phone, booking_date, booking_time)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: 'Failed to load quotes' }, { status: 500 })
  }

  const quoteIds = (data || []).map((q: any) => q.id)
  let versionsMap: Record<string, number> = {}

  if (quoteIds.length > 0) {
    const { data: versions } = await client
      .from('quote_versions')
      .select('quote_id')
      .in('quote_id', quoteIds)
    if (versions) {
      for (const v of versions) {
        versionsMap[v.quote_id] = (versionsMap[v.quote_id] || 0) + 1
      }
    }
  }

  const enriched = (data || []).map((q: any) => ({
    ...q,
    version_count: versionsMap[q.id] || 0,
    is_expired: q.valid_until ? new Date(q.valid_until) < new Date() : false,
  }))

  return NextResponse.json({ data: enriched, count })
}

export async function PATCH(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const body = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Quote ID required' }, { status: 400 })
    }

    const ALLOWED_FIELDS = ['status', 'notes']
    const updates: Record<string, unknown> = {}
    for (const key of ALLOWED_FIELDS) {
      if (key in body) updates[key] = body[key]
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { error } = await (await getAdminClient())
      .from('quotes')
      .update(updates)
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}