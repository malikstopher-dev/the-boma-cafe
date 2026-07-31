import { NextRequest, NextResponse } from 'next/server'
import { ALERT_USER, markNotificationRead } from '@/inventory/engine/notifications'
import type { ApiResponse } from '@/inventory/engine/types'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const { id } = await context.params
    const ok = await markNotificationRead(ALERT_USER, id)
    if (!ok) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Notification not found' } },
        { status: 404 },
      )
    }
    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
