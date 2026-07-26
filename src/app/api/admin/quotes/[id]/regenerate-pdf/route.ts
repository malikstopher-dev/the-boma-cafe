import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { generateAndStorePdf, downloadPdfBuffer } from '@/lib/pdf'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    try {
      const [btResult, vaResult] = await Promise.all([
        booking.booking_type_id
          ? client.from('booking_types').select('name').eq('id', booking.booking_type_id).maybeSingle()
          : Promise.resolve(null),
        booking.venue_area_id
          ? client.from('venue_areas').select('name').eq('id', booking.venue_area_id).maybeSingle()
          : Promise.resolve(null),
      ])
      if (btResult?.data) bookingTypeName = btResult.data.name
      if (vaResult?.data) venueAreaName = vaResult.data.name
    } catch {
      // Non-critical
    }

    // Fetch line items from quote_items
    const { data: items } = await client
      .from('quote_items')
      .select('*')
      .eq('quote_id', quoteId)
      .order('sort_order')

    const newVersion = (quote.version || 1) + 1

    const pdfInput = {
      quoteId: quote.id,
      quoteNumber: quote.quote_number,
      version: newVersion,
      customerName: booking.name || 'Customer',
      customerPhone: booking.phone || '',
      customerEmail: booking.email || '',
      bookingReference: booking.id,
      bookingType: bookingTypeName,
      venueArea: venueAreaName,
      foodPackage: 'None selected',
      drinkPackage: 'None selected',
      addons: '',
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
    }

    const pdfFileName = await generateAndStorePdf(pdfInput)

    if (!pdfFileName) {
      return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      storage_path: pdfFileName,
      pdf_version: newVersion,
      version: newVersion,
    })
  } catch (err) {
    console.error('Regenerate PDF error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
