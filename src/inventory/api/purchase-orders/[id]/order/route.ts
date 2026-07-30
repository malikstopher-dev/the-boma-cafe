import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse } from '@/inventory/engine/types'
import { orderPurchaseOrder } from '@/inventory/engine/purchase-orders'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const { id } = await params
    const data = await orderPurchaseOrder(id)
    return NextResponse.json({ data })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: { code: msg.includes('not found') ? 'NOT_FOUND' : 'CONFLICT', message: msg } },
      { status: msg.includes('not found') ? 404 : 409 },
    )
  }
}
