import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSupplierPayables } from '../../engine/payables'
import { requireInventoryPermission } from '../../lib/require-inventory-permission'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const denied = await requireInventoryPermission(request, 'supplier.finance.read')
  if (denied) return denied
  try {
    const data = await getSupplierPayables()
    return NextResponse.json({ data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load supplier payables'
    return NextResponse.json({ error: { message } }, { status: 500 })
  }
}
