import { NextRequest, NextResponse } from 'next/server'
import { addIngredient } from '@/inventory/engine/recipes'
import type { ApiResponse } from '@/inventory/engine/types'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const { id } = await params
    const body = await request.json()
    if (!body.product_id || body.quantity === undefined) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'product_id and quantity are required' } },
        { status: 400 },
      )
    }
    const data = await addIngredient(id, body)
    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
