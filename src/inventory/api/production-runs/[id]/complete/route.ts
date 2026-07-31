import { NextRequest, NextResponse } from 'next/server'
import { completeProductionRun } from '@/inventory/engine/production-runs'
import type { ApiResponse } from '@/inventory/engine/types'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const data = await completeProductionRun(
      id,
      body.quantity_completed ?? undefined,
      body.completed_by ?? null,
    )
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
