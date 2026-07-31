import { NextRequest, NextResponse } from 'next/server'
import { getTimeline } from '@/inventory/engine/timeline'
import type { ApiResponse, MovementEvent } from '@/inventory/engine/types'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<MovementEvent[]>>> {
  try {
    const { id } = await context.params
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 50, 1), 200)

    const data = await getTimeline({ productId: id, limit })
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
