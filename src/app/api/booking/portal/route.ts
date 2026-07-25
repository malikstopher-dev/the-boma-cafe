import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { formatCurrency } from '@/lib/booking/utils'
import { getBookingSettings } from '@/lib/booking/settings'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const quoteNumber = request.nextUrl.searchParams.get('quoteNumber')
    const token = request.nextUrl.searchParams.get('token')

    if (!quoteNumber || !token) {
      return NextResponse.json({ error: 'Missing quoteNumber or token' }, { status: 400 })
    }

    const client = await getAdminClient()

    const { data: quote, error } = await client
      .from('quotes')
      .select('*, booking:bookings(*)')
      .eq('quote_number', quoteNumber)
      .maybeSingle()

    if (error || !quote) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
    }

    if (quote.access_token !== token) {
      return NextResponse.json({ error: 'Invalid access token' }, { status: 403 })
    }

    const { data: items } = await client
      .from('quote_items')
      .select('*')
      .eq('quote_id', quote.id)
      .order('sort_order')

    const booking = quote.booking

    let bookingTypeName = 'Event'
    let venueAreaName = 'Venue'
    let foodPackageName = 'None selected'
    let drinkPackageName = 'None selected'
    try {
      const [btResult, vaResult, fpResult, dpResult] = await Promise.all([
        booking?.booking_type_id
          ? client.from('booking_types').select('name').eq('id', booking.booking_type_id).maybeSingle()
          : Promise.resolve(null),
        booking?.venue_area_id
          ? client.from('venue_areas').select('name').eq('id', booking.venue_area_id).maybeSingle()
          : Promise.resolve(null),
        Promise.resolve(null),
        Promise.resolve(null),
      ])
      if (btResult?.data) bookingTypeName = btResult.data.name
      if (vaResult?.data) venueAreaName = vaResult.data.name
    } catch {}

    const isExpired = quote.valid_until && new Date(quote.valid_until) < new Date()
    const settings = await getBookingSettings()

    return NextResponse.json({
      payments_enabled: settings.payments_enabled,
      quote: {
        id: quote.id,
        quote_number: quote.quote_number,
        status: quote.status,
        subtotal: Number(quote.subtotal),
        tax_rate: Number(quote.tax_rate),
        tax_amount: Number(quote.tax_amount),
        total: Number(quote.total),
        deposit_percentage: Number(quote.deposit_percentage),
        deposit_amount: Number(quote.deposit_amount),
        balance_amount: Number(quote.balance_amount),
        valid_until: quote.valid_until,
        issued_at: quote.created_at,
        is_expired: isExpired,
        pdf_version: quote.pdf_version,
      },
      booking: booking ? {
        id: booking.id,
        name: booking.name,
        phone: booking.phone,
        email: booking.email,
        booking_type: bookingTypeName,
        venue_area: venueAreaName,
        booking_date: booking.booking_date,
        booking_time: booking.booking_time,
        guests: booking.guests,
        status: booking.status,
      } : null,
      items: (items || []).map((item: any) => ({
        label: item.label,
        description: item.description,
        item_type: item.item_type,
        quantity: item.quantity,
        unit_price: Number(item.unit_price),
        total_price: Number(item.total_price),
      })),
      formatted: {
        total: formatCurrency(Number(quote.total)),
        subtotal: formatCurrency(Number(quote.subtotal)),
        tax: formatCurrency(Number(quote.tax_amount)),
        deposit: formatCurrency(Number(quote.deposit_amount)),
        balance: formatCurrency(Number(quote.balance_amount)),
      },
    })
  } catch (err) {
    console.error('Portal fetch error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
