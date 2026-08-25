import { NextRequest, NextResponse } from 'next/server'
import { completeInstance, updateManagerNotes } from '@/inventory/engine/checklist'
import type { ApiResponse } from '@/inventory/engine/types'
import { requireInventoryPermission } from '@/inventory/lib/require-inventory-permission'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse<ApiResponse<unknown>>> {
  const denied = await requireInventoryPermission(request, 'inventory.config.write')
  if (denied) return denied
  try {
    const { id } = await params
    const body = await request.json()

    if (body.status === 'completed') {
      const data = await completeInstance(id, body.completed_by ?? null, body.manager_notes ?? null)
      return NextResponse.json({ data })
    }

    if (body.manager_notes !== undefined) {
      await updateManagerNotes(id, body.manager_notes, body.completed_by ?? null)
      return NextResponse.json({ data: { id, manager_notes: body.manager_notes } })
    }

    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'No valid action specified. Use status="completed" or manager_notes.' } },
      { status: 400 },
    )
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
