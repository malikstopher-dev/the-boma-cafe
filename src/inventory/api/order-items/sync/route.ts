import { NextRequest, NextResponse } from 'next/server'
import { syncOrderItems } from '@/inventory/engine/order-items'
import type { ApiResponse, OrderItemDetail } from '@/inventory/engine/types'

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<OrderItemDetail>>> {
  try {
    const body = await request.json()
    if (!body.order_id) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'order_id is required' } },
        { status: 400 },
      )
    }
    const data = await syncOrderItems(body.order_id)
    return NextResponse.json({ data })
  } catch (error) {
    const status = error instanceof Error && error.message.includes('not found') ? 404 : 500
    return NextResponse.json(
      { error: { code: status === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status },
    )
  }
}
