import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { recordSupplierPayment } from '../../engine/payables'
import { getHeader } from '../../lib/api-utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: { message: 'Invalid request body' } }, { status: 400 })

    const invoiceId = body.invoiceId ? String(body.invoiceId) : null
    const supplierId = body.supplierId ? String(body.supplierId) : null
    const amount = Number(body.amount)
    if (!(amount > 0)) return NextResponse.json({ error: { message: 'amount must be positive' } }, { status: 400 })
    const paidAt = body.paidAt ? String(body.paidAt) : new Date().toISOString()

    const result = await recordSupplierPayment({
      invoiceId,
      supplierId,
      amount,
      paidAt,
      recordedBy: getHeader(request, 'x-user-staff-id'),
    })
    return NextResponse.json({ data: result }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to record payment'
    const status = /required|positive|not found/i.test(message) ? 400 : 500
    return NextResponse.json({ error: { message } }, { status })
  }
}