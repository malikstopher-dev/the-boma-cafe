import { NextRequest, NextResponse } from 'next/server'
import { ImportService } from '@/inventory/import/ImportService'
import type { ApiResponse } from '@/inventory/engine/types'
import type { ImportRollbackResult } from '@/inventory/import/ImportTypes'
import { getAdminContext } from '@/lib/admin/context'
import { logAdminAction } from '@/lib/admin/audit'

const importService = new ImportService()

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<ImportRollbackResult>>> {
  try {
    const { id } = await params
    const admin = await getAdminContext(request)
    const result = await importService.rollback(id)
    if (admin) {
      await logAdminAction({ adminId: admin.adminId, adminName: admin.displayName, adminRole: admin.role, action: 'inventory.import_rollback', targetType: 'inventory_imports', targetId: id, ipAddress: request.headers.get('x-forwarded-for') || null, userAgent: request.headers.get('user-agent') || null, sessionId: admin.sessionId })
    }
    return NextResponse.json({ data: result }, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    if (message.includes('not found')) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message } },
        { status: 404 },
      )
    }
    if (message.includes('not in') || message.includes('expired')) {
      return NextResponse.json(
        { error: { code: 'CONFLICT', message } },
        { status: 409 },
      )
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 },
    )
  }
}
