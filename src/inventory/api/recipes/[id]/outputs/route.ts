import { NextRequest, NextResponse } from 'next/server'
import { addOutput } from '@/inventory/engine/recipes'
import type { ApiResponse } from '@/inventory/engine/types'
import { requireInventoryPermission } from '@/inventory/lib/require-inventory-permission'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse<ApiResponse<unknown>>> {
  const denied = await requireInventoryPermission(request, 'inventory.config.write')
  if (denied) return denied
  try {
    const { id } = await params
    const body = await request.json()
    if (!body.name) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'name is required' } },
        { status: 400 },
      )
    }
    const data = await addOutput(id, body)
    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
