import { getAdminClient } from '../../lib/supabase'
import { generateAndStorePdf, getPdfAttachmentData } from '../../lib/pdf/generate'
import { sendEmailWithResult, sendEmailToMultipleWithResult } from '../../lib/email/resend'
import { buildCustomerQuotationHtml, buildCustomerQuotationText } from '../../lib/email/templates/customer-quotation'
import { buildAdminNotificationHtml, buildAdminNotificationText } from '../../lib/email/templates/admin-notification'
import { formatCurrency } from '../../lib/booking/utils'
import { logger } from '../utils/logger'
import {
  beginNotificationAttempt,
  claimNotification,
  finishNotificationAttempt,
  notificationProviderKey,
} from '../utils/notification-outbox'
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
    let shouldSendCustomer = true

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
      const claim = await claimNotification(
        'customer',
        'quote_ready',
        customerNotifKey,
        {
          quote_id: payload.quoteId,
          quote_number: payload.quoteNumber,
          customer_email: payload.customerEmail,
        },
      )
      shouldSendCustomer = claim.should_send
      if (!shouldSendCustomer) {
        logger.info('customer email already finalized in outbox, skipping', {
          quote_id: payload.quoteId,
          status: claim.status,
        })
      } else {
        const idempotencyKey = notificationProviderKey('quote_ready', payload.quoteId, payload.version)
        const attemptId = await beginNotificationAttempt(claim.id, idempotencyKey)
        if (!attemptId) {
          logger.info('customer email finalized by concurrent delivery, skipping', { quote_id: payload.quoteId })
          shouldSendCustomer = false
        } else {
          const attachmentData = await getPdfAttachmentData(storagePath)

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

          try {
            const emailResult = await sendEmailWithResult({
              to: payload.customerEmail,
              subject: `Your Booking Quotation (${payload.quoteNumber})`,
              html: customerHtml,
              text: customerText,
              attachments: attachmentData ? [attachmentData] : [],
            }, { idempotencyKey })
            await finishNotificationAttempt(claim.id, attemptId, [emailResult.providerId], null)
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            await finishNotificationAttempt(claim.id, attemptId, null, message).catch(() => undefined)
            throw error
          }

          const { error: quoteMarkError } = await client
            .from('quotes')
            .update({
              quotation_email_sent_at: new Date().toISOString(),
              quotation_email_recipient: payload.customerEmail,
            })
            .eq('id', payload.quoteId)
          if (quoteMarkError) {
            logger.warn('customer outbox sent but quote marker update failed', {
              quote_id: payload.quoteId,
              error: quoteMarkError.message,
            })
          }

          logger.info('customer email sent', {
            quote_id: payload.quoteId,
            recipient: payload.customerEmail,
            queue_row_id: claim.id,
          })
        }
      }
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
  // Crash/concurrent retries reuse the same provider idempotency key, so
  // Resend converges them on one provider submission. Without this gate, a worker that crashed between
  // sendEmailToMultiple and the final job-status UPDATE would have the
  // scheduler retry the job and fire ANOTHER admin email — unbounded
  // amplification per crash (the operational defect we set out to fix).
  // ============================================================

  if (payload.notificationEmails && payload.notificationEmails.length > 0) {
    const adminNotifKey = payload.quoteNumber
    const claim = await claimNotification(
      'admin',
      'admin_new_booking',
      adminNotifKey,
      {
        quote_id: payload.quoteId,
        quote_number: payload.quoteNumber,
        booking_id: payload.bookingReference,
        recipients: payload.notificationEmails,
      },
    )
    let shouldSend = claim.should_send

    if (shouldSend) {
      const idempotencyKey = notificationProviderKey('admin_new_booking', payload.quoteId, payload.version)
      const attemptId = await beginNotificationAttempt(claim.id, idempotencyKey)
      if (!attemptId) shouldSend = false

      if (shouldSend && attemptId) {
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
      try {
        const emailResult = await sendEmailToMultipleWithResult({
          recipients: payload.notificationEmails,
          subject: `New Booking (${payload.quoteNumber})`,
          html: adminHtml,
          text: adminText,
        }, { idempotencyKey })
        await finishNotificationAttempt(claim.id, attemptId, emailResult.providerIds, null)
        logger.info('admin notifications sent and recorded', {
          quote_id: payload.quoteId,
          recipient_count: payload.notificationEmails.length,
          queue_row_id: claim.id,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        await finishNotificationAttempt(claim.id, attemptId, null, message).catch(() => undefined)
        throw error
      }
      }
    }
  }

  // ============================================================
  // Phase 4: Removed — Phase 2 already records the customer
  // notification in notification_queue with outbox idempotency.
  // ============================================================

  return {
    storage_path: storagePath,
    pdf_version: pdfVersion,
    email_sent_to: payload.customerEmail,
    admin_notified: payload.notificationEmails.length > 0,
  }
}
