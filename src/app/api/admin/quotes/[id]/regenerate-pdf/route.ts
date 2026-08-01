import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth/requireRole'
import { getBookingSettings } from '@/lib/booking/settings'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const client = await getAdminClient()
    const { id: quoteId } = await params

    const { data: quote, error: quoteError } = await client
      .from('quotes')
      .select('*, booking:bookings(*)')
      .eq('id', quoteId)
      .single()

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    const booking = quote.booking
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Fetch display names
    let bookingTypeName = 'Event'
    let venueAreaName = 'Venue'
    let foodPackageName = 'None selected'
    let drinkPackageName = 'None selected'
    try {
      const [btResult, vaResult, fpResult, dpResult] = await Promise.all([
        booking.booking_type_id
          ? client.from('booking_types').select('name').eq('id', booking.booking_type_id).maybeSingle()
          : Promise.resolve(null),
        booking.venue_area_id
          ? client.from('venue_areas').select('name').eq('id', booking.venue_area_id).maybeSingle()
          : Promise.resolve(null),
        booking.food_package_id
          ? client.from('food_packages').select('name').eq('id', booking.food_package_id).maybeSingle()
          : Promise.resolve(null),
        booking.drink_package_id
          ? client.from('drink_packages').select('name').eq('id', booking.drink_package_id).maybeSingle()
          : Promise.resolve(null),
      ])
      if (btResult?.data) bookingTypeName = btResult.data.name
      if (vaResult?.data) venueAreaName = vaResult.data.name
      if (fpResult?.data) foodPackageName = fpResult.data.name
      if (dpResult?.data) drinkPackageName = dpResult.data.name
    } catch {
      // Non-critical
    }

    // Fetch line items from quote_items
    const { data: items } = await client
      .from('quote_items')
      .select('*')
      .eq('quote_id', quoteId)
      .order('sort_order')

    const newVersion = Number(quote.pdf_version || 0) + 1

    const portalUrl = quote.access_token
      ? `https://the-boma-cafe.vercel.app/booking/${quote.quote_number}?token=${quote.access_token}`
      : `https://the-boma-cafe.vercel.app/booking/${quote.quote_number}`

    const jobPayload = {
      quoteId: quote.id,
      quoteNumber: quote.quote_number,
      version: newVersion,
      customerName: booking.name || 'Customer',
      customerEmail: booking.email || '',
      customerPhone: booking.phone || '',
      bookingReference: booking.id,
      bookingType: bookingTypeName,
      venueArea: venueAreaName,
      foodPackage: foodPackageName,
      drinkPackage: drinkPackageName,
      addons: '',
      addonNames: [],
      bookingDate: booking.booking_date || '',
      bookingTime: booking.booking_time || '',
      guests: booking.guests || 0,
      lineItems: (items || []).map((item: any) => ({
        label: item.label,
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
        total: Number(item.total_price),
      })),
      subtotal: Number(quote.subtotal),
      taxRate: Number(quote.tax_rate),
      taxAmount: Number(quote.tax_amount),
      total: Number(quote.total),
      depositPercentage: Number(quote.deposit_percentage),
      depositAmount: Number(quote.deposit_amount),
      balanceAmount: Number(quote.balance_amount),
      validUntil: quote.valid_until,
      portalUrl,
      notificationEmails: [],
      company: booking.company || null,
      specialRequests: booking.special_requests || booking.notes || null,
      skipCustomerEmail: true,
    }

    // Atomic enqueue: the idempotency decision (insert / replay / replace
    // dead-letter) and the row mutation all happen inside one Postgres
    // transaction under a FOR UPDATE lock on the existing key — so two
    // simultaneous Regenerate requests on the same quote+version can never
    // delete-and-double-insert. See migration 060.
    const { data: enqueueResult, error: enqueueError } = await client.rpc(
      'enqueue_background_job',
      {
        p_job_type: 'pdf_generation',
        p_payload: jobPayload,
        p_idempotency_key: `regenerate-${quote.id}-v${newVersion}`,
        p_priority: 2,
        p_max_retries: 2,
      }
    )

    if (enqueueError || !enqueueResult) {
      console.error('[regenerate-pdf] enqueue_background_job failed:', enqueueError?.message)
      return NextResponse.json({ error: 'Failed to queue PDF regeneration' }, { status: 500 })
    }

    // enqueueResult is a single-row table: { id, status, outcome }
    const outcome: string = enqueueResult.outcome
    const finalStatus: string = enqueueResult.status

    if (outcome === 'already_completed') {
      // The PDF for this version was already produced (a prior job completed
      // but pdf_version advanced *exactly* to this version). No new work to
      // queue; tell the UI it's done so the manager isn't blocked.
      return NextResponse.json({
        success: true,
        queued: false,
        duplicate: true,
        pdf_version: newVersion,
        version: newVersion,
      })
    }

    // 'inserted' | 'already_queued' | 'replaced' — in all three a runnable
    // job now exists for this version.
    return NextResponse.json({
      success: true,
      queued: true,
      duplicate: outcome === 'already_queued',
      recovered: outcome === 'replaced',
      job_id: enqueueResult.id,
      job_status: finalStatus,
      pdf_version: newVersion,
      version: newVersion,
    })
  } catch (err) {
    console.error('[regenerate-pdf] caught exception:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: 'PDF regeneration failed: ' + message }, { status: 500 })
  }
}
