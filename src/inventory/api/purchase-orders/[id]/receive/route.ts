import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse } from '@/inventory/engine/types'
import { receiveItems, getPurchaseOrder } from '@/inventory/engine/purchase-orders'
import { getInventoryClient } from '@/inventory/lib/db'
import { MissingCostCentreError, InvalidCostCentreError } from '@/inventory/lib/errors'
import { getAdminContext } from '@/lib/admin/context'
import { logAdminAction } from '@/lib/admin/audit'
import { requireInventoryPermission } from '@/inventory/lib/require-inventory-permission'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<unknown>>> {
  const denied = await requireInventoryPermission(request, 'inventory.approve')
  if (denied) return denied
  try {
    const { id } = await params
    const body = await request.json()

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'At least one receipt item is required' } },
        { status: 400 },
      )
    }

    for (const item of body.items) {
      if (!item.po_item_id || !item.product_id || !item.quantity_received) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Each item requires po_item_id, product_id, and quantity_received' } },
          { status: 400 },
        )
      }
    }

    // RPC path (migration 074): the entire receive is atomic. If the RPC is
    // not yet applied (PGRST202) or raises a business error, fall back to
    // the legacy engine path below — the engine validates identically, so
    // the fallback surfaces the same errors, and the RPC rolls back its own
    // partial work on any failure.
    const admin = await getAdminContext(request)
    // Identity is ALWAYS server-resolved from the admin session — a
    // client-supplied received_by_admin_id is never trusted.
    const receivedByAdminId = admin?.adminId ?? null
    const receivedByAdminName = admin?.displayName ?? null
    const supabase = getInventoryClient()
    const rpcRes = await supabase.rpc('receive_purchase_order', {
      p_po_id: id,
      p_invoice_number: body.invoice_number ?? null,
      p_notes: body.notes ?? null,
      p_received_by: body.received_by ?? null,
      p_cost_centre_id: body.cost_centre_id ?? null,
      p_items: body.items,
      p_received_by_admin_id: receivedByAdminId,
      p_received_by_admin_name: receivedByAdminName,
    }) as unknown as { data: { receipt_id: string } | null; error: { message: string } | null }

    if (!rpcRes.error && rpcRes.data) {
      const data = await getPurchaseOrder(id)
      if (admin) {
        await logAdminAction({ adminId: admin.adminId, adminName: admin.displayName, adminRole: admin.role, action: 'inventory.po_receive', targetType: 'inventory_purchase_orders', targetId: id, after: { invoice_number: body.invoice_number ?? null, items_received: body.items.length }, ipAddress: request.headers.get('x-forwarded-for') || null, userAgent: request.headers.get('user-agent') || null, sessionId: admin.sessionId })
      }
      return NextResponse.json({ data })
    }

    const data = await receiveItems(id, { ...body, received_by_admin_id: receivedByAdminId, received_by_admin_name: receivedByAdminName })
    if (admin) {
      await logAdminAction({ adminId: admin.adminId, adminName: admin.displayName, adminRole: admin.role, action: 'inventory.po_receive', targetType: 'inventory_purchase_orders', targetId: id, after: { invoice_number: body.invoice_number ?? null, items_received: body.items.length }, ipAddress: request.headers.get('x-forwarded-for') || null, userAgent: request.headers.get('user-agent') || null, sessionId: admin.sessionId })
    }
    return NextResponse.json({ data })
  } catch (error) {
    if (error instanceof MissingCostCentreError) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_COST_CENTRE',
            message: 'Unable to receive stock. The receiving location has no cost centre assigned — a cost centre is required before this stock can be recorded. Ask an admin to assign one on the location, or choose a cost centre below.',
          },
        },
        { status: 400 },
      )
    }
    if (error instanceof InvalidCostCentreError) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_COST_CENTRE',
            message: 'The selected cost centre does not exist or is not active. Please pick a valid cost centre and try again.',
          },
        },
        { status: 400 },
      )
    }
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: { code: msg.includes('not found') ? 'NOT_FOUND' : 'CONFLICT', message: msg } },
      { status: msg.includes('not found') ? 404 : 409 },
    )
  }
}