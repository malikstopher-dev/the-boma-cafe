import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getGasOverview } from '../../engine/gas'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('location_id')
    const overview = await getGasOverview(locationId)
    return NextResponse.json({ data: overview })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load gas overview'
    return NextResponse.json({ error: { message } }, { status: 500 })
  }
}