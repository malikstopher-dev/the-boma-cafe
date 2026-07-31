import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth/requireRole'
import { sendEmail, sendEmailToMultiple } from '@/lib/email/resend'
import { buildCustomerQuotationHtml, buildCustomerQuotationText } from '@/lib/email/templates/customer-quotation'
import { buildAdminNotificationHtml, buildAdminNotificationText } from '@/lib/email/templates/admin-notification'
import { formatCurrency } from '@/lib/booking/utils'
import { getBookingSettings } from '@/lib/booking/settings'
import { downloadPdfBuffer } from '@/lib/pdf/storage'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(_request)
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
    let addonNames: string[] = []
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

    // Fetch addon names from quote_items
    try {
      const { data: addonItems } = await client
        .from('quote_items')
        .select('label')
        .eq('quote_id', quoteId)
        .eq('item_type', 'addon')
      addonNames = (addonItems || []).map((i: any) => i.label)
    } catch {
      // Non-critical
    }

    const guests = booking.guests || 0
    const estimatedTotalStr = formatCurrency(Number(quote.total))
    const depositStr = formatCurrency(Number(quote.deposit_amount))
    const balanceStr = formatCurrency(Number(quote.balance_amount))

    // Fetch line items for admin notification
    const { data: items } = await client
      .from('quote_items')
      .select('*')
      .eq('quote_id', quoteId)
      .order('sort_order')

    const lineItemsHtml = (items || [])
      .filter((i: any) => Number(i.total_price) > 0)
      .map((item: any) =>
        `<tr><td style="padding:5px 0;font-size:13px;color:#555;">${item.label}${item.quantity > 1 ? ` x ${item.quantity}` : ''}</td><td style="padding:5px 0;font-size:13px;color:#333;text-align:right;">${formatCurrency(Number(item.total_price))}</td></tr>`
      )
      .join('')

    // Load PDF attachment
    let pdfAttachment: { filename: string; content: Buffer; contentType: string } | null = null
    const pdfFilePath = quote.storage_path || quote.pdf_path
    if (pdfFilePath) {
      try {
        const pdfBuffer = await downloadPdfBuffer(pdfFilePath)
        if (pdfBuffer) {
          const parts = pdfFilePath.split('/')
          const displayName = parts[parts.length - 1]
          pdfAttachment = {
            filename: displayName,
            content: pdfBuffer,
            contentType: 'application/pdf',
          }
        }
      } catch (err) {
        console.error('Failed to load PDF attachment:', err)
      }
    }

    if (!pdfAttachment) {
      console.error('[resend] no PDF available — refusing to send email', {
        quote_id: quoteId,
        storage_path: quote.storage_path,
        pdf_path: quote.pdf_path,
      })
      return NextResponse.json({ error: 'Quotation PDF has not been generated.' }, { status: 409 })
    }

    // Send customer email
    let customerEmailSent = false
    try {
      const portalUrl = quote.access_token
        ? `https://the-boma-cafe.vercel.app/booking/${quote.quote_number}?token=${quote.access_token}`
        : undefined
      const customerHtml = buildCustomerQuotationHtml({
        customerName: booking.name || 'Customer',
        quoteNumber: quote.quote_number,
        bookingType: bookingTypeName,
        bookingDate: booking.booking_date || '',
        bookingTime: booking.booking_time || '',
        guests,
        estimatedTotal: estimatedTotalStr,
        depositAmount: depositStr,
        balanceAmount: balanceStr,
        venueArea: venueAreaName,
        portalUrl,
      })
      const customerText = buildCustomerQuotationText({
        customerName: booking.name || 'Customer',
        quoteNumber: quote.quote_number,
        bookingType: bookingTypeName,
        bookingDate: booking.booking_date || '',
        bookingTime: booking.booking_time || '',
        guests,
        estimatedTotal: estimatedTotalStr,
        depositAmount: depositStr,
        balanceAmount: balanceStr,
        venueArea: venueAreaName,
        portalUrl,
      })

      customerEmailSent = await sendEmail({
        to: booking.email,
        subject: `Your Booking Quotation (${quote.quote_number})`,
        html: customerHtml,
        text: customerText,
        attachments: pdfAttachment ? [pdfAttachment] : undefined,
      })
    } catch (err) {
      console.error('Failed to resend customer email:', err)
    }

    // Send admin notification
    let adminEmailSent = false
    try {
      const adminHtml = buildAdminNotificationHtml({
        customerName: booking.name || 'Customer',
        customerPhone: booking.phone || '',
        customerEmail: booking.email || '',
        quoteNumber: quote.quote_number,
        bookingType: bookingTypeName,
        bookingDate: booking.booking_date || '',
        bookingTime: booking.booking_time || '',
        guests,
        venueArea: venueAreaName,
        foodPackage: foodPackageName,
        drinkPackage: drinkPackageName,
        addons: addonNames.join(', '),
        specialRequests: booking.special_requests || booking.notes || '',
        lineItems: lineItemsHtml,
        estimatedTotal: estimatedTotalStr,
        depositAmount: depositStr,
        balanceAmount: balanceStr,
        subtotal: formatCurrency(Number(quote.subtotal)),
        taxAmount: formatCurrency(Number(quote.tax_amount)),
        taxRate: Number(quote.tax_rate),
        bookingId: booking.id,
      })
      const adminText = buildAdminNotificationText({
        customerName: booking.name || 'Customer',
        customerPhone: booking.phone || '',
        customerEmail: booking.email || '',
        quoteNumber: quote.quote_number,
        bookingType: bookingTypeName,
        bookingDate: booking.booking_date || '',
        bookingTime: booking.booking_time || '',
        guests,
        venueArea: venueAreaName,
        foodPackage: foodPackageName,
        drinkPackage: drinkPackageName,
        addons: addonNames.join(', '),
        specialRequests: booking.special_requests || booking.notes || '',
        estimatedTotal: estimatedTotalStr,
        depositAmount: depositStr,
        balanceAmount: balanceStr,
        bookingId: booking.id,
      })

      const settings = await getBookingSettings()
      const adminRecipients = settings.notification_emails
      if (adminRecipients.length > 0) {
        adminEmailSent = await sendEmailToMultiple({
          recipients: adminRecipients,
          subject: `New Booking (${quote.quote_number})`,
          html: adminHtml,
          text: adminText,
          attachments: pdfAttachment ? [pdfAttachment] : undefined,
        })
      }
    } catch (err) {
      console.error('Failed to resend admin notification:', err)
    }

    // Mark quote as sent if it was draft
    if (quote.status === 'draft') {
      await client.from('quotes').update({ status: 'sent' }).eq('id', quoteId)
    }

    return NextResponse.json({
      success: customerEmailSent || adminEmailSent,
      customer_email_sent: customerEmailSent,
      admin_email_sent: adminEmailSent,
    })
  } catch (err) {
    console.error('Resend quotation error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
