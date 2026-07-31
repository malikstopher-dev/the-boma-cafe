import { NextRequest, NextResponse } from 'next/server'
import { getTimeline } from '@/inventory/engine/timeline'
import type { ApiResponse, MovementEvent } from '@/inventory/engine/types'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<MovementEvent[]>>> {
  try {
    const { searchParams } = new URL(request.url)

    const events = await getTimeline({
      productId: searchParams.get('product_id') ?? undefined,
      locationId: searchParams.get('location_id') ?? undefined,
      purchaseOrderId: searchParams.get('purchase_order_id') ?? undefined,
      bookingId: searchParams.get('booking_id') ?? undefined,
      from: searchParams.get('from') ?? undefined,
      to: searchParams.get('to') ?? undefined,
      limit: Number(searchParams.get('limit')) || 50,
    })

    return NextResponse.json({ data: events })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
