import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse } from '@/inventory/engine/types'
import { wasteReport } from '@/inventory/lib/reports'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from') ?? new Date(Date.now() - 30 * 86400000).toISOString()
    const to = searchParams.get('to') ?? new Date().toISOString()
    const locationId = searchParams.get('location_id')

    if (!locationId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'location_id is required' } },
        { status: 400 },
      )
    }

    const data = await wasteReport(from, to, locationId)
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
