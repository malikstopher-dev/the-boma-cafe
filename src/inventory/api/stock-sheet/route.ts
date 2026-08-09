import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getStockSheet } from '../../engine/stock-sheet'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const from = params.get('from') ?? undefined
  const to = params.get('to') ?? undefined
  const locationId = params.get('location_id')

  try {
    if (!from || !to) {
      return NextResponse.json({ error: { message: 'from and to dates are required (YYYY-MM-DD)' } }, { status: 400 })
    }
    const result = await getStockSheet(from, to, locationId ?? null)
    return NextResponse.json({ data: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load stock sheet'
    return NextResponse.json({ error: { message } }, { status: 500 })
  }
}