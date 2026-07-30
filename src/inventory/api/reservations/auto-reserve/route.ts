import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse, InventoryReservation } from '@/inventory/engine/types'
import { autoReserveForBooking } from '@/inventory/engine/reservations'

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<InventoryReservation[]>>> {
  try {
    const body = await request.json()
    const { booking_id } = body

    if (!booking_id) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'booking_id is required' } },
        { status: 400 },
      )
    }

    const result = await autoReserveForBooking(booking_id)
    return NextResponse.json({ data: result }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
