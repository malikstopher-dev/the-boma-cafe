import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse } from '@/inventory/engine/types'
import { saveCountItem } from '@/inventory/engine/stock-counts'
import { requireInventoryPermission } from '@/inventory/lib/require-inventory-permission'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<unknown>>> {
  const denied = await requireInventoryPermission(request, 'inventory.config.write')
  if (denied) return denied
  try {
    const { id } = await params
    const body = await request.json()

    const { product_id, physical_quantity, variance_reason } = body

    if (!product_id) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'product_id is required' } },
        { status: 400 },
      )
    }

    if (physical_quantity === undefined || physical_quantity === null) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'physical_quantity is required' } },
        { status: 400 },
      )
    }

    const item = await saveCountItem(
      id,
      product_id,
      Number(physical_quantity),
      variance_reason ?? null,
    )

    return NextResponse.json({ data: item })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
