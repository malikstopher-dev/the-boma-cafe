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
  skipCustomerEmail?: boolean
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
  // Phase 2: Customer Email — transactional-outbox idempotency.
  //
  // Same pattern as Phase 3 admin notification: pre-claim a
  // notification_queue row with status='pending' BEFORE sending.
  // If the worker crashes between sendEmail (Resend confirmed) and
  // the quotes.update(quotation_email_sent_at), the retry will see
  // the 'pending' row and re-attempt — but the 'sent' gate prevents
  // a duplicate send if the UPDATE did land before the crash.
  // ============================================================

  if (payload.skipCustomerEmail) {
    logger.info('customer email skipped (skipCustomerEmail flag)', {
      quote_id: payload.quoteId,
    })
  } else {
    const customerNotifKey = payload.quoteNumber

    // Look up prior queue row for this quote's customer email
    const { data: priorCustomerNotif, error: custLookupErr } = await client
      .from('notification_queue')
      .select('id, status')
      .eq('recipient_type', 'customer')
      .eq('notification_type', 'quote_ready')
      .eq('recipient_identifier', customerNotifKey)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let shouldSendCustomer = true
    let customerQueueRowId: string | null = null

    if (custLookupErr) {
      logger.warn('customer notification queue lookup failed, proceeding to send without idempotency check', {
        quote_id: payload.quoteId,
        error: custLookupErr.message,
      })
    } else if (priorCustomerNotif) {
      customerQueueRowId = priorCustomerNotif.id
      if (priorCustomerNotif.status === 'sent') {
        shouldSendCustomer = false
        logger.info('customer email already sent (outbox gate), skipping', {
          quote_id: payload.quoteId,
          quote_number: payload.quoteNumber,
        })
      } else if (priorCustomerNotif.status === 'failed') {
        shouldSendCustomer = false
        logger.warn('customer email previously failed permanently, skipping', {
          quote_id: payload.quoteId,
          quote_number: payload.quoteNumber,
        })
      }
      // status='pending' -> shouldSend stays true; re-attempt
    }

    // Also check the existing quotes.quotation_email_sent_at as a
    // secondary idempotency guard (covers jobs queued before the
    // outbox pattern was added).
    if (shouldSendCustomer && existingQuote?.quotation_email_sent_at && existingQuote?.quotation_email_recipient === payload.customerEmail) {
      shouldSendCustomer = false
      logger.info('customer email already sent (quotes column), skipping', {
        quote_id: payload.quoteId,
        sent_at: existingQuote.quotation_email_sent_at,
        recipient: existingQuote.quotation_email_recipient,
      })
    }

    if (shouldSendCustomer) {
      // Pre-claim the queue slot
      if (!customerQueueRowId) {
        const { data: insertedCustRow, error: custInsertErr } = await client
          .from('notification_queue')
          .insert({
            recipient_type: 'customer',
            recipient_identifier: customerNotifKey,
            notification_type: 'quote_ready',
            template_data: {
              quote_id: payload.quoteId,
              quote_number: payload.quoteNumber,
              customer_email: payload.customerEmail,
            },
            status: 'pending',
          })
          .select('id')
          .single()

        if (custInsertErr || !insertedCustRow) {
          throw new Error(`Failed to pre-claim customer notification queue slot: ${custInsertErr?.message}`)
        }

        customerQueueRowId = insertedCustRow.id
      }

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

      // Mark the queue row as sent
      const { error: custMarkSentErr } = await client
        .from('notification_queue')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', customerQueueRowId)

      if (custMarkSentErr) {
        logger.warn('customer email sent but queue row not marked sent — next retry will re-send', {
          quote_id: payload.quoteId,
          queue_row_id: customerQueueRowId,
          error: custMarkSentErr.message,
        })
      }

      // Also update quotes table (kept for backward compat + dashboard)
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
        queue_row_id: customerQueueRowId,
      })
    }
  }

  // ============================================================
  // Phase 3: Admin Notification Email — transactional-outbox idempotency.
  //
  // Pattern:
  //   1. Look up notification_queue row for this quote + 'admin_new_booking'.
  //      - NONE: insert a fresh row with status='pending'. Proceed to send.
  //      - status='sent': a previous attempt fully completed the email.
  //        Skip the send (idempotent dedup against crash-retry storms).
  //      - status='pending': a previous attempt pre-claimed the slot but
  //        died before the email confirmed. Re-attempt the send, then mark
  //        sent. This handles the "crashed mid-send" case.
  //      - status='failed': the previous attempt gave up permanently. Skip
  //        (we don't retry forever; admin sees the booking via dashboard).
  //   2. Send the email. If it throws, bubble to the worker's retry
  //      (do NOT swallow — email failure must count as a job failure so
  //      the worker's retry/dead_letter machinery kicks in). The queue row
  //      remains 'pending', so the next retry will re-attempt the send.
  //   3. On successful send, UPDATE the queue row to status='sent'.
  //
  // Worst case across a crash-retry cycle: at most ONE actual email send
  // per quote. Without this gate, a worker that crashed between
  // sendEmailToMultiple and the final job-status UPDATE would have the
  // scheduler retry the job and fire ANOTHER admin email — unbounded
  // amplification per crash (the operational defect we set out to fix).
  // ============================================================

  if (payload.notificationEmails && payload.notificationEmails.length > 0) {
    const adminNotifKey = payload.quoteNumber

    const { data: priorAdminNotif, error: lookupErr } = await client
      .from('notification_queue')
      .select('id, status')
      .eq('recipient_type', 'admin')
      .eq('notification_type', 'admin_new_booking')
      .eq('recipient_identifier', adminNotifKey)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let shouldSend = true
    let queueRowId: string | null = null

    if (lookupErr) {
      // Lookup failed: we cannot safely decide. Log + fall through to send.
      // Worst case is one duplicate send if a prior attempt's row exists
      // but we couldn't see it. Acceptable; better than breaking bookings.
      logger.warn('admin notification queue lookup failed, proceeding to send without idempotency check', {
        quote_id: payload.quoteId,
        error: lookupErr.message,
      })
    } else if (priorAdminNotif) {
      queueRowId = priorAdminNotif.id
      const priorStatus = priorAdminNotif.status
      if (priorStatus === 'sent') {
        shouldSend = false
        logger.info('admin notification already sent, skipping', {
          quote_id: payload.quoteId,
          quote_number: payload.quoteNumber,
        })
      } else if (priorStatus === 'failed') {
        shouldSend = false
        logger.warn('admin notification previously failed permanently, skipping', {
          quote_id: payload.quoteId,
          quote_number: payload.quoteNumber,
        })
      }
      // status='pending' (or any other) -> shouldSend stays true. We'll re-attempt.
    }

    if (shouldSend) {
      // Pre-claim the queue slot with status='pending' so a crash between
      // this INSERT and the email send is visible to the next retry (which
      // will see a 'pending' row and re-attempt).
      if (!queueRowId) {
        const { data: insertedQueueRow, error: insertErr } = await client
          .from('notification_queue')
          .insert({
            recipient_type: 'admin',
            recipient_identifier: adminNotifKey,
            notification_type: 'admin_new_booking',
            template_data: {
              quote_id: payload.quoteId,
              quote_number: payload.quoteNumber,
              booking_id: payload.bookingReference,
              recipients: payload.notificationEmails,
            },
            status: 'pending',
          })
          .select('id')
          .single()

        if (insertErr || !insertedQueueRow) {
          // Insert failed. If the email sends fine and we can't mark the
          // row, the next retry WILL re-send (because there's no row to
          // gate). To guarantee idempotency we ABORT the send here and let
          // the job retry the whole phase later.
          throw new Error(`Failed to pre-claim admin notification queue slot: ${insertErr?.message}`)
        }

        queueRowId = insertedQueueRow.id
      }

      // (queueRowId is now non-null — either a fresh 'pending' row we just
      // inserted, or a 'pending' row from a prior crashed attempt we're
      // re-attempting.)
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

      // sendEmailToMultiple throws on failure — propagates to the worker's
      // catch, which sets status back to 'pending' with retry backoff. The
      // queue row stays 'pending'; the retry will re-attempt the send and
      // mark it 'sent' on success.
      await sendEmailToMultiple({
        recipients: payload.notificationEmails,
        subject: `New Booking (${payload.quoteNumber})`,
        html: adminHtml,
        text: adminText,
      })

      // Email confirmed -> mark the queue row sent. If this UPDATE fails
      // (e.g. transient DB hiccup, process killed right here), the next
      // retry will see a 'pending' row and RE-SEND the email. That's the
      // one acceptable duplicate window for the outbox pattern — bounded
      // to exactly one extra send per retry, infinitely better than the
      // unbounded storm we had before.
      const { error: markSentErr } = await client
        .from('notification_queue')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', queueRowId)

      if (markSentErr) {
        logger.warn('admin email sent but queue row not marked sent — next retry will re-send', {
          quote_id: payload.quoteId,
          queue_row_id: queueRowId,
          error: markSentErr.message,
        })
      } else {
        logger.info('admin notifications sent and recorded', {
          quote_id: payload.quoteId,
          recipient_count: payload.notificationEmails.length,
          queue_row_id: queueRowId,
        })
      }
    }
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
