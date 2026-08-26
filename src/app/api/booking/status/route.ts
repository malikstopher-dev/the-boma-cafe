import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth/requireRole'
import { statusUpdateSchema, BOOKING_STATUS_TRANSITIONS } from '@/lib/booking/validation'
import { createAuditEntry } from '@/lib/booking/audit'
import { getAdminContext } from '@/lib/admin/context'
import { logAdminAction } from '@/lib/admin/audit'
import type { ReservationLifecycleAction } from '@/inventory/engine/reservations'

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
    const { data: booking, error: bookingError } = await client
      .from('bookings')
      .select('status, venue_area_id, booking_date, booking_time, duration_hours')
      .eq('id', booking_id)
      .single()

    if (bookingError && bookingError.code !== 'PGRST116') {
      return NextResponse.json({ error: 'Failed to load booking' }, { status: 500 })
    }
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

    let reservationJobId: string | null = null
    const lifecycleAction: ReservationLifecycleAction | null = new_status === 'confirmed'
      ? 'reserve'
      : new_status === 'completed'
        ? 'consume'
        : new_status === 'cancelled' || new_status === 'refunded'
          ? 'cancel'
          : null

    if (lifecycleAction) {
      try {
        const { data: enqueueResult, error: enqueueError } = await client.rpc('enqueue_background_job', {
          p_job_type: 'reservation_lifecycle',
          p_payload: {
            booking_id,
            action: lifecycleAction,
          },
          p_idempotency_key: `reservation_lifecycle:${lifecycleAction}:${booking_id}`,
          p_priority: 0,
          p_max_retries: 5,
        })

        const enqueueRow = Array.isArray(enqueueResult) ? enqueueResult[0] : enqueueResult
        if (enqueueError || !enqueueRow?.id) {
          return NextResponse.json(
            { error: 'Could not queue the reservation lifecycle; booking status was not changed' },
            { status: 503 },
          )
        }
        reservationJobId = enqueueRow.id
      } catch {
        return NextResponse.json(
          { error: 'Could not queue the reservation lifecycle; booking status was not changed' },
          { status: 503 },
        )
      }
    }

    // The lifecycle intent is durable before this compare-and-set. A worker
    // that reaches the job before this commit fails visibly and retries.
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

    // Create audit entry
    await createAuditEntry({
      booking_id,
      previous_status: previousStatus,
      new_status,
      changed_by: 'admin',
      reason: reason || undefined,
    })

    // Mission E8: attribute the change to the acting admin identity
    const admin = await getAdminContext(request)
    if (admin) {
      await logAdminAction({
        adminId: admin.adminId,
        adminName: admin.displayName,
        adminRole: admin.role,
        action: 'bookings.status_change',
        targetType: 'bookings',
        targetId: booking_id,
        before: { status: previousStatus },
        after: { status: new_status, reason: reason || null },
        ipAddress: request.headers.get('x-forwarded-for') || null,
        userAgent: request.headers.get('user-agent') || null,
        sessionId: admin.sessionId,
      })
    }

    return NextResponse.json({ success: true, reservation_job_id: reservationJobId })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
