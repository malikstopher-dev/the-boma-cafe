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
  if (!checkRateLimit(`booking-submit:${ip}`)) {
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

    // Idempotency key derived from stable booking content so a double-submit
    // (e.g. double-click) collides at the DB UNIQUE constraint rather than
    // producing two jobs/quotes for the same reservation request.
    const idempotencyKey = `booking-submit:${data.email}:${data.booking_date}:${data.booking_time}:${data.venue_area_id}`

    const jobPayload = {
      job_type: 'pdf_generation',
      payload: {
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
      },
      idempotency_key: idempotencyKey,
      priority: 1,
      max_retries: 3,
    }

    const { data: job, error: jobError } = await client
      .from('background_jobs')
      .insert(jobPayload)
      .select('id')
      .single()

    // Handle duplicate submission: same content already enqueued/processed.
    // Replay the existing job id so a double-click never creates duplicate work.
    if (jobError && jobError.code === '23505') {
      const { data: existingJob } = await client
        .from('background_jobs')
        .select('id, payload')
        .eq('idempotency_key', idempotencyKey)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      return NextResponse.json({
        success: true,
        booking_id: booking.id,
        quote_id: quoteId,
        quote_number: quoteNumber,
        quotation: calculation,
        job_id: existingJob?.id || null,
        duplicate: true,
      }, { status: 200 })
    }

    if (jobError || !job) {
      console.error('Failed to enqueue PDF generation job:', jobError?.message)
      return NextResponse.json({ error: 'Failed to queue PDF generation' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      booking_id: booking.id,
      quote_id: quoteId,
      quote_number: quoteNumber,
      quotation: calculation,
      job_id: job?.id || null,
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
