import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse } from '@/inventory/engine/types'
import type { ImportApplyResult } from '@/inventory/import/ImportTypes'
import { getInventoryClient } from '@/inventory/lib/db'
import { getAdminContext } from '@/lib/admin/context'
import { logAdminAction } from '@/lib/admin/audit'
import { requireInventoryPermission } from '@/inventory/lib/require-inventory-permission'

interface ApplyRpcResult {
  import_batch_id: string
  transaction_ids: string[]
  product_ids: string[]
  row_count: number
  applied_at: string
  already_applied?: boolean
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<ImportApplyResult>>> {
  const denied = await requireInventoryPermission(request, 'inventory.approve')
  if (denied) return denied
  try {
    const { id } = await params

    // Tolerate a missing/empty request body: request.json() throws
    // "Unexpected end of JSON input" on an empty body, which would surface
    // as a confusing 500. Return a readable 400 instead.
    let decisions: unknown
    let performedBy: string | null = null
    try {
      const body = await request.json()
      decisions = body?.decisions
      performedBy = body?.performed_by ?? null
    } catch {
      decisions = undefined
    }

    if (!Array.isArray(decisions)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'decisions array is required' } },
        { status: 400 },
      )
    }

    const admin = await getAdminContext(request)
    const logApply = (appliedAt: string) => {
      if (!admin) return
      void logAdminAction({ adminId: admin.adminId, adminName: admin.displayName, adminRole: admin.role, action: 'inventory.import_apply', targetType: 'inventory_imports', targetId: id, after: { row_count: Array.isArray(decisions) ? decisions.length : 0, applied_at: appliedAt }, ipAddress: request.headers.get('x-forwarded-for') || null, userAgent: request.headers.get('user-agent') || null, sessionId: admin.sessionId })
    }

    // The apply RPC is the only write path. Never downgrade a permission,
    // schema or business failure to the legacy non-atomic executor.
    const supabase = getInventoryClient()
    const rpcRes = await supabase.rpc('apply_import_batch', {
      p_import_id: id,
      p_decisions: decisions,
      p_performed_by: performedBy,
      p_import_type: null,
      p_filename: null,
    }) as unknown as { data: ApplyRpcResult | null; error: { message: string } | null }

    if (rpcRes.error || !rpcRes.data) {
      const message = rpcRes.error?.message ?? 'no result returned'
      return NextResponse.json(
        { error: { code: 'IMPORT_APPLY_FAILED', message } },
        { status: /rolled back|already|cannot|invalid/i.test(message) ? 409 : 500 },
      )
    }

    const result: ImportApplyResult = {
      importBatchId: rpcRes.data.import_batch_id,
      transactionIds: rpcRes.data.transaction_ids ?? [],
      productIds: rpcRes.data.product_ids ?? [],
      rowCount: rpcRes.data.row_count,
      appliedAt: rpcRes.data.applied_at,
    }
    logApply(rpcRes.data.applied_at)
    return NextResponse.json({ data: result }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
