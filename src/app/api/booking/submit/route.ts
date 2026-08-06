import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { checkRateLimit } from '@/lib/rate-limit'
import { bookingFormSchema, type BookingFormData } from '@/lib/booking/validation'
import { calculateQuotation } from '@/lib/booking/pricing'
import { generateQuoteNumber, generateAccessToken } from '@/lib/booking/quote-generator'
import { persistQuotation } from '@/lib/booking/pricing'
import { getBookingSettings } from '@/lib/booking/settings'
import { createAuditEntry } from '@/lib/booking/audit'
import { recordAvailability } from '@/lib/booking/availability'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  if (!await checkRateLimit(`booking-submit:${ip}`)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const parsed = bookingFormSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: (parsed as any).error.flatten().fieldErrors,
      }, { status: 400 })
    }

    const data = parsed.data as BookingFormData
    const settings = await getBookingSettings()

    if (!settings.enabled) {
      return NextResponse.json({ error: 'Online booking is currently disabled' }, { status: 503 })
    }

    const client = await getAdminClient()

    // ===================================================================
    // EARLY IDEMPOTENCY CHECK (before any DB writes).
    // The idempotency key is derived only from validated request fields,
    // so we can compute it here and ask the queue whether a prior submit
    // with the same content already produced a job. If so, replay the
    // existing quote's reference so the customer sees their original
    // quotation — and skip every downstream side effect (customer row,
    // booking row, quote row, audit, availability, enqueue).
    //
    // Why upfront: a double-submit previously created a SECOND booking +
    // quote (e.g. BMC-2026-0015) because the duplicate decision happened
    // at the very end of the route, after all side-effect inserts. This
    // short-circuit makes those rows impossible to duplicate.
    // ===================================================================
    const idempotencyKey = `booking-submit:${data.email}:${data.booking_date}:${data.booking_time}:${data.venue_area_id}`

    const { data: existingJobRow } = await client
      .from('background_jobs')
      .select('id, status, payload')
      .eq('idempotency_key', idempotencyKey)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingJobRow && (existingJobRow.status === 'pending' || existingJobRow.status === 'processing' || existingJobRow.status === 'completed')) {
      // Replay the prior quote so the success page can render. If the prior
      // payload is missing the quotation fields (legacy row or hand-edited),
      // fall through to the full submit path below rather than hand the UI a
      // malformed success response that would crash SuccessContent.
      const priorPayload = (existingJobRow.payload as any) || {}
      const hasFullQuotation = priorPayload.subtotal !== undefined
        && priorPayload.total !== undefined
        && priorPayload.depositAmount !== undefined
        && priorPayload.balanceAmount !== undefined
        && typeof priorPayload.quoteNumber === 'string'

      if (hasFullQuotation) {
        return NextResponse.json({
          success: true,
          booking_id: priorPayload.bookingReference || null,
          quote_id: priorPayload.quoteId || null,
          quote_number: priorPayload.quoteNumber,
          quotation: {
            line_items: priorPayload.lineItems || [],
            subtotal: priorPayload.subtotal,
            tax_rate: priorPayload.taxRate,
            tax_amount: priorPayload.taxAmount,
            total: priorPayload.total,
            deposit_percentage: priorPayload.depositPercentage,
            deposit_amount: priorPayload.depositAmount,
            balance_amount: priorPayload.balanceAmount,
          },
          job_id: existingJobRow.id,
          duplicate: true,
        }, { status: 200 })
      }
      // Malformed prior payload — fall through and create a fresh booking
      // (duplicate row is preferable to a 200 response that crashes the UI).
    }

    // (dead_letter / failed / cancelled, malformed prior payload, or no prior row) -> proceed with full submit.

    // 1. Find or create customer
    let customerId: string | null = null
    const { data: existingCustomer } = await client
      .from('customers')
      .select('id')
      .eq('email', data.email)
      .maybeSingle()

    if (existingCustomer) {
      customerId = existingCustomer.id
    } else {
      const { data: newCustomer } = await client
        .from('customers')
        .insert({
          name: data.name,
          phone: data.phone,
          email: data.email,
          company: data.company || null,
        })
        .select('id')
        .single()
      customerId = newCustomer?.id || null
    }

    // 2. Calculate the quotation server-side (authoritative)
    const calculation = await calculateQuotation({
      venue_area_id: data.venue_area_id,
      food_package_id: data.food_package_id || null,
      drink_package_id: data.drink_package_id || null,
      addons: (data.addons || []) as Array<{ id: string; quantity: number }>,
      adults: data.adults,
      children: data.children,
      booking_date: data.booking_date,
      duration_hours: data.duration_hours,
    })

    // 3. Create the booking
    const endTime = calculateEndTime(data.booking_time, data.duration_hours)
    const { data: booking, error: bookingError } = await client
      .from('bookings')
      .insert({
        customer_id: customerId,
        booking_type_id: data.booking_type_id,
        venue_area_id: data.venue_area_id,
        duration_hours: data.duration_hours,
        adults: data.adults,
        children: data.children,
        special_requests: data.special_requests || null,
        source: 'web',
        name: data.name,
        phone: data.phone,
        email: data.email,
        booking_date: data.booking_date,
        booking_time: data.booking_time,
        guests: data.adults + data.children,
        notes: data.special_requests || null,
        status: 'draft',
      })
      .select('id')
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
    }

    // 4. Generate quote number and persist quotation
    const quoteNumber = await generateQuoteNumber()
    // persistQuotation throws on DB error — propagates to the outer catch → 500.
    const quoteId = await persistQuotation(booking.id, calculation, quoteNumber, settings.quote_validity_days)

    const accessToken = generateAccessToken(quoteId)
    const { error: quoteTokenError } = await client
      .from('quotes')
      .update({ access_token: accessToken })
      .eq('id', quoteId)
    if (quoteTokenError) {
      throw new Error(`Failed to set quote access token: ${quoteTokenError.message}`)
    }

    const { error: bookingLinkError } = await client
      .from('bookings')
      .update({ quote_id: quoteId, status: 'quote_sent' })
      .eq('id', booking.id)
    if (bookingLinkError) {
      throw new Error(`Failed to link booking to quote: ${bookingLinkError.message}`)
    }

    // 5. Fetch display names (needed for PDF, email templates)
    let bookingTypeName = 'Event'
    let venueAreaName = 'Venue'
    let foodPackageName = 'None selected'
    let drinkPackageName = 'None selected'
    let addonNames: Array<{ name: string; qty: number }> = []

    try {
      const [btResult, vaResult, fpResult, dpResult, addonsResult] = await Promise.all([
        client.from('booking_types').select('name').eq('id', data.booking_type_id).maybeSingle(),
        client.from('venue_areas').select('name').eq('id', data.venue_area_id).maybeSingle(),
        data.food_package_id ? client.from('food_packages').select('name').eq('id', data.food_package_id).maybeSingle() : Promise.resolve(null),
        data.drink_package_id ? client.from('drink_packages').select('name').eq('id', data.drink_package_id).maybeSingle() : Promise.resolve(null),
        (data.addons || []).length > 0
          ? client.from('addons').select('id, name').in('id', (data.addons || []).map((a: any) => a.id))
          : Promise.resolve({ data: [] }),
      ])
      if (btResult?.data) bookingTypeName = btResult.data.name
      if (vaResult?.data) venueAreaName = vaResult.data.name
      if (fpResult?.data) foodPackageName = fpResult.data.name
      if (dpResult?.data) drinkPackageName = dpResult.data.name
      if (addonsResult?.data) {
        const addonMap = new Map<string, string>(addonsResult.data.map((a: any) => [a.id, a.name] as [string, string]))
        addonNames = (data.addons || []).map((a: any) => ({
          name: addonMap.get(a.id) || 'Unknown',
          qty: a.quantity,
        }))
      }
    } catch {
      // Non-critical — emails + PDF still go out with fallback names
    }

    const addonsDisplayText = addonNames.map(a => `${a.name} x ${a.qty}`).join(', ')
    const guests = data.adults + data.children

    // 6. Record tentative availability
    await recordAvailability(data.venue_area_id, booking.id, data.booking_date, data.booking_time, endTime, data.adults + data.children, 'tentative')

    // 7. Create audit entry
    await createAuditEntry({
      booking_id: booking.id,
      previous_status: null,
      new_status: quoteId ? 'quote_sent' : 'draft',
      changed_by: 'system',
      reason: 'Booking submitted via website',
    })

    // --- ENQUEUE BACKGROUND JOB ---

    const portalUrl = `https://the-boma-cafe.vercel.app/booking/${quoteNumber}?token=${accessToken}`
    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + (settings.quote_validity_days || 14))

    // idempotencyKey was computed at the top of this handler (early
    // duplicate-detection). See the EARLY IDEMPOTENCY CHECK block above.

    const jobPayloadObject = {
      quoteId,
      quoteNumber,
      version: 1,
      customerName: data.name,
      customerEmail: data.email,
      customerPhone: data.phone,
      bookingReference: booking.id,
      bookingType: bookingTypeName,
      venueArea: venueAreaName,
      foodPackage: foodPackageName,
      drinkPackage: drinkPackageName,
      addons: addonsDisplayText,
      addonNames,
      bookingDate: data.booking_date,
      bookingTime: data.booking_time,
      guests,
      lineItems: calculation.line_items.filter((i: any) => i.total > 0),
      subtotal: calculation.subtotal,
      taxRate: calculation.tax_rate,
      taxAmount: calculation.tax_amount,
      total: calculation.total,
      depositPercentage: calculation.deposit_percentage,
      depositAmount: calculation.deposit_amount,
      balanceAmount: calculation.balance_amount,
      validUntil: validUntil.toISOString().split('T')[0],
      portalUrl,
      notificationEmails: settings.notification_emails,
      company: data.company || null,
      specialRequests: data.special_requests || null,
    }

    // Atomic enqueue: the duplicate-decision and any row mutation happen in a
    // single Postgres transaction under a FOR UPDATE lock on the idempotency
    // key (migration 060). A double-submit can no longer race between the
    // INSERT and the SELECT-after-23505 that the old client-side replay used.
    const { data: enqueueResult, error: enqueueError } = await client.rpc(
      'enqueue_background_job',
      {
        p_job_type: 'pdf_generation',
        p_payload: jobPayloadObject,
        p_idempotency_key: idempotencyKey,
        p_priority: 1,
        p_max_retries: 3,
      }
    )

    if (enqueueError || !enqueueResult) {
      console.error('Failed to enqueue PDF generation job:', enqueueError?.message)
      return NextResponse.json({ error: 'Failed to queue PDF generation' }, { status: 500 })
    }

    // Supabase JS v2 returns an ARRAY for RETURNS TABLE functions, so
    // normalize to the single row we expect. Belt-and-braces: handle both
    // shapes in case the client's rpc() behavior ever changes.
    const resultRow: any = Array.isArray(enqueueResult)
      ? enqueueResult[0]
      : enqueueResult

    if (!resultRow) {
      console.error('Failed to enqueue PDF generation job: RPC returned no row')
      return NextResponse.json({ error: 'Failed to queue PDF generation' }, { status: 500 })
    }

    const outcome: string = resultRow.outcome

    // A duplicate submission is one whose prior job is still queued/running or
    // already completed (no new work performed). 'replaced' means the prior job
    // was dead and we legitimately created a fresh one — NOT a duplicate.
    const isDuplicate = outcome === 'already_queued' || outcome === 'already_completed'

    if (isDuplicate) {
      return NextResponse.json({
        success: true,
        booking_id: booking.id,
        quote_id: quoteId,
        quote_number: quoteNumber,
        quotation: calculation,
        job_id: resultRow.id || null,
        duplicate: true,
      }, { status: 200 })
    }

    return NextResponse.json({
      success: true,
      booking_id: booking.id,
      quote_id: quoteId,
      quote_number: quoteNumber,
      quotation: calculation,
      job_id: resultRow.id || null,
    }, { status: 201 })
  } catch (error) {
    console.error('Submit booking error:', error)
    return NextResponse.json({ error: 'Failed to submit booking' }, { status: 500 })
  }
}

function calculateEndTime(startTime: string, durationHours: number): string {
  const [h, m] = startTime.split(':').map(Number)
  const endH = h + Math.floor(durationHours)
  const endM = m + (durationHours % 1) * 60
  return `${String(endH).padStart(2, '0')}:${String(Math.round(endM)).padStart(2, '0')}`
}
