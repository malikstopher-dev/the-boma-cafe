import { getAdminClient } from '../../lib/supabase'
import { generateAndStorePdf, getPdfAttachmentData } from '../../lib/pdf/generate'
import { sendEmail, sendEmailToMultiple } from '../../lib/email/resend'
import { buildCustomerQuotationHtml, buildCustomerQuotationText } from '../../lib/email/templates/customer-quotation'
import { buildAdminNotificationHtml, buildAdminNotificationText } from '../../lib/email/templates/admin-notification'
import { formatCurrency } from '../../lib/booking/utils'
import { logger } from '../utils/logger'
import type { BackgroundJob } from '../types'

export interface PdfGenerationPayload {
  quoteId: string
  quoteNumber: string
  version: number
  customerName: string
  customerEmail: string
  customerPhone: string
  bookingReference: string
  bookingType: string
  venueArea: string
  foodPackage: string
  drinkPackage: string
  addons: string
  addonNames: Array<{ name: string; qty: number }>
  bookingDate: string
  bookingTime: string
  guests: number
  lineItems: Array<{
    label: string
    quantity: number
    unitPrice: number
    total: number
  }>
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  depositPercentage: number
  depositAmount: number
  balanceAmount: number
  validUntil: string
  portalUrl: string
  notificationEmails: string[]
  company: string | null
  specialRequests: string | null
}

