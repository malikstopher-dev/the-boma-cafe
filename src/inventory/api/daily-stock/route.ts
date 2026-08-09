import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getDailySheet } from '../../engine/daily-entry'
import { getInventoryTypeFilter } from '../../lib/api-utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('location_id') ?? 'main'
    const date = searchParams.get('date') ?? new Date().toISOString().slice(0, 10)
    const inventoryType = getInventoryTypeFilter(searchParams)

    const sheet = await getDailySheet(locationId, date, inventoryType)
    return NextResponse.json({ data: sheet })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load daily stock sheet'
    return NextResponse.json({ error: { message } }, { status: 500 })
  }
}