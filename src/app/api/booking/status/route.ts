import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth/requireRole'
import { statusUpdateSchema, BOOKING_STATUS_TRANSITIONS } from '@/lib/booking/validation'
import { createAuditEntry } from '@/lib/booking/audit'
import { releaseAvailability } from '@/lib/booking/availability'
import { autoReserveForBooking, cancelReservationsForBooking, consumeReservationsForBooking } from '@/inventory/engine/reservations'

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

    const allowedTransitions = BOOKING_STATUS_TRANSITIONS[previousStatus] ?? []
    if (!allowedTransitions.includes(new_status)) {
      return NextResponse.json(
        { error: `Cannot transition booking from ${previousStatus} to ${new_status}` },
        { status: 400 },
      )
    }

    // Update status — guarded with the previously-read status so a
    // concurrent PATCH (double-click, retry) cannot both claim the
    // transition: only the winner runs the lifecycle hooks below
    // (reservation consumption must fire exactly once).
    const { data: updatedRows, error: updateError } = await client
      .from('bookings')
      .update({ status: new_status })
      .eq('id', booking_id)
      .eq('status', previousStatus)
      .select('id')

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
    }

    if (!updatedRows || updatedRows.length === 0) {
      return NextResponse.json(
        { error: 'Booking status was changed by another request — please refresh and try again' },
        { status: 409 },
      )
    }

    // Handle inventory reservations on status transitions
    if (new_status === 'confirmed') {
      try {
        await autoReserveForBooking(booking_id)
      } catch {
        // Non-blocking: reservation failure shouldn't block the status update
      }
    }

    if (new_status === 'cancelled' || new_status === 'refunded') {
      try {
        await releaseAvailability(booking_id)
        await cancelReservationsForBooking(booking_id)
      } catch {
        // Non-blocking
      }
    }

    if (new_status === 'completed') {
      try {
        await consumeReservationsForBooking(booking_id)
      } catch {
        // Non-blocking
      }
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