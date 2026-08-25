import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse } from '@/inventory/engine/types'
import { cancelStockCount } from '@/inventory/engine/stock-counts'
import { requireInventoryPermission } from '@/inventory/lib/require-inventory-permission'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<unknown>>> {
  const denied = await requireInventoryPermission(request, 'inventory.config.write')
  if (denied) return denied
  try {
    const { id } = await params

    const result = await cancelStockCount(id)
    return NextResponse.json({ data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message.includes('not found') ? 404 : 400
    return NextResponse.json(
      { error: { code: status === 404 ? 'NOT_FOUND' : 'BAD_REQUEST', message } },
      { status },
    )
  }
}
