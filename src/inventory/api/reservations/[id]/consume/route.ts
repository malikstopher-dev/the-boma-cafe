import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse, InventoryReservation } from '@/inventory/engine/types'
import { consumeReservation } from '@/inventory/engine/reservations'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<InventoryReservation>>> {
  try {
    const { id } = await params
    const result = await consumeReservation(id)
    return NextResponse.json({ data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message.includes('not found') ? 404
      : message.includes('already') || message.includes('Cannot') || message.includes('Insufficient') ? 400
      : 500
    return NextResponse.json(
      { error: { code: status === 404 ? 'NOT_FOUND' : status === 400 ? 'BAD_REQUEST' : 'INTERNAL_ERROR', message } },
      { status },
    )
  }
}
