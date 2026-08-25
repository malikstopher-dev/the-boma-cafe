import { NextRequest, NextResponse } from 'next/server'
import { getInventoryClient } from '@/inventory/lib/db'
import { getAdminContext } from '@/lib/admin/context'
import { logAdminAction } from '@/lib/admin/audit'
import { requireInventoryPermission } from '@/inventory/lib/require-inventory-permission'
import type { ApiResponse } from '@/inventory/engine/types'

// Bulk edit endpoint (E1A): applies a single patch to many products. Patch
// keys are the same allowlisted fields as the single-product PATCH, minus
// identity fields (name/sku/barcode) which bulk-edit must not touch.
const BULK_FIELDS = [
  'category_id',
  'preferred_supplier_id',
  'reorder_threshold',
  'reorder_quantity',
  'unit_cost',
  'is_active',
] as const

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const supabase = getInventoryClient()
    const body = await request.json()

    const ids = (body.ids ?? []) as string[]
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'At least one product id is required' } },
        { status: 400 },
      )
    }
    if (ids.length > 500) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Maximum 500 products per bulk edit' } },
        { status: 400 },
      )
    }

    const patch = (body.patch ?? {}) as Record<string, unknown>
    const updates: Record<string, unknown> = {}
    for (const field of BULK_FIELDS) {
      if (field in patch) updates[field] = patch[field]
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update' } },
        { status: 400 },
      )
    }
    // Conditional tier: a bulk request that asks for hard deletes requires
    // owner/full_manager; plain archive/edit stays manager-tier.
    const requestsHardDelete = patch.is_active === false && body.delete === true
    const denied = await requireInventoryPermission(
      request,
      requestsHardDelete ? 'inventory.destructive' : 'inventory.config.write',
    )
    if (denied) return denied
    if (patch.is_active === false && !('deleted_at' in patch)) {
      updates.deleted_at = new Date().toISOString()
    }
    updates.updated_at = new Date().toISOString()

    const archive = patch.is_active === false
    const restored = patch.is_active === true && 'deleted_at' in patch && !patch.deleted_at

    const updated: string[] = []
    const archived: string[] = []
    const deleted: string[] = []
    const errors: { id: string; message: string }[] = []

    for (const id of ids) {
      try {
        // Hard delete when requested and the product has no transactions
        // (same rule as the single-product DELETE route); products with
        // history are archived instead.
        if (patch.is_active === false && body.delete === true) {
          const { count } = await supabase
            .from('inventory_transactions')
            .select('*', { count: 'exact', head: true })
            .eq('product_id', id)
          if (count && count > 0) {
            await supabase
              .from('inventory_products')
              .update(updates)
              .eq('id', id)
            archived.push(id)
            await supabase.from('inventory_audit_log').insert({
              table_name: 'inventory_products',
              record_id: id,
              action: 'archived',
              changes: { bulk: true },
            })
          } else {
            await supabase.from('inventory_product_uoms').delete().eq('product_id', id)
            await supabase.from('inventory_products').delete().eq('id', id)
            deleted.push(id)
          }
          continue
        }

        const { error } = await supabase
          .from('inventory_products')
          .update(updates)
          .eq('id', id)
        if (error) {
          errors.push({ id, message: error.message })
          continue
        }
        updated.push(id)
        await supabase.from('inventory_audit_log').insert({
          table_name: 'inventory_products',
          record_id: id,
          action: archive ? 'archived' : restored ? 'restored' : 'updated',
          changes: { ...updates, bulk: true },
        })
      } catch (err) {
        errors.push({ id, message: err instanceof Error ? err.message : 'Unknown error' })
      }
    }

    const admin = await getAdminContext(request)
    if (admin) {
      await logAdminAction({
        adminId: admin.adminId,
        adminName: admin.displayName,
        adminRole: admin.role,
        action: 'inventory.products_bulk',
        targetType: 'inventory_products',
        after: { patch: updates, updated: updated.length, archived: archived.length, deleted: deleted.length, failed: errors.length },
        ipAddress: request.headers.get('x-forwarded-for') || null,
        userAgent: request.headers.get('user-agent') || null,
        sessionId: admin.sessionId,
      })
    }

    return NextResponse.json({
      data: { updated, archived, deleted, errors },
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}