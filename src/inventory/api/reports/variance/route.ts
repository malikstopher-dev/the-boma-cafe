import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse } from '@/inventory/engine/types'
import { varianceReport } from '@/inventory/lib/reports'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const { searchParams } = new URL(request.url)
    const stockCountId = searchParams.get('stock_count_id')

    if (!stockCountId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'stock_count_id is required' } },
        { status: 400 },
      )
    }

    const data = await varianceReport(stockCountId)
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
