import { NextRequest, NextResponse } from 'next/server'
import { listOrderItems } from '@/inventory/engine/order-items'
import type { ApiResponse, OrderItemDetail } from '@/inventory/engine/types'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<OrderItemDetail>>> {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('order_id')

    if (!orderId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'order_id is required' } },
        { status: 400 },
      )
    }

    const data = await listOrderItems(orderId)
    return NextResponse.json({ data })
  } catch (error) {
    const status = error instanceof Error && error.message.includes('not found') ? 404 : 500
    return NextResponse.json(
      { error: { code: status === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status },
    )
  }
}
