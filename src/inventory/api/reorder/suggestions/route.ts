import { NextRequest, NextResponse } from 'next/server'
import { getSuggestions } from '@/inventory/engine/reorder'
import { resolveLocationId } from '@/inventory/lib/location'
import type { ApiResponse } from '@/inventory/engine/types'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const { searchParams } = new URL(request.url)
    const locationId = await resolveLocationId(searchParams.get('location_id'))
    const inventoryType = searchParams.get('inventory_type') ?? undefined

    if (!locationId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'No active location configured' } },
        { status: 400 },
      )
    }

    const data = await getSuggestions(locationId, inventoryType)
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
