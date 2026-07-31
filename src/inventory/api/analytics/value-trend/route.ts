import { NextRequest, NextResponse } from 'next/server'
import { getInventoryValueTrend } from '@/inventory/engine/analytics'
import { resolveLocationId } from '@/inventory/lib/location'
import { getInventoryTypeFilter } from '@/inventory/lib/api-utils'
import type { ApiResponse } from '@/inventory/engine/types'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const { searchParams } = new URL(request.url)
    const locationId = await resolveLocationId(searchParams.get('location_id'))
    const inventoryType = getInventoryTypeFilter(searchParams)
    const days = Math.min(Math.max(Number(searchParams.get('days')) || 30, 7), 180)

    if (!locationId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'No active location configured' } },
        { status: 400 },
      )
    }

    const data = await getInventoryValueTrend(locationId, days, inventoryType ?? undefined)
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
