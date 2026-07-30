import { NextRequest, NextResponse } from 'next/server'
import { getInventoryClient } from '@/inventory/lib/db'
import type { ApiResponse } from '@/inventory/engine/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const { id } = await params
    const supabase = getInventoryClient()
    const body = await request.json()

    const { inventory_product_id, pour_size_ml } = body

    if (!inventory_product_id) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'inventory_product_id is required' } },
        { status: 400 },
      )
    }

    if (!pour_size_ml || Number(pour_size_ml) <= 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'pour_size_ml must be a positive number' } },
        { status: 400 },
      )
    }

    const { data: barItem, error: barError } = await supabase
      .from('bar_items')
      .select('id, name')
      .eq('id', id)
      .maybeSingle()

    if (barError || !barItem) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: `Bar item not found: ${id}` } },
        { status: 404 },
      )
    }

    const { data: product, error: productError } = await supabase
      .from('inventory_products')
      .select('id, name')
      .eq('id', inventory_product_id)
      .maybeSingle()

    if (productError || !product) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: `Inventory product not found: ${inventory_product_id}` } },
        { status: 404 },
      )
    }

    const { data, error } = await supabase
      .from('bar_item_inventory_links')
      .insert({
        bar_item_id: id,
        inventory_product_id,
        pour_size_ml: Number(pour_size_ml),
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: { code: 'CONFLICT', message: 'This bar item is already linked to this product' } },
          { status: 409 },
        )
      }
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: error.message } },
        { status: 500 },
      )
    }

    await supabase
      .from('bar_items')
      .update({ has_inventory: true })
      .eq('id', id)

    return NextResponse.json({ data: data as unknown }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
