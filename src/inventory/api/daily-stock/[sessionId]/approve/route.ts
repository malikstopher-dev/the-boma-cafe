import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { approveDailySession } from '../../../../engine/daily-entry'
import { getHeader, isUuid, uuidError } from '../../../../lib/api-utils'
import { requireInventoryPermission } from '@/inventory/lib/require-inventory-permission'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const denied = await requireInventoryPermission(request, 'inventory.final_approve')
  if (denied) return denied
  try {
    const { sessionId } = await params
    if (!isUuid(sessionId)) return NextResponse.json({ error: uuidError('sessionId') }, { status: 400 })

    const staffId = getHeader(request, 'x-user-staff-id')
    const approvedBy = staffId && isUuid(staffId) ? staffId : null
    await approveDailySession(sessionId, approvedBy)
    return NextResponse.json({ data: { status: 'approved', approved_by: approvedBy } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to approve sheet'
    return NextResponse.json({ error: { message } }, { status: 400 })
  }
}