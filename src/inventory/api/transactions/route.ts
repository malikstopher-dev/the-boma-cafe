import { NextRequest, NextResponse } from 'next/server'
import { getInventoryClient } from '@/inventory/lib/db'
import { createTransaction } from '@/inventory/engine/ledger'
import { getInventoryTypeFilter } from '@/inventory/lib/api-utils'
import type { ApiResponse, InventoryTransaction, CreateTransactionInput } from '@/inventory/engine/types'
import { InsufficientStockError, ProductNotFoundError, LocationNotFoundError, MissingCostCentreError, InvalidCostCentreError } from '@/inventory/lib/errors'

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
  try {
    const body = (await request.json()) as CreateTransactionInput

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

    if (!body.quantity || body.quantity === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'quantity must be a non-zero number' } },
        { status: 400 },
      )
    }

    const tx = await createTransaction(body)
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
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
