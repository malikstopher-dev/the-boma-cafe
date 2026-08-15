// GET /api/staff/bookings — Waiter operational booking feed (E1-3)
//
// Privacy contract (locked): returns ONLY the operational fields
// { id, reference, date, time, guests, location, status } for confirmed+
// bookings. The query reads waiter_booking_view (migration 082) whose
// column set structurally excludes customer name, phone, email, notes and
// pricing — a miswritten SELECT on this route cannot leak them.
//
// Auth: any authenticated staff session (PIN or role cookie) via
// resolveStaffIdentity. Unauthenticated -> 401.

import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { resolveStaffIdentity } from '@/lib/staff/identity'

export const dynamic = 'force-dynamic'

const VIEW_COLUMNS = 'id, booking_date, booking_time, guests, venue_area, status'

function toWaiterBooking(row: {
  id: string
  booking_date: string
  booking_time: string
  guests: number
  venue_area: string | null
  status: string
}) {
  return {
    id: row.id,
    reference: row.id.slice(0, 8).toUpperCase(),
    date: row.booking_date,
    time: row.booking_time.slice(0, 5),
    guests: row.guests,
    location: row.venue_area ?? null,
    status: row.status,
  }
}

export async function GET(request: NextRequest) {
  const identity = await resolveStaffIdentity(request)
  if (!identity) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  const query = getAdminClient().from('waiter_booking_view').select(VIEW_COLUMNS)

  if (id) {
    const { data, error } = await query.eq('id', id).maybeSingle()
    if (error) return NextResponse.json({ error: 'Failed to load booking' }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    return NextResponse.json({ booking: toWaiterBooking(data as any) })
  }

  const { data, error } = await query
    .order('booking_date', { ascending: true })
    .order('booking_time', { ascending: true })

  if (error) return NextResponse.json({ error: 'Failed to load bookings' }, { status: 500 })

  const bookings = (data || []).map((row: any) => toWaiterBooking(row))
  return NextResponse.json({ bookings })
}