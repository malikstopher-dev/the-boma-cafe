import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { captureSupplierInvoice } from '../../engine/payables'
import { requireString } from '../../lib/api-utils'
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

    const supplierId = requireString(body.supplierId, 'supplierId')
    const invoiceDate = requireString(body.invoiceDate, 'invoiceDate')
    const totalAmount = Number(body.totalAmount)
    if (!(totalAmount > 0)) return NextResponse.json({ error: { message: 'totalAmount must be positive' } }, { status: 400 })

    const admin = await getAdminContext(request)
    const result = await captureSupplierInvoice({
      supplierId,
      invoiceNumber: body.invoiceNumber ? String(body.invoiceNumber) : null,
      invoiceDate,
      totalAmount,
      notes: body.notes ? String(body.notes) : null,
      capturedBy: null,
    })
    if (admin) {
      await logAdminAction({ adminId: admin.adminId, adminName: admin.displayName, adminRole: admin.role, action: 'supplier.invoice_capture', targetType: 'inventory_supplier_invoices', targetId: result.id, after: { supplier_id: supplierId, total_amount: totalAmount, invoice_date: invoiceDate }, ipAddress: request.headers.get('x-forwarded-for') || null, userAgent: request.headers.get('user-agent') || null, sessionId: admin.sessionId })
    }
    return NextResponse.json({ data: result }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to capture invoice'
    const status = /required|positive/i.test(message) ? 400 : 500
    return NextResponse.json({ error: { message } }, { status })
  }
}
