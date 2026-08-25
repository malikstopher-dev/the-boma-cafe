import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse } from '@/inventory/engine/types'
import { applyProductImport, type ImportDecisionRow } from '@/inventory/engine/product-import'
import { getAdminContext } from '@/lib/admin/context'
import { logAdminAction } from '@/lib/admin/audit'
import { requireInventoryPermission } from '@/inventory/lib/require-inventory-permission'

export const maxDuration = 60

const INVENTORY_TYPES = ['FOOD', 'BEVERAGE', 'CLEANING', 'PACKAGING', 'GENERAL']
const ACTIONS = ['create', 'update', 'skip']

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  const denied = await requireInventoryPermission(request, 'inventory.config.write')
  if (denied) return denied
  try {
    const body = await request.json()

    const rows = (body.rows ?? []) as ImportDecisionRow[]
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'At least one import row is required' } },
        { status: 400 },
      )
    }
    if (rows.length > 2000) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Maximum 2000 rows per import' } },
        { status: 400 },
      )
    }
    for (const row of rows) {
      if (!ACTIONS.includes(row.action)) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: `Invalid action: ${row.action}. Must be one of ${ACTIONS.join(', ')}` } },
          { status: 400 },
        )
      }
    }
    const inventoryType = INVENTORY_TYPES.includes(body.inventoryType) ? body.inventoryType : 'GENERAL'
    if (!body.filename) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'filename is required' } },
        { status: 400 },
      )
    }

    // Identity is ALWAYS server-resolved from the admin session (P1a rule).
    const admin = await getAdminContext(request)

    const result = await applyProductImport({
      rows,
      inventoryType,
      filename: body.filename,
      sheetName: body.sheetName ?? null,
      createdByAdminId: admin?.adminId ?? null,
    })

    if (admin) {
      await logAdminAction({
        adminId: admin.adminId,
        adminName: admin.displayName,
        adminRole: admin.role,
        action: 'inventory.product_import',
        targetType: 'inventory_product_imports',
        targetId: result.importId,
        after: {
          filename: body.filename,
          sheet: body.sheetName ?? null,
          inventory_type: inventoryType,
          created: result.created,
          updated: result.updated,
          skipped: result.skipped,
          new_suppliers: result.createdSuppliers,
          new_categories: result.createdCategories,
        },
        ipAddress: request.headers.get('x-forwarded-for') || null,
        userAgent: request.headers.get('user-agent') || null,
        sessionId: admin.sessionId,
      })
    }

    return NextResponse.json({ data: result }, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: msg } },
      { status: 500 },
    )
  }
}