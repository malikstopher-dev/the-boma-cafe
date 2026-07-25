import { getAdminClient } from '@/lib/supabase'

const BUCKET_NAME = 'quotations'

function getStoragePath(quoteNumber: string, version: number): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}/${month}/${quoteNumber}/quotation-v${version}.pdf`
}

export function parseStoragePath(quoteNumber: string, version: number): string {
  return getStoragePath(quoteNumber, version)
}

async function getBucket() {
  const client = await getAdminClient()
  return client.storage.from(BUCKET_NAME)
}

export async function ensureBucket(): Promise<boolean> {
  try {
    const client = await getAdminClient()
    const { data: existing } = await client.storage.getBucket(BUCKET_NAME)
    if (existing) return true

    const { error } = await client.storage.createBucket(BUCKET_NAME, {
      public: false,
      fileSizeLimit: 10 * 1024 * 1024,
    })
    if (error) {
      console.error('Failed to create quotations bucket:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('ensureBucket error:', err)
    return false
  }
}

export async function uploadPdf(
  quoteNumber: string,
  buffer: Buffer,
  version: number
): Promise<string | null> {
  try {
    const fileName = getStoragePath(quoteNumber, version)
    const bucket = await getBucket()
    const { error } = await bucket.upload(fileName, buffer, {
      contentType: 'application/pdf',
      upsert: false,
    })
    if (error) {
      console.error('Failed to upload PDF:', error)
      return null
    }
    return fileName
  } catch (err) {
    console.error('uploadPdf error:', err)
    return null
  }
}

export async function getPdfSignedUrl(fileName: string, expirySeconds = 900): Promise<string | null> {
  try {
    const bucket = await getBucket()
    const { data } = await bucket.createSignedUrl(fileName, expirySeconds)
    if (!data) return null
    return data.signedUrl
  } catch (err) {
    console.error('getPdfSignedUrl error:', err)
    return null
  }
}

export async function downloadPdfBuffer(fileName: string): Promise<Buffer | null> {
  try {
    const bucket = await getBucket()
    const { data, error } = await bucket.download(fileName)
    if (error || !data) {
      console.error('Failed to download PDF:', error)
      return null
    }
    return Buffer.from(await data.arrayBuffer())
  } catch (err) {
    console.error('downloadPdfBuffer error:', err)
    return null
  }
}

export async function deletePdf(fileName: string): Promise<boolean> {
  try {
    const bucket = await getBucket()
    const { error } = await bucket.remove([fileName])
    if (error) {
      console.error('Failed to delete PDF:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('deletePdf error:', err)
    return false
  }
}
