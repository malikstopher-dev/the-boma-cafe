import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { deleteDailyCell } from '../../../../../engine/daily-entry'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ sessionId: string; productId: string }> }) {
  try {
    const { sessionId, productId } = await params
    await deleteDailyCell(sessionId, productId)
    return NextResponse.json({ data: { deleted: true } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete cell'
    return NextResponse.json({ error: { message } }, { status: 400 })
  }
}