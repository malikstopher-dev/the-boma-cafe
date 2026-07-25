import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { createAuditEntry } from '@/lib/booking/audit'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { quoteNumber, token } = body

    if (!quoteNumber || !token) {
      return NextResponse.json({ error: 'Missing quoteNumber or token' }, { status: 400 })
    }

    const client = await getAdminClient()

    const { data: quote, error } = await client
      .from('quotes')
      .select('*, booking:bookings(id, status)')
      .eq('quote_number', quoteNumber)
      .maybeSingle()

    if (error || !quote) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
    }

    if (quote.access_token !== token) {
      return NextResponse.json({ error: 'Invalid access token' }, { status: 403 })
    }

    if (quote.status === 'accepted') {
      return NextResponse.json({ error: 'Quotation has already been accepted' }, { status: 409 })
    }

    if (quote.status === 'expired') {
      return NextResponse.json({ error: 'Quotation has expired' }, { status: 410 })
    }

    if (quote.status === 'cancelled') {
      return NextResponse.json({ error: 'Quotation has been cancelled' }, { status: 410 })
    }

    if (quote.valid_until && new Date(quote.valid_until) < new Date()) {
      await client.from('quotes').update({ status: 'expired' }).eq('id', quote.id)
      return NextResponse.json({ error: 'Quotation has expired' }, { status: 410 })
    }

    const booking = quote.booking
    if (!booking) {
      return NextResponse.json({ error: 'Associated booking not found' }, { status: 404 })
    }

    await Promise.all([
      client.from('quotes').update({ status: 'accepted' }).eq('id', quote.id),
      client.from('bookings').update({ status: 'awaiting_deposit' }).eq('id', booking.id),
      createAuditEntry({
        booking_id: booking.id,
        previous_status: booking.status,
        new_status: 'awaiting_deposit',
        changed_by: 'customer',
        reason: 'Quotation accepted via customer portal',
      }),
    ])

    return NextResponse.json({
      success: true,
      booking_id: booking.id,
      quote_id: quote.id,
    })
  } catch (err) {
    console.error('Accept quotation error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
