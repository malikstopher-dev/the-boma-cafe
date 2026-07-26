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
import { sendEmail, sendEmailToMultiple } from '@/lib/email/resend'
import { buildCustomerQuotationHtml, buildCustomerQuotationText } from '@/lib/email/templates/customer-quotation'
import { buildAdminNotificationHtml, buildAdminNotificationText } from '@/lib/email/templates/admin-notification'
import { formatCurrency } from '@/lib/booking/utils'
import { generateAndStorePdf, downloadPdfBuffer } from '@/lib/pdf'

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
    const quoteId = await persistQuotation(booking.id, calculation, quoteNumber, settings.quote_validity_days)

    let accessToken = ''
    if (quoteId) {
      accessToken = generateAccessToken(quoteId)
      await client.from('quotes').update({ access_token: accessToken }).eq('id', quoteId)
      await client.from('bookings').update({ quote_id: quoteId, status: 'quote_sent' }).eq('id', booking.id)
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
    const estimatedTotalStr = formatCurrency(calculation.total)
    const depositStr = formatCurrency(calculation.deposit_amount)
    const balanceStr = formatCurrency(calculation.balance_amount)

    // 6. Generate PDF quotation (never fails booking)
    let pdfAttachment: { filename: string; content: Buffer; contentType: string } | null = null
    if (quoteId) {
      const pdfInput = {
        portalUrl: `https://thebomacafe.co.za/booking/${quoteNumber}?token=${accessToken}`,
        quoteId,
        quoteNumber,
        version: 1,
        customerName: data.name,
        customerPhone: data.phone,
        customerEmail: data.email,
        bookingReference: booking.id,
        bookingType: bookingTypeName,
        venueArea: venueAreaName,
        foodPackage: foodPackageName,
        drinkPackage: drinkPackageName,
        addons: addonNames.map(a => `${a.name} x ${a.qty}`).join(', '),
        bookingDate: data.booking_date,
        bookingTime: data.booking_time,
        guests: data.adults + data.children,
        lineItems: calculation.line_items
          .filter((i: any) => i.total > 0)
          .map((i: any) => ({
            label: i.label,
            quantity: i.quantity,
            unitPrice: i.unit_price,
            total: i.total,
          })),
        subtotal: calculation.subtotal,
        taxRate: calculation.tax_rate,
        taxAmount: calculation.tax_amount,
        total: calculation.total,
        depositPercentage: calculation.deposit_percentage,
        depositAmount: calculation.deposit_amount,
        balanceAmount: calculation.balance_amount,
        validUntil: new Date(Date.now() + settings.quote_validity_days * 86400000).toISOString().split('T')[0],
      }
      try {
        const pdfFileName = await generateAndStorePdf(pdfInput, 'system', 'Initial quotation')
        if (pdfFileName) {
          const pdfBuffer = await downloadPdfBuffer(pdfFileName)
          if (pdfBuffer) {
            const parts = pdfFileName.split('/')
            pdfAttachment = {
              filename: parts[parts.length - 1],
              content: pdfBuffer,
              contentType: 'application/pdf',
            }
          }
        }
      } catch (err) {
        console.error('PDF generation failed (non-fatal):', err)
      }
    }

    // 7. Record tentative availability
    await recordAvailability(data.venue_area_id, booking.id, data.booking_date, data.booking_time, endTime, data.adults + data.children, 'tentative')

    // 8. Create audit entry
    await createAuditEntry({
      booking_id: booking.id,
      previous_status: null,
      new_status: quoteId ? 'quote_sent' : 'draft',
      changed_by: 'system',
      reason: 'Booking submitted via website',
    })

    // --- EMAIL SENDING ---

    // Build line items HTML for admin email
    const lineItemsHtml = calculation.line_items
      .filter((i: any) => i.total > 0)
      .map((item: any) =>
        `<tr><td style="padding:5px 0;font-size:13px;color:#555;">${item.label}${item.quantity > 1 ? ` x ${item.quantity}` : ''}</td><td style="padding:5px 0;font-size:13px;color:#333;text-align:right;">${formatCurrency(item.total)}</td></tr>`
      )
      .join('')

    // Send emails (never fail booking on email error)
    let customerEmailSent = false
    let adminEmailSent = false

    try {
      const portalUrl = `https://thebomacafe.co.za/booking/${quoteNumber}?token=${accessToken}`
      const customerHtml = buildCustomerQuotationHtml({
        customerName: data.name,
        quoteNumber,
        bookingType: bookingTypeName,
        bookingDate: data.booking_date,
        bookingTime: data.booking_time,
        guests,
        estimatedTotal: estimatedTotalStr,
        depositAmount: depositStr,
        balanceAmount: balanceStr,
        venueArea: venueAreaName,
        portalUrl,
      })
      const customerText = buildCustomerQuotationText({
        customerName: data.name,
        quoteNumber,
        bookingType: bookingTypeName,
        bookingDate: data.booking_date,
        bookingTime: data.booking_time,
        guests,
        estimatedTotal: estimatedTotalStr,
        depositAmount: depositStr,
        balanceAmount: balanceStr,
        venueArea: venueAreaName,
        portalUrl,
      })

      customerEmailSent = await sendEmail({
        to: data.email,
        subject: `Your Booking Quotation (${quoteNumber})`,
        html: customerHtml,
        text: customerText,
        attachments: pdfAttachment ? [pdfAttachment] : undefined,
      })
    } catch (err) {
      console.error('Failed to send customer email:', err)
    }

    try {
      const adminHtml = buildAdminNotificationHtml({
        customerName: data.name,
        customerPhone: data.phone,
        customerEmail: data.email,
        quoteNumber,
        bookingType: bookingTypeName,
        bookingDate: data.booking_date,
        bookingTime: data.booking_time,
        guests,
        venueArea: venueAreaName,
        foodPackage: foodPackageName,
        drinkPackage: drinkPackageName,
        addons: addonsDisplayText,
        specialRequests: data.special_requests || '',
        lineItems: lineItemsHtml,
        estimatedTotal: estimatedTotalStr,
        depositAmount: depositStr,
        balanceAmount: balanceStr,
        subtotal: formatCurrency(calculation.subtotal),
        taxAmount: formatCurrency(calculation.tax_amount),
        taxRate: calculation.tax_rate,
        bookingId: booking.id,
      })
      const adminText = buildAdminNotificationText({
        customerName: data.name,
        customerPhone: data.phone,
        customerEmail: data.email,
        quoteNumber,
        bookingType: bookingTypeName,
        bookingDate: data.booking_date,
        bookingTime: data.booking_time,
        guests,
        venueArea: venueAreaName,
        foodPackage: foodPackageName,
        drinkPackage: drinkPackageName,
        addons: addonsDisplayText,
        specialRequests: data.special_requests || '',
        estimatedTotal: estimatedTotalStr,
        depositAmount: depositStr,
        balanceAmount: balanceStr,
        bookingId: booking.id,
      })

      const adminRecipients = settings.notification_emails
      if (adminRecipients.length > 0) {
        adminEmailSent = await sendEmailToMultiple({
          recipients: adminRecipients,
          subject: `New Booking (${quoteNumber})`,
          html: adminHtml,
          text: adminText,
          attachments: pdfAttachment ? [pdfAttachment] : undefined,
        })
      }
    } catch (err) {
      console.error('Failed to send admin notification:', err)
    }

    // 7. Update notification queue with email results
    try {
      if (customerEmailSent) {
        await client.from('notification_queue').insert({
          recipient_type: 'customer',
          recipient_identifier: data.email,
          notification_type: 'quote_ready',
          template_data: {
            booking_id: booking.id,
            quote_number: quoteNumber,
            customer_name: data.name,
            total: calculation.total,
          },
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
      }
      if (adminEmailSent) {
        const adminRecipients = settings.notification_emails
        for (const email of adminRecipients) {
          await client.from('notification_queue').insert({
            recipient_type: 'admin',
            recipient_identifier: email,
            notification_type: 'admin_new_booking',
            template_data: {
              booking_id: booking.id,
              quote_number: quoteNumber,
              customer_name: data.name,
              total: calculation.total,
            },
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
        }
      }
    } catch (err) {
      console.error('Failed to update notification queue:', err)
    }

    return NextResponse.json({
      success: true,
      booking_id: booking.id,
      quote_id: quoteId,
      quote_number: quoteNumber,
      quotation: calculation,
      email_sent: customerEmailSent,
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
