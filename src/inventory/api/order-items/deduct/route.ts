import { NextRequest, NextResponse } from 'next/server'
import { deductOrderItems } from '@/inventory/engine/order-items'
import { resolveLocationId } from '@/inventory/lib/location'
import type { ApiResponse } from '@/inventory/engine/types'

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<{ deducted: number; skipped: number }>>> {
  try {
    const body = await request.json()
    const locationId = await resolveLocationId(body.location_id)
    if (!body.order_id || !locationId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'order_id is required and an active location must exist' } },
        { status: 400 },
      )
    }
    const data = await deductOrderItems(body.order_id, locationId)
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
