import { NextRequest, NextResponse } from 'next/server'
import { removeIngredient } from '@/inventory/engine/recipes'
import type { ApiResponse } from '@/inventory/engine/types'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; ingredientId: string }> }): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const { id, ingredientId } = await params
    await removeIngredient(id, ingredientId)
    return NextResponse.json({ data: null })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
