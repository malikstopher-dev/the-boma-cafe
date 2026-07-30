import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse, InventoryReservation } from '@/inventory/engine/types'
import { createReservation, getReservationsForBooking, getReservationsForProduct } from '@/inventory/engine/reservations'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<InventoryReservation[]>>> {
  try {
    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('booking_id')
    const productId = searchParams.get('product_id')
    const locationId = searchParams.get('location_id')

    let data: InventoryReservation[]
    if (bookingId) {
      data = await getReservationsForBooking(bookingId)
    } else if (productId && locationId) {
      data = await getReservationsForProduct(productId, locationId)
    } else {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Provide booking_id or product_id+location_id' } },
        { status: 400 },
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<InventoryReservation>>> {
  try {
    const body = await request.json()
    const { booking_id, product_id, location_id, quantity, notes } = body

    if (!booking_id || !product_id || !location_id || !quantity) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'booking_id, product_id, location_id, and quantity are required' } },
        { status: 400 },
      )
    }

    if (typeof quantity !== 'number' || quantity <= 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'quantity must be a positive number' } },
        { status: 400 },
      )
    }

    const result = await createReservation({ booking_id, product_id, location_id, quantity, notes })
    return NextResponse.json({ data: result }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message.includes('already exists') ? 409 : 500
    return NextResponse.json(
      { error: { code: status === 409 ? 'CONFLICT' : 'INTERNAL_ERROR', message } },
      { status },
    )
  }
}
