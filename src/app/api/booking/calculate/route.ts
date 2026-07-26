import { NextRequest, NextResponse } from 'next/server'
import { calculateQuotation, type CalculationInput } from '@/lib/booking/pricing'
import { checkRateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  if (!checkRateLimit(`booking-calc:${ip}`)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const body: CalculationInput = await request.json()

    if (!body.venue_area_id || !body.booking_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (body.adults < 1 || body.children < 0) {
      return NextResponse.json({ error: 'Invalid guest counts' }, { status: 400 })
    }

    if (body.duration_hours < 1 || body.duration_hours > 12) {
      return NextResponse.json({ error: 'Duration must be 1-12 hours' }, { status: 400 })
    }

    const result = await calculateQuotation(body)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Calculate quote error:', error)
    return NextResponse.json({ error: 'Failed to calculate quotation' }, { status: 500 })
  }
}