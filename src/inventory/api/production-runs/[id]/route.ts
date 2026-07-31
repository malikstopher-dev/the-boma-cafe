import { NextRequest, NextResponse } from 'next/server'
import { getProductionRun } from '@/inventory/engine/production-runs'
import type { ApiResponse } from '@/inventory/engine/types'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const { id } = await params
    const data = await getProductionRun(id)
    if (!data) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Production run not found' } },
        { status: 404 },
      )
    }
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
