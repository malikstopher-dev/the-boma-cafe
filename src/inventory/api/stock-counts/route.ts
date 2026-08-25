import { NextRequest, NextResponse } from 'next/server'
import { getInventoryClient } from '@/inventory/lib/db'
import { resolveLocationId } from '@/inventory/lib/location'
import type { ApiResponse, InventoryStockCount } from '@/inventory/engine/types'
import { createStockCount, listStockCounts } from '@/inventory/engine/stock-counts'
import { requireInventoryPermission } from '@/inventory/lib/require-inventory-permission'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<InventoryStockCount[]>>> {
  try {
    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('location_id') ?? undefined

    const data = await listStockCounts(locationId)
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  const denied = await requireInventoryPermission(request, 'inventory.config.write')
  if (denied) return denied
  try {
    const body = await request.json()
    const { location_id, performed_by, notes } = body

    if (!location_id) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'location_id is required' } },
        { status: 400 },
      )
    }

    const resolvedLocationId = await resolveLocationId(location_id)
    if (!resolvedLocationId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'No active location found' } },
        { status: 400 },
      )
    }

    const result = await createStockCount(resolvedLocationId, performed_by ?? null, notes ?? null)
    return NextResponse.json({ data: result }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
