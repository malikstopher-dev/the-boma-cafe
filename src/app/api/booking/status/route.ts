import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth/requireRole'
import { statusUpdateSchema } from '@/lib/booking/validation'
import { createAuditEntry } from '@/lib/booking/audit'
import { releaseAvailability } from '@/lib/booking/availability'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const parsed = statusUpdateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: (parsed as any).error.flatten().fieldErrors }, { status: 400 })
    }

    const { booking_id, new_status, reason } = parsed.data
    const client = await getAdminClient()

    // Get current booking
    const { data: booking } = await client
      .from('bookings')
      .select('status, venue_area_id, booking_date, booking_time, duration_hours')
      .eq('id', booking_id)
      .single()

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const previousStatus = booking.status

    // Update status
    const { error: updateError } = await client
      .from('bookings')
      .update({ status: new_status })
      .eq('id', booking_id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
    }

    // Handle availability on cancellation
    if (new_status === 'cancelled' || new_status === 'refunded') {
      await releaseAvailability(booking_id)
    }

    // Create audit entry
    await createAuditEntry({
      booking_id,
      previous_status: previousStatus,
      new_status,
      changed_by: 'admin',
      reason: reason || undefined,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}