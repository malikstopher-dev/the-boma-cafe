import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse } from '@/inventory/engine/types'
import { cancelPurchaseOrder } from '@/inventory/engine/purchase-orders'
import { getAdminContext } from '@/lib/admin/context'
import { logAdminAction } from '@/lib/admin/audit'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const { id } = await params
    const admin = await getAdminContext(request)
    const data = await cancelPurchaseOrder(id)
    if (admin) {
      await logAdminAction({ adminId: admin.adminId, adminName: admin.displayName, adminRole: admin.role, action: 'inventory.po_cancel', targetType: 'inventory_purchase_orders', targetId: id, ipAddress: request.headers.get('x-forwarded-for') || null, userAgent: request.headers.get('user-agent') || null, sessionId: admin.sessionId })
    }
    return NextResponse.json({ data })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: { code: msg.includes('not found') ? 'NOT_FOUND' : 'CONFLICT', message: msg } },
      { status: msg.includes('not found') ? 404 : 409 },
    )
  }
}
