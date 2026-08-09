import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { captureSupplierInvoice } from '../../engine/payables'
import { getHeader, requireString } from '../../lib/api-utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: { message: 'Invalid request body' } }, { status: 400 })

    const supplierId = requireString(body.supplierId, 'supplierId')
    const invoiceDate = requireString(body.invoiceDate, 'invoiceDate')
    const totalAmount = Number(body.totalAmount)
    if (!(totalAmount > 0)) return NextResponse.json({ error: { message: 'totalAmount must be positive' } }, { status: 400 })

    const result = await captureSupplierInvoice({
      supplierId,
      invoiceNumber: body.invoiceNumber ? String(body.invoiceNumber) : null,
      invoiceDate,
      totalAmount,
      notes: body.notes ? String(body.notes) : null,
      capturedBy: getHeader(request, 'x-user-staff-id'),
    })
    return NextResponse.json({ data: result }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to capture invoice'
    const status = /required|positive/i.test(message) ? 400 : 500
    return NextResponse.json({ error: { message } }, { status })
  }
}