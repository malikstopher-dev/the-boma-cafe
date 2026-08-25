import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse } from '@/inventory/engine/types'
import { undoProductImport } from '@/inventory/engine/product-import'
import { getAdminContext } from '@/lib/admin/context'
import { logAdminAction } from '@/lib/admin/audit'
import { requireInventoryPermission } from '@/inventory/lib/require-inventory-permission'

export const maxDuration = 60

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  const denied = await requireInventoryPermission(request, 'inventory.destructive')
  if (denied) return denied
  try {
    const body = await request.json()
    if (!body.importId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'importId is required' } },
        { status: 400 },
      )
    }

    const admin = await getAdminContext(request)

    const result = await undoProductImport(body.importId)

    if (admin) {
      await logAdminAction({
        adminId: admin.adminId,
        adminName: admin.displayName,
        adminRole: admin.role,
        action: 'inventory.product_import_undo',
        targetType: 'inventory_product_imports',
        targetId: body.importId,
        after: result,
        ipAddress: request.headers.get('x-forwarded-for') || null,
        userAgent: request.headers.get('user-agent') || null,
        sessionId: admin.sessionId,
      })
    }

    return NextResponse.json({ data: result })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: { code: msg.includes('not') && msg.includes('undo') ? 'CONFLICT' : 'INTERNAL_ERROR', message: msg } },
      { status: msg.includes('not found') ? 404 : 409 },
    )
  }
}