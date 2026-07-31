import { NextRequest, NextResponse } from 'next/server'
import { ALERT_USER, generateLowStockAlerts, listNotifications } from '@/inventory/engine/notifications'
import { resolveLocationId } from '@/inventory/lib/location'
import { getInventoryTypeFilter } from '@/inventory/lib/api-utils'
import type { ApiResponse } from '@/inventory/engine/types'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const { searchParams } = new URL(request.url)
    const locationId = await resolveLocationId(searchParams.get('location_id'))
    const unreadOnly = searchParams.get('unread') === 'true'
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 100, 1), 200)

    const data = await listNotifications(ALERT_USER, locationId ?? undefined, unreadOnly, limit)
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const { searchParams } = new URL(request.url)
    const locationId = await resolveLocationId(searchParams.get('location_id'))
    const inventoryType = getInventoryTypeFilter(searchParams)

    if (!locationId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'No active location configured' } },
        { status: 400 },
      )
    }

    const data = await generateLowStockAlerts(locationId, inventoryType ?? undefined)
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
