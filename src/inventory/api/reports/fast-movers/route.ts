import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse, InventoryType } from '@/inventory/engine/types'
import { fastMovers } from '@/inventory/lib/reports'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const { searchParams } = new URL(request.url)
    const days = Number(searchParams.get('days')) || 7
    const limit = Math.min(Number(searchParams.get('limit')) || 10, 50)
    const locationId = searchParams.get('location_id')
    const inventoryType = searchParams.get('inventory_type') as InventoryType | null

    if (!locationId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'location_id is required' } },
        { status: 400 },
      )
    }

    const data = await fastMovers(days, limit, locationId, inventoryType ?? undefined)
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
