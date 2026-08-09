import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { saveDailyCell, submitDailySession } from '../../../engine/daily-entry'
import { getHeader } from '../../../lib/api-utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await params
    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: { message: 'Invalid body' } }, { status: 400 })

    const productId = typeof body.productId === 'string' ? body.productId : undefined
    const counted = Number(body.counted)
    if (!productId || !Number.isFinite(counted)) {
      return NextResponse.json({ error: { message: 'productId and counted are required' } }, { status: 400 })
    }

    const item = await saveDailyCell(sessionId, productId, counted)
    return NextResponse.json({ data: item })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save cell'
    const status = /not editable|not found|in_progress/i.test(message) ? 400 : 500
    return NextResponse.json({ error: { message } }, { status })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await params
    await submitDailySession(sessionId)
    return NextResponse.json({ data: { status: 'submitted' } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to submit sheet'
    return NextResponse.json({ error: { message } }, { status: 400 })
  }
}