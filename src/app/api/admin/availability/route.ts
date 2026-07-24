import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth/requireRole'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  const venueAreaId = searchParams.get('venue_area_id')
  const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500)

  let query = (await getAdminClient())
    .from('availability')
    .select('*, venue_area:venue_areas(name), booking:bookings(name, status, phone)')
    .order('booking_date', { ascending: true })
    .limit(limit)

  if (date) query = query.eq('booking_date', date)
  if (venueAreaId) query = query.eq('venue_area_id', venueAreaId)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Failed to load availability' }, { status: 500 })
  }

  return NextResponse.json(data || [])
}