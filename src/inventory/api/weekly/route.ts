import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getWeeklyMovement, getYearlyWeekSummary } from '../../engine/weekly'
import { getInventoryTypeFilter } from '../../lib/api-utils'
import { currentWeekNumber } from '../../lib/weeks'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = Number(searchParams.get('year')) || new Date().getFullYear()
    const weekParam = searchParams.get('week')
    const locationId = searchParams.get('location_id')
    const inventoryType = getInventoryTypeFilter(searchParams)

    if (weekParam) {
      const week = Number(weekParam)
      if (!Number.isFinite(week) || week < 1) {
        return NextResponse.json({ error: { message: 'Invalid week' } }, { status: 400 })
      }
      const data = await getWeeklyMovement(year, week, locationId, inventoryType)
      return NextResponse.json({ data })
    }

    const weeks = await getYearlyWeekSummary(year, locationId)
    return NextResponse.json({ data: { year, currentWeek: currentWeekNumber(), weeks } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load weekly data'
    return NextResponse.json({ error: { message } }, { status: 500 })
  }
}