import { NextRequest, NextResponse } from 'next/server'
import { listInstances } from '@/inventory/engine/checklist'
import { resolveLocationId } from '@/inventory/lib/location'
import type { ApiResponse } from '@/inventory/engine/types'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const { searchParams } = new URL(request.url)
    const locationId = (await resolveLocationId(searchParams.get('location_id'))) ?? undefined
    const from = searchParams.get('from') ?? undefined
    const to = searchParams.get('to') ?? undefined
    const limit = Number(searchParams.get('limit')) || 30

    const data = await listInstances(locationId, from, to, limit)
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
