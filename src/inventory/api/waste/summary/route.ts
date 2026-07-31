import { NextRequest, NextResponse } from 'next/server'
import { wasteSummary } from '@/inventory/engine/waste'
import type { ApiResponse, WasteSummaryRow } from '@/inventory/engine/types'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<WasteSummaryRow[]>>> {
  try {
    const { searchParams } = new URL(request.url)
    const data = await wasteSummary({
      location_id: searchParams.get('location_id'),
      from: searchParams.get('from'),
      to: searchParams.get('to'),
    })
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
