import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse } from '@/inventory/engine/types'
import { receiveItems } from '@/inventory/engine/purchase-orders'
import { MissingCostCentreError, InvalidCostCentreError } from '@/inventory/lib/errors'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const { id } = await params
    const body = await request.json()

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'At least one receipt item is required' } },
        { status: 400 },
      )
    }

    for (const item of body.items) {
      if (!item.po_item_id || !item.product_id || !item.quantity_received) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Each item requires po_item_id, product_id, and quantity_received' } },
          { status: 400 },
        )
      }
    }

    const data = await receiveItems(id, body)
    return NextResponse.json({ data })
  } catch (error) {
    if (error instanceof MissingCostCentreError) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_COST_CENTRE',
            message: 'Unable to receive stock. The receiving location has no cost centre assigned — a cost centre is required before this stock can be recorded. Ask an admin to assign one on the location, or choose a cost centre below.',
          },
        },
        { status: 400 },
      )
    }
    if (error instanceof InvalidCostCentreError) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_COST_CENTRE',
            message: 'The selected cost centre does not exist or is not active. Please pick a valid cost centre and try again.',
          },
        },
        { status: 400 },
      )
    }
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: { code: msg.includes('not found') ? 'NOT_FOUND' : 'CONFLICT', message: msg } },
      { status: msg.includes('not found') ? 404 : 409 },
    )
  }
}