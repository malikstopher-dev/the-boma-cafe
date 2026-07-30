import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse, InventoryReservation } from '@/inventory/engine/types'
import { getReservation } from '@/inventory/engine/reservations'
import { getInventoryClient } from '@/inventory/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<InventoryReservation>>> {
  try {
    const { id } = await params
    const result = await getReservation(id)

    if (!result) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: `Reservation not found: ${id}` } },
        { status: 404 },
      )
    }

    return NextResponse.json({ data: result })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<InventoryReservation>>> {
  try {
    const { id } = await params
    const body = await request.json()

    if (!body.notes && body.notes !== '') {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Only notes field can be updated' } },
        { status: 400 },
      )
    }

    const supabase = getInventoryClient()
    const { data, error } = await supabase
      .from('inventory_reservations')
      .update({ notes: body.notes, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: `Reservation not found: ${id}` } },
        { status: 404 },
      )
    }

    return NextResponse.json({ data: data as InventoryReservation })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
