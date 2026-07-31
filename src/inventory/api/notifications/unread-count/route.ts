import { NextRequest, NextResponse } from 'next/server'
import { ALERT_USER, getUnreadNotificationCount } from '@/inventory/engine/notifications'
import { resolveLocationId } from '@/inventory/lib/location'
import type { ApiResponse } from '@/inventory/engine/types'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const { searchParams } = new URL(request.url)
    const locationId = await resolveLocationId(searchParams.get('location_id'))

    const count = await getUnreadNotificationCount(ALERT_USER, locationId ?? undefined)
    return NextResponse.json({ data: { count } })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
