import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse } from '@/inventory/engine/types'
import { getStockCount } from '@/inventory/engine/stock-counts'
import { getInventoryClient } from '@/inventory/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const { id } = await params

    const result = await getStockCount(id)
    if (!result) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: `Stock count not found: ${id}` } },
        { status: 404 },
      )
    }

    return NextResponse.json({ data: result })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const { id } = await params
    const supabase = getInventoryClient()
    const body = await request.json()

    if (!body.notes && body.notes !== '') {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Only notes field can be updated' } },
        { status: 400 },
      )
    }

    const { data, error } = await supabase
      .from('inventory_stock_counts')
      .update({ notes: body.notes })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: `Stock count not found: ${id}` } },
        { status: 404 },
      )
    }

    const result = await getStockCount(id)
    return NextResponse.json({ data: result })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
