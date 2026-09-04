import { NextRequest, NextResponse } from 'next/server'
import { getInventoryClient } from '@/inventory/lib/db'
import { requireInventoryPermission } from '@/inventory/lib/require-inventory-permission'
import { getAdminContext } from '@/lib/admin/context'

interface QuickCreateBody {
  name?: string
  sku?: string | null
  barcode?: string | null
  category_id?: string | null
  inventory_type?: string | null
  supplier_id?: string | null
  unit_cost?: number | null
  reorder_threshold?: number | null
  base_uom_id?: string
}

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

function bad(message: string): NextResponse {
  return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message } }, { status: 400 })
}

export async function POST(request: NextRequest) {
  const denied = await requireInventoryPermission(request, 'inventory.config.write')
  if (denied) return denied

  let admin: Awaited<ReturnType<typeof getAdminContext>>
  try {
    admin = await getAdminContext(request)
  } catch {
    admin = null
  }
  if (!admin) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authenticated admin identity required' } },
      { status: 401 },
    )
  }

  let body: QuickCreateBody
  try {
    body = await request.json() as QuickCreateBody
  } catch {
    return bad('A valid JSON body is required')
  }

  if (!body?.name || !String(body.name).trim()) return bad('Product name is required')
  if (String(body.name).trim().length > 200) return bad('Product name must be 200 characters or fewer')
  if (!body.base_uom_id || !UUID_RE.test(body.base_uom_id)) return bad('base_uom_id must be a UUID')
  if (body.sku && String(body.sku).trim().length > 64) return bad('SKU must be 64 characters or fewer')
  if (body.barcode && String(body.barcode).trim().length > 64) return bad('Barcode must be 64 characters or fewer')

  if (body.unit_cost !== null && body.unit_cost !== undefined) {
    const cost = Number(body.unit_cost)
    if (!Number.isFinite(cost) || cost < 0) return bad('unit_cost must be a finite non-negative number')
  }
  if (body.reorder_threshold !== null && body.reorder_threshold !== undefined) {
    const threshold = Number(body.reorder_threshold)
    if (!Number.isFinite(threshold) || threshold < 0) {
      return bad('reorder_threshold must be a finite non-negative number')
    }
  }

  const supabase = getInventoryClient()
  const { data: rpcData, error: rpcError } = await supabase.rpc('quick_create_product', {
    p_input: {
      name: String(body.name).trim(),
      sku: body.sku?.trim() || null,
      barcode: body.barcode?.trim() || null,
      category_id: body.category_id || null,
      inventory_type: body.inventory_type || null,
      supplier_id: body.supplier_id || null,
      unit_cost: body.unit_cost == null ? null : Number(body.unit_cost),
      reorder_threshold: body.reorder_threshold == null ? null : Number(body.reorder_threshold),
      base_uom_id: body.base_uom_id,
      admin_actor_id: admin.adminId,
    },
  })

  if (rpcError) {
    return NextResponse.json(
      { error: { code: 'QUICK_CREATE_FAILED', message: rpcError.message } },
      { status: 400 },
    )
  }

  const result = Array.isArray(rpcData) ? rpcData[0] : rpcData
  const product = result?.product as Record<string, unknown> | undefined
  if (!product) {
    return NextResponse.json(
      { error: { code: 'QUICK_CREATE_FAILED', message: 'The quick-create RPC returned no product' } },
      { status: 500 },
    )
  }

  return NextResponse.json({ data: product }, { status: 201 })
}