export async function pdfGenerationHandler(job: BackgroundJob): Promise<Record<string, unknown>> {
  const payload = job.payload as unknown as PdfGenerationPayload
  const client = getAdminClient()

  logger.info('pdf handler started', {
    job_id: job.id,
    quote_id: payload.quoteId,
    quote_number: payload.quoteNumber,
  })

  // ============================================================
  // Phase 1: PDF Generation (idempotent via storage_path)
  // ============================================================

  const { data: existingQuote } = await client
    .from('quotes')
    .select('storage_path, pdf_version, quotation_email_sent_at, quotation_email_recipient')
    .eq('id', payload.quoteId)
    .single()

  let storagePath: string | null = existingQuote?.storage_path || null
  let pdfVersion = payload.version

  if (storagePath && existingQuote?.pdf_version && existingQuote.pdf_version >= payload.version) {
    logger.info('pdf already exists, skipping generation', {
      quote_id: payload.quoteId,
      storage_path: storagePath,
      pdf_version: existingQuote.pdf_version,
    })
  } else {
    pdfVersion = existingQuote?.pdf_version ? existingQuote.pdf_version + 1 : 1
    const generatedBy = existingQuote?.pdf_version ? 'worker-retry' : 'worker'

    storagePath = await generateAndStorePdf(
      {
        quoteId: payload.quoteId,
        quoteNumber: payload.quoteNumber,
        version: pdfVersion,
        customerName: payload.customerName,
        customerPhone: payload.customerPhone,
        customerEmail: payload.customerEmail,
        bookingReference: payload.bookingReference,
        bookingType: payload.bookingType,
        venueArea: payload.venueArea,
        foodPackage: payload.foodPackage,
        drinkPackage: payload.drinkPackage,
        addons: payload.addons,
        bookingDate: payload.bookingDate,
        bookingTime: payload.bookingTime,
        guests: payload.guests,
        lineItems: payload.lineItems,
        subtotal: payload.subtotal,
        taxRate: payload.taxRate,
        taxAmount: payload.taxAmount,
        total: payload.total,
        depositPercentage: payload.depositPercentage,
        depositAmount: payload.depositAmount,
        balanceAmount: payload.balanceAmount,
        validUntil: payload.validUntil,
        portalUrl: payload.portalUrl,
      },
      generatedBy,
      'Background worker PDF generation'
    )

    if (!storagePath) {
      throw new Error('PDF generation failed — storage path is null')
    }

    logger.info('pdf generated and stored', {
      quote_id: payload.quoteId,
      storage_path: storagePath,
      pdf_version: pdfVersion,
    })
  }

  // ============================================================
  // Phase 2: Customer Email (idempotent via quotation_email_sent_at)
  // ============================================================

  const emailAlreadySent = existingQuote?.quotation_email_sent_at && existingQuote?.quotation_email_recipient === payload.customerEmail

  if (emailAlreadySent) {
    logger.info('customer email already sent, skipping', {
      quote_id: payload.quoteId,
      sent_at: existingQuote.quotation_email_sent_at,
      recipient: existingQuote.quotation_email_recipient,
    })
  } else {
    const attachmentData = await getPdfAttachmentData(storagePath)

    const lineItemsHtml = payload.lineItems
      .filter((i) => i.total > 0)
      .map((item) =>
        `<tr><td style="padding:5px 0;font-size:13px;color:#555;">${item.label}${item.quantity > 1 ? ` x ${item.quantity}` : ''}</td><td style="padding:5px 0;font-size:13px;color:#333;text-align:right;">${formatCurrency(item.total)}</td></tr>`
      )
      .join('')

    const estimatedTotalStr = formatCurrency(payload.total)
    const depositStr = formatCurrency(payload.depositAmount)
    const balanceStr = formatCurrency(payload.balanceAmount)

    const customerHtml = buildCustomerQuotationHtml({
      customerName: payload.customerName,
      quoteNumber: payload.quoteNumber,
      bookingType: payload.bookingType,
      bookingDate: payload.bookingDate,
      bookingTime: payload.bookingTime,
      guests: payload.guests,
      estimatedTotal: estimatedTotalStr,
      depositAmount: depositStr,
      balanceAmount: balanceStr,
      venueArea: payload.venueArea,
      portalUrl: payload.portalUrl,
    })
    const customerText = buildCustomerQuotationText({
      customerName: payload.customerName,
      quoteNumber: payload.quoteNumber,
      bookingType: payload.bookingType,
      bookingDate: payload.bookingDate,
      bookingTime: payload.bookingTime,
      guests: payload.guests,
      estimatedTotal: estimatedTotalStr,
      depositAmount: depositStr,
      balanceAmount: balanceStr,
      venueArea: payload.venueArea,
      portalUrl: payload.portalUrl,
    })

    const emailSent = await sendEmail({
      to: payload.customerEmail,
      subject: `Your Booking Quotation (${payload.quoteNumber})`,
      html: customerHtml,
      text: customerText,
      attachments: attachmentData ? [attachmentData] : [],
    })

    if (!emailSent) {
      throw new Error('Customer email sending failed')
    }

    await client
      .from('quotes')
      .update({
        quotation_email_sent_at: new Date().toISOString(),
        quotation_email_recipient: payload.customerEmail,
      })
      .eq('id', payload.quoteId)

    logger.info('customer email sent', {
      quote_id: payload.quoteId,
      recipient: payload.customerEmail,
    })
  }

  // ============================================================
  // Phase 3: Admin Notification Email
  // ============================================================

  if (payload.notificationEmails && payload.notificationEmails.length > 0) {
    const addonsDisplayText = (payload.addonNames || [])
      .map((a) => `${a.name} x ${a.qty}`)
      .join(', ')

    const estimatedTotalStr = formatCurrency(payload.total)
    const depositStr = formatCurrency(payload.depositAmount)
    const balanceStr = formatCurrency(payload.balanceAmount)

    const lineItemsHtml = payload.lineItems
      .filter((i) => i.total > 0)
      .map((item) =>
        `<tr><td style="padding:5px 0;font-size:13px;color:#555;">${item.label}${item.quantity > 1 ? ` x ${item.quantity}` : ''}</td><td style="padding:5px 0;font-size:13px;color:#333;text-align:right;">${formatCurrency(item.total)}</td></tr>`
      )
      .join('')

    const adminHtml = buildAdminNotificationHtml({
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      customerEmail: payload.customerEmail,
      quoteNumber: payload.quoteNumber,
      bookingType: payload.bookingType,
      bookingDate: payload.bookingDate,
      bookingTime: payload.bookingTime,
      guests: payload.guests,
      venueArea: payload.venueArea,
      foodPackage: payload.foodPackage,
      drinkPackage: payload.drinkPackage,
      addons: addonsDisplayText,
      specialRequests: payload.specialRequests || '',
      lineItems: lineItemsHtml,
      estimatedTotal: estimatedTotalStr,
      depositAmount: depositStr,
      balanceAmount: balanceStr,
      subtotal: formatCurrency(payload.subtotal),
      taxAmount: formatCurrency(payload.taxAmount),
      taxRate: payload.taxRate,
      bookingId: payload.bookingReference,
    })
    const adminText = buildAdminNotificationText({
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      customerEmail: payload.customerEmail,
      quoteNumber: payload.quoteNumber,
      bookingType: payload.bookingType,
      bookingDate: payload.bookingDate,
      bookingTime: payload.bookingTime,
      guests: payload.guests,
      venueArea: payload.venueArea,
      foodPackage: payload.foodPackage,
      drinkPackage: payload.drinkPackage,
      addons: addonsDisplayText,
      specialRequests: payload.specialRequests || '',
      estimatedTotal: estimatedTotalStr,
      depositAmount: depositStr,
      balanceAmount: balanceStr,
      bookingId: payload.bookingReference,
    })

    await sendEmailToMultiple({
      recipients: payload.notificationEmails,
      subject: `New Booking (${payload.quoteNumber})`,
      html: adminHtml,
      text: adminText,
    })

    logger.info('admin notifications sent', {
      quote_id: payload.quoteId,
      recipient_count: payload.notificationEmails.length,
    })
  }

  // ============================================================
  // Phase 4: Notification Queue Entry
  // ============================================================

  try {
    await client.from('notification_queue').insert({
      recipient_type: 'customer',
      recipient_identifier: payload.customerEmail,
      notification_type: 'quote_ready',
      template_data: {
        quote_number: payload.quoteNumber,
        customer_name: payload.customerName,
        total: payload.total,
      },
      status: 'sent',
      sent_at: new Date().toISOString(),
    })
  } catch (err) {
    logger.warn('notification queue insert failed (non-critical)', {
      quote_id: payload.quoteId,
      error: String(err),
    })
  }

  return {
    storage_path: storagePath,
    pdf_version: pdfVersion,
    email_sent_to: payload.customerEmail,
    admin_notified: payload.notificationEmails.length > 0,
  }
}
