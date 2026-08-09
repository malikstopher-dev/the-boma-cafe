import { NextResponse } from 'next/server'
import { getSupplierPayables } from '../../engine/payables'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const data = await getSupplierPayables()
    return NextResponse.json({ data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load supplier payables'
    return NextResponse.json({ error: { message } }, { status: 500 })
  }
}