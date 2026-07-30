import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse } from '@/inventory/engine/types'
import { createPurchaseOrder, listPurchaseOrders } from '@/inventory/engine/purchase-orders'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<unknown[]>>> {
  try {
    const { searchParams } = new URL(request.url)
    const filters = {
      supplier_id: searchParams.get('supplier_id') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      overdue: searchParams.get('overdue') === 'true' || undefined,
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined,
    }

    const data = await listPurchaseOrders(filters)
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const body = await request.json()

    if (!body.supplier_id) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'supplier_id is required' } },
        { status: 400 },
      )
    }

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'At least one item is required' } },
        { status: 400 },
      )
    }

    for (const item of body.items) {
      if (!item.product_id || !item.location_id || !item.quantity_ordered) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Each item requires product_id, location_id, and quantity_ordered' } },
          { status: 400 },
        )
      }
    }

    const data = await createPurchaseOrder(body)
    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
