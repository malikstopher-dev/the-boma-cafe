import crypto from 'crypto'
import { getAdminClient } from '@/lib/supabase'

let cachedSequence = 0
let lastYear = 0

export async function generateQuoteNumber(): Promise<string> {
  const now = new Date()
  const year = now.getFullYear()

  if (year !== lastYear) {
    cachedSequence = 0
    lastYear = year
  }

  if (cachedSequence === 0) {
    try {
      const client = await getAdminClient()
      const { data } = await client
        .from('quotes')
        .select('quote_number')
        .ilike('quote_number', `BMC-${year}-%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (data?.quote_number) {
        const parts = data.quote_number.split('-')
        const lastSeq = parseInt(parts[parts.length - 1], 10)
        cachedSequence = isNaN(lastSeq) ? 0 : lastSeq
      }
    } catch {
      cachedSequence = 0
    }
  }

  cachedSequence++
  const seq = cachedSequence.toString().padStart(4, '0')
  return `BMC-${year}-${seq}`
}

export function generateAccessToken(_quoteId: string): string {
  return crypto.randomBytes(32).toString('hex')
}
