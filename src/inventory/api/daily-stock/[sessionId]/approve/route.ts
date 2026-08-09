import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { approveDailySession } from '../../../../engine/daily-entry'
import { getHeader } from '../../../../lib/api-utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await params
    const approvedBy = getHeader(request, 'x-user-staff-id') ?? 'admin'
    await approveDailySession(sessionId, approvedBy)
    return NextResponse.json({ data: { status: 'approved' } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to approve sheet'
    return NextResponse.json({ error: { message } }, { status: 400 })
  }
}