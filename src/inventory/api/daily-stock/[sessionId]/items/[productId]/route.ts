import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { deleteDailyCell } from '../../../../../engine/daily-entry'
import { isUuid, uuidError } from '../../../../../lib/api-utils'
import { requireInventoryPermission } from '@/inventory/lib/require-inventory-permission'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ sessionId: string; productId: string }> }) {
  const denied = await requireInventoryPermission(request, 'inventory.config.write')
  if (denied) return denied
  try {
    const { sessionId, productId } = await params
    if (!isUuid(sessionId)) return NextResponse.json({ error: uuidError('sessionId') }, { status: 400 })
    if (!isUuid(productId)) return NextResponse.json({ error: uuidError('productId') }, { status: 400 })
    await deleteDailyCell(sessionId, productId)
    return NextResponse.json({ data: { deleted: true } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete cell'
    return NextResponse.json({ error: { message } }, { status: 400 })
  }
}