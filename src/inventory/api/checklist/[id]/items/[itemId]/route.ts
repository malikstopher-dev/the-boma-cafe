import { NextRequest, NextResponse } from 'next/server'
import { updateItemStatus } from '@/inventory/engine/checklist'
import type { ApiResponse, ChecklistItemStatus } from '@/inventory/engine/types'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const { id, itemId } = await params
    const body = await request.json()

    const validStatuses = ['pending', 'completed', 'skipped', 'failed']
    if (!body.status || !validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: `status must be one of: ${validStatuses.join(', ')}` } },
        { status: 400 },
      )
    }

    const data = await updateItemStatus(
      id,
      itemId,
      body.status as ChecklistItemStatus,
      body.completed_by ?? null,
      body.notes ?? null,
    )

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
