import { NextRequest, NextResponse } from 'next/server'
import { refreshDashboardCache } from '@/inventory/engine/dashboard'
import type { ApiResponse } from '@/inventory/engine/types'
import { requireInventoryPermission } from '@/inventory/lib/require-inventory-permission'

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<{ refreshed: boolean }>>> {
  const denied = await requireInventoryPermission(request, 'inventory.config.write')
  if (denied) return denied
  try {
    const body = await request.json()
    const { location_id } = body

    if (!location_id) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'location_id is required' } },
        { status: 400 },
      )
    }

    await refreshDashboardCache(location_id)

    return NextResponse.json({ data: { refreshed: true } }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
