import { NextRequest, NextResponse } from 'next/server'
import { removeOutput } from '@/inventory/engine/recipes'
import type { ApiResponse } from '@/inventory/engine/types'
import { requireInventoryPermission } from '@/inventory/lib/require-inventory-permission'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; outputId: string }> }): Promise<NextResponse<ApiResponse<null>>> {
  const denied = await requireInventoryPermission(request, 'inventory.config.write')
  if (denied) return denied
  try {
    const { id, outputId } = await params
    await removeOutput(id, outputId)
    return NextResponse.json({ data: null })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
