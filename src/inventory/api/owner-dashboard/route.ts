import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getOwnerDashboard } from '@/inventory/engine/owner-dashboard'
import type { OwnerPeriod } from '@/inventory/engine/owner-dashboard'

const ALLOWED_PERIODS = new Set(['this_week', 'this_month', 'last_7', 'last_30', 'custom'])

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const periodParam = searchParams.get('period') ?? 'this_week'
    const period: OwnerPeriod = ALLOWED_PERIODS.has(periodParam)
      ? (periodParam as OwnerPeriod)
      : 'this_week'

    const customFrom = searchParams.get('from')
    const customTo = searchParams.get('to')

    const data = await getOwnerDashboard(period, customFrom, customTo)
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 },
    )
  }
}