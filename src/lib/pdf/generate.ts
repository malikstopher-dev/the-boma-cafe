import { ensureBucket, uploadPdf, downloadPdfBuffer } from './storage'
import { getAdminClient } from '@/lib/supabase'
import { generateQuotationPdfPdfkit } from './generate-pdfkit'

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
  return generateQuotationPdfPdfkit(input)
}

export async function generateAndStorePdf(
  input: PdfGenerationInput,
  generatedBy = 'system',
  reason = ''
): Promise<string | null> {
  console.log('[generateAndStorePdf] step 1/5: ensureBucket — starting')
  const bucketReady = await ensureBucket()
  if (!bucketReady) {
    console.error('[generateAndStorePdf] step 1/5: ensureBucket — FAILED')
    return null
  }
  console.log('[generateAndStorePdf] step 1/5: ensureBucket — ok')

  console.log('[generateAndStorePdf] step 2/5: generateQuotationPdf — starting')
  let pdfBuffer: Buffer
  try {
    pdfBuffer = await generateQuotationPdf(input)
  } catch (err) {
    console.error('[generateAndStorePdf] step 2/5: generateQuotationPdf — FAILED')
    console.error('[generateAndStorePdf]   name:', (err as any)?.name)
    console.error('[generateAndStorePdf]   message:', (err as any)?.message)
    console.error('[generateAndStorePdf]   stack:', (err as any)?.stack)
    throw err
  }
  console.log('[generateAndStorePdf] step 2/5: generateQuotationPdf — ok (' + pdfBuffer.length + ' bytes)')

  console.log('[generateAndStorePdf] step 3/5: uploadPdf — starting (' + input.quoteNumber + ', v' + input.version + ')')
  const fileName = await uploadPdf(input.quoteNumber, pdfBuffer, input.version)
  if (!fileName) {
    console.error('[generateAndStorePdf] step 3/5: uploadPdf — FAILED (returned null)')
    return null
  }
  console.log('[generateAndStorePdf] step 3/5: uploadPdf — ok (' + fileName + ')')

  console.log('[generateAndStorePdf] step 4/5: quotes.update — starting')
  try {
    const client = await getAdminClient()
    const { error: updateError } = await client
      .from('quotes')
      .update({
        storage_path: fileName,
        pdf_version: input.version,
        generated_at: new Date().toISOString(),
        generated_by: generatedBy,
      })
      .eq('id', input.quoteId)
    if (updateError) {
      console.error('[generateAndStorePdf] step 4/5: quotes.update — FAILED:', updateError.message)
      console.error('[generateAndStorePdf]   details:', JSON.stringify(updateError))
      return null
    }
  } catch (err) {
    console.error('[generateAndStorePdf] step 4/5: quotes.update — EXCEPTION')
    console.error('[generateAndStorePdf]   name:', (err as any)?.name)
    console.error('[generateAndStorePdf]   message:', (err as any)?.message)
    console.error('[generateAndStorePdf]   stack:', (err as any)?.stack)
    throw err
  }
  console.log('[generateAndStorePdf] step 4/5: quotes.update — ok')

  console.log('[generateAndStorePdf] step 5/5: quote_versions.insert — starting')
  try {
    const client = await getAdminClient()
    const { error: versionError } = await client
      .from('quote_versions')
      .insert({
        quote_id: input.quoteId,
        version: input.version,
        storage_path: fileName,
        generated_by: generatedBy,
        reason,
      })
    if (versionError) {
      console.error('[generateAndStorePdf] step 5/5: quote_versions.insert — FAILED:', versionError.message)
      console.error('[generateAndStorePdf]   details:', JSON.stringify(versionError))
      return null
    }
  } catch (err) {
    console.error('[generateAndStorePdf] step 5/5: quote_versions.insert — EXCEPTION')
    console.error('[generateAndStorePdf]   name:', (err as any)?.name)
    console.error('[generateAndStorePdf]   message:', (err as any)?.message)
    console.error('[generateAndStorePdf]   stack:', (err as any)?.stack)
    throw err
  }
  console.log('[generateAndStorePdf] step 5/5: quote_versions.insert — ok')

  console.log('[generateAndStorePdf] complete — success (' + fileName + ')')
  return fileName
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
