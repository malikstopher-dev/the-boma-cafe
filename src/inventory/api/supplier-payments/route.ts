import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { recordSupplierPayment } from '../../engine/payables'
import { requireInventoryPermission } from '../../lib/require-inventory-permission'
import { getAdminContext } from '@/lib/admin/context'
import { logAdminAction } from '@/lib/admin/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const denied = await requireInventoryPermission(request, 'supplier.finance.write')
  if (denied) return denied
  try {
    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: { message: 'Invalid request body' } }, { status: 400 })

    const invoiceId = body.invoiceId ? String(body.invoiceId) : null
    const supplierId = body.supplierId ? String(body.supplierId) : null
    const amount = Number(body.amount)
    if (!(amount > 0)) return NextResponse.json({ error: { message: 'amount must be positive' } }, { status: 400 })
    const paidAt = body.paidAt ? String(body.paidAt) : new Date().toISOString()

    const admin = await getAdminContext(request)
    if (!admin) return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    const result = await recordSupplierPayment({
      invoiceId,
      supplierId,
      amount,
      paidAt,
      recordedBy: admin.adminId,
      method: body.method ? String(body.method) : 'EFT',
      reference: body.reference ? String(body.reference) : null,
      notes: body.notes ? String(body.notes) : null,
      idempotencyKey: body.idempotencyKey ? String(body.idempotencyKey) : null,
    })
    if (!result.already_recorded) {
      await logAdminAction({ adminId: admin.adminId, adminName: admin.displayName, adminRole: admin.role, action: 'supplier.payment_record', targetType: 'inventory_supplier_invoices', targetId: result.invoice_id, after: { payment_id: result.id, amount, paid_at: paidAt, status: result.status }, ipAddress: request.headers.get('x-forwarded-for') || null, userAgent: request.headers.get('user-agent') || null, sessionId: admin.sessionId })
    }
    return NextResponse.json({ data: result }, { status: result.already_recorded ? 200 : 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to record payment'
    const status = /required|positive|not found|exceeds|not payable/i.test(message) ? 400 : 500
    return NextResponse.json({ error: { message } }, { status })
  }
}
