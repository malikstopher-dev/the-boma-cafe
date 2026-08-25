import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireInventoryPermission } from '@/inventory/lib/require-inventory-permission'
import { recordGas } from '../../../engine/gas'
import { requireString, getHeader } from '../../../lib/api-utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const denied = await requireInventoryPermission(request, 'inventory.approve')
  if (denied) return denied

  try {
    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: { message: 'Invalid body' } }, { status: 400 })

    const productId = requireString(body.productId, 'productId')
    const kind = body.kind === 'usage' ? 'usage' : 'delivery'
    const quantity = Number(body.quantity)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json({ error: { message: 'quantity must be positive' } }, { status: 400 })
    }
    const unitCost = body.unitCost === undefined || body.unitCost === null || body.unitCost === '' ? null : Number(body.unitCost)
    if (kind === 'delivery' && unitCost !== null && (!Number.isFinite(unitCost) || unitCost < 0)) {
      return NextResponse.json({ error: { message: 'Invalid unitCost' } }, { status: 400 })
    }

    const result = await recordGas({
      productId,
      locationId: typeof body.locationId === 'string' && body.locationId ? body.locationId : null,
      kind,
      quantity,
      unitCost,
      notes: typeof body.notes === 'string' ? body.notes : null,
      performedBy: getHeader(request, 'x-user-staff-id'),
    })
    return NextResponse.json({ data: result }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to record gas movement'
    const status = /required|positive|insufficient/i.test(message) ? 400 : 500
    return NextResponse.json({ error: { message } }, { status })
  }
}