import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { saveDailyCell, submitDailySession } from '../../../engine/daily-entry'
import { isUuid, uuidError } from '../../../lib/api-utils'
import { requireInventoryPermission } from '@/inventory/lib/require-inventory-permission'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const cellBodySchema = z.object({
  productId: z.string().uuid(),
  counted: z.number().finite(),
})

function validateSessionId(sessionId: string): NextResponse | null {
  if (!isUuid(sessionId)) {
    return NextResponse.json({ error: uuidError('sessionId') }, { status: 400 })
  }
  return null
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const denied = await requireInventoryPermission(request, 'inventory.config.write')
  if (denied) return denied
  try {
    const { sessionId } = await params
    const bad = validateSessionId(sessionId)
    if (bad) return bad

    const parsed = cellBodySchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      const issue = (parsed as { error?: { issues?: Array<{ message: string }> } }).error?.issues?.[0]
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: issue?.message ?? 'productId and counted are required' } },
        { status: 400 },
      )
    }

    const { productId, counted } = parsed.data
    const item = await saveDailyCell(sessionId, productId, counted)
    return NextResponse.json({ data: item })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save cell'
    const status = /not editable|not found|in_progress/i.test(message) ? 400 : 500
    return NextResponse.json({ error: { message } }, { status })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const denied = await requireInventoryPermission(request, 'inventory.config.write')
  if (denied) return denied
  try {
    const { sessionId } = await params
    const bad = validateSessionId(sessionId)
    if (bad) return bad
    await submitDailySession(sessionId)
    return NextResponse.json({ data: { status: 'submitted' } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to submit sheet'
    return NextResponse.json({ error: { message } }, { status: 400 })
  }
}