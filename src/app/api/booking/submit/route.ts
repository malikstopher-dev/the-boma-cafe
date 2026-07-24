import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { checkRateLimit } from '@/lib/rate-limit'
import { bookingFormSchema, type BookingFormData } from '@/lib/booking/validation'
import { calculateQuotation } from '@/lib/booking/pricing'
import { generateQuoteNumber } from '@/lib/booking/quote-generator'
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
    const quoteNumber = generateQuoteNumber()
    const quoteId = await persistQuotation(booking.id, calculation, quoteNumber, settings.quote_validity_days)

    if (quoteId) {
      // Link quote to booking
      await client.from('bookings').update({ quote_id: quoteId, status: 'quote_sent' }).eq('id', booking.id)
    }

    // 5. Record tentative availability
    await recordAvailability(data.venue_area_id, booking.id, data.booking_date, data.booking_time, endTime, data.adults + data.children, 'tentative')

    // 6. Create audit entry
    await createAuditEntry({
      booking_id: booking.id,
      previous_status: null,
      new_status: quoteId ? 'quote_sent' : 'draft',
      changed_by: 'system',
      reason: 'Booking submitted via website',
    })

    // 7. Queue admin notification
    await client.from('notification_queue').insert({
      recipient_type: 'admin',
      recipient_identifier: 'info@thebomacafe.co.za',
      notification_type: 'admin_new_booking',
      template_data: {
        booking_id: booking.id,
        quote_number: quoteNumber,
        customer_name: data.name,
        total: calculation.total,
        booking_date: data.booking_date,
        booking_time: data.booking_time,
      },
    })

    return NextResponse.json({
      success: true,
      booking_id: booking.id,
      quote_id: quoteId,
      quote_number: quoteNumber,
      quotation: calculation,
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