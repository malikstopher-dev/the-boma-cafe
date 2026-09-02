import { NextRequest, NextResponse } from 'next/server'
import { getInventoryClient } from '@/inventory/lib/db'
import { createTransaction } from '@/inventory/engine/ledger'
import { getInventoryTypeFilter } from '@/inventory/lib/api-utils'
import { resolveLocationId } from '@/inventory/lib/location'
import { requireInventoryPermission } from '@/inventory/lib/require-inventory-permission'
import { getAdminContext } from '@/lib/admin/context'
import type { ApiResponse, InventoryTransaction, CreateTransactionInput } from '@/inventory/engine/types'
import {
  InsufficientStockError,
  ProductNotFoundError,
  LocationNotFoundError,
  MissingCostCentreError,
  InvalidCostCentreError,
  ValidationError,
} from '@/inventory/lib/errors'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<InventoryTransaction[]>>> {
  try {
    const supabase = getInventoryClient()
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('product_id')
    const locationId = searchParams.get('location_id')
    const type = searchParams.get('type')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const cursor = searchParams.get('cursor')
    const pageSize = Math.min(Number(searchParams.get('page_size')) || 50, 100)
    const inventoryType = getInventoryTypeFilter(searchParams)

    let selectFields = '*'
    let extraJoin = ''

    if (inventoryType) {
      selectFields = '*, inventory_products!inner(inventory_type)'
    }

    let query = supabase
      .from('inventory_transactions')
      .select(selectFields, { count: 'exact' })

    if (productId) query = query.eq('product_id', productId)
    if (locationId) query = query.eq('location_id', locationId)
    if (type) query = query.eq('transaction_type', type)
    if (from) query = query.gte('created_at', from)
    if (to) query = query.lte('created_at', to)

    if (inventoryType) {
      query = query.eq('inventory_products.inventory_type', inventoryType)
    }

    if (cursor) {
      query = query.lt('id', cursor)
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .limit(pageSize)

    if (error) {
      return NextResponse.json(
        { error: { code: 'QUERY_ERROR', message: error.message } },
        { status: 500 },
      )
    }

    const transactions = (data ?? []) as unknown as InventoryTransaction[]
    const lastItem = transactions[transactions.length - 1]
    const hasMore = (count ?? 0) > pageSize
    const nextCursor = hasMore && lastItem ? lastItem.id : null

    return NextResponse.json({
      data: transactions,
      meta: { cursor: nextCursor, hasMore, total: count ?? undefined },
    })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<InventoryTransaction>>> {
  const denied = await requireInventoryPermission(request, 'inventory.approve')
  if (denied) return denied

  try {
    const rawBody = await request.json() as unknown
    if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'A transaction object is required' } },
        { status: 400 },
      )
    }
    const body = rawBody as CreateTransactionInput & { uom_id?: unknown }
    const admin = await getAdminContext(request)
    if (!admin) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authenticated admin identity required' } },
        { status: 401 },
      )
    }

    if (!body.product_id || !body.location_id) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'product_id and location_id are required' } },
        { status: 400 },
      )
    }

    if (!body.transaction_type) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'transaction_type is required' } },
        { status: 400 },
      )
    }

    const quantity = Number(body.quantity)
    if (!Number.isFinite(quantity) || quantity === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Quantity must be a finite non-zero number' } },
        { status: 400 },
      )
    }
    if (body.transaction_type === 'purchase' && quantity <= 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Quantity must be greater than zero for a direct receipt' } },
        { status: 400 },
      )
    }

    const requestedUomId = body.uom_id
    if (requestedUomId !== undefined && (typeof requestedUomId !== 'string' || requestedUomId.trim() === '')) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'A valid UOM is required' } },
        { status: 400 },
      )
    }
    const legacyBaseReceipt = request.headers.get('x-boma-stock-entry-mode') === 'legacy-spreadsheet'
    if (body.transaction_type === 'purchase' && requestedUomId === undefined && !legacyBaseReceipt) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'A valid product-linked UOM is required' } },
        { status: 400 },
      )
    }

    const rawUnitCost = (body as unknown as Record<string, unknown>).unit_cost
    const requestedCost = rawUnitCost == null || rawUnitCost === '' ? null : Number(rawUnitCost)
    if (requestedCost !== null && (!Number.isFinite(requestedCost) || requestedCost < 0)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Unit cost must be a finite non-negative number' } },
        { status: 400 },
      )
    }

    // 'main' / 'default' / absent → resolve to the first active location,
    // matching every other inventory API route.
    const resolvedLocationId = await resolveLocationId(body.location_id)
    if (!resolvedLocationId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'No active location configured' } },
        { status: 400 },
      )
    }

    const isDirectReceipt = body.transaction_type === 'purchase'
    const tx = await createTransaction({
      ...body,
      location_id: resolvedLocationId,
      quantity,
      unit_cost: isDirectReceipt ? null : requestedCost,
      source_unit_cost: isDirectReceipt ? requestedCost : null,
      source_uom_id: isDirectReceipt && typeof requestedUomId === 'string' ? requestedUomId : null,
      entry_source: isDirectReceipt ? 'direct_receipt' : null,
      require_active_product: true,
      cost_centre_id: isDirectReceipt ? null : body.cost_centre_id ?? null,
      // Management identity is always derived from the validated session.
      performed_by: null,
      note_author: admin.displayName,
      admin_actor_id: admin.adminId,
      admin_actor_name: admin.displayName,
    })
    return NextResponse.json({ data: tx }, { status: 201 })
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return NextResponse.json(
        { error: { code: 'INSUFFICIENT_STOCK', message: error.message } },
        { status: 422 },
      )
    }
    if (error instanceof ProductNotFoundError || error instanceof LocationNotFoundError) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: error.message } },
        { status: 404 },
      )
    }
    if (error instanceof MissingCostCentreError || error instanceof InvalidCostCentreError) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_COST_CENTRE',
            message: 'A cost centre is required for this stock movement. Assign a cost centre to the location, or pass one explicitly.',
          },
        },
        { status: 400 },
      )
    }
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: error.message } },
        { status: 400 },
      )
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
