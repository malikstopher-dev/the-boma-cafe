import { NextRequest, NextResponse } from 'next/server'
import { getAvailableAreas, checkAvailability } from '@/lib/booking/availability'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  const startTime = searchParams.get('start_time')
  const endTime = searchParams.get('end_time')
  const guests = parseInt(searchParams.get('guests') || '0', 10)
  const venueAreaId = searchParams.get('venue_area_id')

  if (!date || !startTime || !endTime || guests < 1) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
  }

  // If specific venue area requested, do detailed check
  if (venueAreaId) {
    const result = await checkAvailability(venueAreaId, date, startTime, endTime, guests)
    return NextResponse.json(result)
  }

  // Otherwise list all available areas
  const slots = await getAvailableAreas(date, startTime, endTime, guests)
  return NextResponse.json({ slots })
}