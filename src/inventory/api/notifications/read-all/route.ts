import { NextRequest, NextResponse } from 'next/server'
import { ALERT_USER, markAllNotificationsRead } from '@/inventory/engine/notifications'
import { resolveLocationId } from '@/inventory/lib/location'
import type { ApiResponse } from '@/inventory/engine/types'

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const { searchParams } = new URL(request.url)
    const locationId = await resolveLocationId(searchParams.get('location_id'))

    const ok = await markAllNotificationsRead(ALERT_USER, locationId ?? undefined)
    return NextResponse.json({ data: { success: ok } })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
