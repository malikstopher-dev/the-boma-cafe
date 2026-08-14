import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse } from '@/inventory/engine/types'
import { approveStockCount } from '@/inventory/engine/stock-counts'
import { isUuid, uuidError } from '@/inventory/lib/api-utils'
import { getAdminContext } from '@/lib/admin/context'
import { logAdminAction } from '@/lib/admin/audit'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const { id } = await params
    if (!isUuid(id)) {
      return NextResponse.json({ error: uuidError('id') }, { status: 400 })
    }
    let raw: Record<string, unknown> = {}
    try { raw = await request.json() } catch { /* empty body */ }
    const body = raw as { approved_by?: string }

    // Approver is optional: staff_profiles may be empty (admin sign-in has no
    // staff UUID). Only a well-formed UUID may reach the approved_by FK.
    const approvedBy = body.approved_by && isUuid(body.approved_by) ? body.approved_by : null

    const admin = await getAdminContext(request)
    const result = await approveStockCount(id, approvedBy)
    if (admin) {
      await logAdminAction({ adminId: admin.adminId, adminName: admin.displayName, adminRole: admin.role, action: 'inventory.stock_count_approve', targetType: 'inventory_stock_counts', targetId: id, ipAddress: request.headers.get('x-forwarded-for') || null, userAgent: request.headers.get('user-agent') || null, sessionId: admin.sessionId })
    }
    return NextResponse.json({ data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message.includes('not found') ? 404 : message.includes('cannot approve') ? 409 : 500
    return NextResponse.json(
      { error: { code: status === 500 ? 'INTERNAL_ERROR' : 'CONFLICT', message } },
      { status },
    )
  }
}
