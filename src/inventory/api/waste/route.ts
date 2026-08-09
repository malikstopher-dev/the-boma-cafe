import { NextRequest, NextResponse } from 'next/server'
import { recordWaste, listWasteEvents } from '@/inventory/engine/waste'
import { resolveLocationId } from '@/inventory/lib/location'
import type { ApiResponse, InventoryTransaction } from '@/inventory/engine/types'
import { WasteValidationError } from '@/inventory/lib/errors'
import { InsufficientStockError, ProductNotFoundError, LocationNotFoundError, MissingCostCentreError, InvalidCostCentreError } from '@/inventory/lib/errors'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<InventoryTransaction[]>>> {
  try {
    const { searchParams } = new URL(request.url)
    const data = await listWasteEvents({
      location_id: searchParams.get('location_id'),
      from: searchParams.get('from'),
      to: searchParams.get('to'),
      limit: Number(searchParams.get('limit')) || undefined,
    })
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<InventoryTransaction>>> {
  try {
    const body = await request.json()

    if (!body.product_id || !body.location_id) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'product_id and location_id are required' } },
        { status: 400 },
      )
    }

    if (!body.transaction_type) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'transaction_type is required' } },
        { status: 400 },
      )
    }

    const locationId = await resolveLocationId(body.location_id)
    if (!locationId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'No active location configured' } },
        { status: 400 },
      )
    }

    const tx = await recordWaste({
      product_id: body.product_id,
      location_id: locationId,
      transaction_type: body.transaction_type,
      quantity: Number(body.quantity),
      reason_type: body.reason_type ?? null,
      reason_notes: body.reason_notes ?? null,
      cost_centre_id: body.cost_centre_id ?? null,
      performed_by: body.performed_by ?? null,
    })
    return NextResponse.json({ data: tx }, { status: 201 })
  } catch (error) {
    if (error instanceof WasteValidationError) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: error.message } },
        { status: 400 },
      )
    }
    if (error instanceof InsufficientStockError) {
      return NextResponse.json(
        { error: { code: 'INSUFFICIENT_STOCK', message: error.message } },
        { status: 422 },
      )
    }
    if (error instanceof ProductNotFoundError || error instanceof LocationNotFoundError) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: error.message } },
        { status: 404 },
      )
    }
    if (error instanceof MissingCostCentreError || error instanceof InvalidCostCentreError) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_COST_CENTRE',
            message: 'A cost centre is required to record waste. Assign a cost centre to the location, or pass one explicitly.',
          },
        },
        { status: 400 },
      )
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
