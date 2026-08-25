import { NextRequest, NextResponse } from 'next/server'
import { startProductionRun } from '@/inventory/engine/production-runs'
import type { ApiResponse } from '@/inventory/engine/types'
import { requireInventoryPermission } from '@/inventory/lib/require-inventory-permission'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse<ApiResponse<unknown>>> {
  const denied = await requireInventoryPermission(request, 'inventory.approve')
  if (denied) return denied
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const data = await startProductionRun(id, body.started_by ?? null)
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
