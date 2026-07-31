import { NextRequest, NextResponse } from 'next/server'
import { getPriceHistory, recordPriceChange } from '@/inventory/engine/price-history'
import type { ApiResponse } from '@/inventory/engine/types'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('product_id')
    const supplierId = searchParams.get('supplier_id') ?? undefined
    const limit = Number(searchParams.get('limit')) || 20

    if (!productId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'product_id is required' } },
        { status: 400 },
      )
    }

    const data = await getPriceHistory(productId, supplierId, limit)
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

    if (!body.product_id || body.unit_cost === undefined) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'product_id and unit_cost are required' } },
        { status: 400 },
      )
    }

    const data = await recordPriceChange(
      body.product_id,
      body.unit_cost,
      body.supplier_id ?? null,
      body.quantity ?? null,
      body.transaction_id ?? null,
      body.notes ?? null,
      body.recorded_by ?? null,
    )

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
