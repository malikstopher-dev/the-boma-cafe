import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { requireAdminOrKitchen } from '@/lib/auth/requireRole'
import { checkRateLimit } from '@/lib/rate-limit'
import { releaseAvailability } from '@/lib/booking/availability'
import { cancelReservationsForBooking } from '@/inventory/engine/reservations'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authError = await requireAdminOrKitchen(request)
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0)

  const { data, error } = await getAdminClient()
    .from('bookings')
    .select('*, booking_type:booking_types(name, slug), venue_area:venue_areas(name), customer:customers(id, name), quote:quotes(id, quote_number, total, status)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: 'Failed to load bookings' }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(`booking:${ip}`)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json()
    const { name, phone, email, booking_date, booking_time, guests, notes } = body

    if (!name || !phone || !email || !booking_date || !booking_time || !guests) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (typeof guests !== 'number' || guests < 1 || guests > 100) {
      return NextResponse.json({ error: 'Invalid guest count' }, { status: 400 })
    }

    if (!email.includes('@') || !email.includes('.')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    const { data, error } = await getAdminClient()
      .from('bookings')
      .insert([{ name, phone, email, booking_date, booking_time, guests, notes, status: 'pending' }])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
    }

    return NextResponse.json({ success: true, booking: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

export async function PATCH(request: NextRequest) {
  const authError = await requireAdminOrKitchen(request)
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const body = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Booking ID required' }, { status: 400 })
    }

    const ALLOWED_PATCH_FIELDS = ['name', 'phone', 'email', 'booking_date', 'booking_time', 'guests', 'notes', 'status']
    const updates: Record<string, unknown> = {}
    for (const key of ALLOWED_PATCH_FIELDS) {
      if (key in body) {
        updates[key] = body[key]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { error } = await getAdminClient()
      .from('bookings')
      .update(updates)
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest) {
  const authError = await requireAdminOrKitchen(request)
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Booking ID required' }, { status: 400 })
  }

  // Release inventory reservations + availability hold before hard delete
  try {
    await cancelReservationsForBooking(id)
    await releaseAvailability(id)
  } catch {
    // Non-blocking: cleanup failures shouldn't block the delete
  }

  const { error } = await getAdminClient()
    .from('bookings')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Failed to delete booking' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
