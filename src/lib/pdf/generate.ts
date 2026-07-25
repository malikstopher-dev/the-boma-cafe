import React, { type ReactElement } from 'react'
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer'
import { QuotationPDF } from './QuotationPDF'
import { ensureBucket, uploadPdf, downloadPdfBuffer } from './storage'
import { generateQrDataUri } from './qrcode'
import { getAdminClient } from '@/lib/supabase'

export interface PdfGenerationInput {
  quoteId: string
  quoteNumber: string
  version: number
  customerName: string
  customerPhone: string
  customerEmail: string
  bookingReference: string
  bookingType: string
  venueArea: string
  foodPackage: string
  drinkPackage: string
  addons: string
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
  portalUrl?: string
}

export async function generateQuotationPdf(input: PdfGenerationInput): Promise<Buffer> {
  const dateIssued = new Date().toISOString().split('T')[0]

  let qrDataUri: string | null = null
  const qrUrl = input.portalUrl || `https://thebomacafe.co.za/booking/${input.quoteNumber}`
  try {
    qrDataUri = await generateQrDataUri(qrUrl)
  } catch {
    // QR code is non-critical
  }

  const element = React.createElement(QuotationPDF, {
    quoteNumber: input.quoteNumber,
    dateIssued,
    validUntil: input.validUntil,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    customerEmail: input.customerEmail,
    bookingReference: input.bookingReference,
    bookingType: input.bookingType,
    venueArea: input.venueArea,
    foodPackage: input.foodPackage,
    drinkPackage: input.drinkPackage,
    addons: input.addons,
    bookingDate: input.bookingDate,
    bookingTime: input.bookingTime,
    guests: input.guests,
    lineItems: input.lineItems,
    subtotal: input.subtotal,
    taxRate: input.taxRate,
    taxAmount: input.taxAmount,
    total: input.total,
    depositPercentage: input.depositPercentage,
    depositAmount: input.depositAmount,
    balanceAmount: input.balanceAmount,
    qrDataUri,
    portalUrl: input.portalUrl,
  })

  return await renderToBuffer(element as React.ReactElement<DocumentProps>)
}

export async function generateAndStorePdf(
  input: PdfGenerationInput,
  generatedBy = 'system',
  reason = ''
): Promise<string | null> {
  try {
    const bucketReady = await ensureBucket()
    if (!bucketReady) {
      console.error('Quotations bucket not available')
      return null
    }

    const pdfBuffer = await generateQuotationPdf(input)

    const fileName = await uploadPdf(input.quoteNumber, pdfBuffer, input.version)
    if (!fileName) {
      console.error('Failed to upload PDF')
      return null
    }

    const client = await getAdminClient()
    await client
      .from('quotes')
      .update({
        storage_path: fileName,
        pdf_version: input.version,
        generated_at: new Date().toISOString(),
        generated_by: generatedBy,
      })
      .eq('id', input.quoteId)

    await client.from('quote_versions').insert({
      quote_id: input.quoteId,
      version: input.version,
      storage_path: fileName,
      generated_by: generatedBy,
      reason,
    })

    return fileName
  } catch (err) {
    console.error('generateAndStorePdf error:', err)
    return null
  }
}

export async function getPdfAttachmentData(fileName: string): Promise<{
  filename: string
  content: Buffer
  contentType: string
} | null> {
  try {
    const buffer = await downloadPdfBuffer(fileName)
    if (!buffer) return null

    const parts = fileName.split('/')
    const displayName = parts[parts.length - 1]

    return {
      filename: displayName,
      content: buffer,
      contentType: 'application/pdf',
    }
  } catch (err) {
    console.error('getPdfAttachmentData error:', err)
    return null
  }
}
