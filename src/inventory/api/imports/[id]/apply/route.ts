import { NextRequest, NextResponse } from 'next/server'
import { ImportService } from '@/inventory/import/ImportService'
import type { ApiResponse } from '@/inventory/engine/types'
import type { ImportApplyResult } from '@/inventory/import/ImportTypes'
import { getInventoryClient } from '@/inventory/lib/db'
import { getAdminContext } from '@/lib/admin/context'
import { logAdminAction } from '@/lib/admin/audit'
import { requireInventoryPermission } from '@/inventory/lib/require-inventory-permission'

const importService = new ImportService()

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

    // RPC path (migration 075): the entire apply is a single transaction and
    // re-applying an already-applied batch is an idempotent no-op. If the
    // RPC is not yet applied (PGRST202) or raises a business error, fall
    // back to the legacy engine path — the RPC rolled back its own partial
    // work on failure, so the fallback never double-posts.
    const supabase = getInventoryClient()
    const rpcRes = await supabase.rpc('apply_import_batch', {
      p_import_id: id,
      p_decisions: decisions,
      p_performed_by: performedBy,
      p_import_type: null,
      p_filename: null,
    }) as unknown as { data: ApplyRpcResult | null; error: { message: string } | null }

    if (!rpcRes.error && rpcRes.data) {
      const result: ImportApplyResult = {
        importBatchId: rpcRes.data.import_batch_id,
        transactionIds: rpcRes.data.transaction_ids ?? [],
        productIds: rpcRes.data.product_ids ?? [],
        rowCount: rpcRes.data.row_count,
        appliedAt: rpcRes.data.applied_at,
      }
      logApply(rpcRes.data.applied_at)
      return NextResponse.json({ data: result }, { status: 200 })
    }

    // C1 guard: the RPC rejects rolled_back batches, but the legacy engine
    // path below has no status awareness and would re-apply them, undoing
    // the rollback. Check the batch status BEFORE falling back and hard-
    // reject rolled_back batches at the route. Fail closed on a status read
    // error so a rolled_back batch can never reach the engine path.
    const { data: batch, error: statusError } = await supabase
      .from('inventory_imports')
      .select('status')
      .eq('id', id)
      .maybeSingle()

    if (statusError) {
      throw new Error(`Failed to check import batch status: ${statusError.message}`)
    }

    if (batch?.status === 'rolled_back') {
      return NextResponse.json(
        {
          error: {
            code: 'CONFLICT',
            message: `Import batch ${id} is rolled back and cannot be re-applied`,
          },
        },
        { status: 409 },
      )
    }

    const result = await importService.apply(id, decisions as never, performedBy)
    logApply(new Date().toISOString())
    return NextResponse.json({ data: result }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
