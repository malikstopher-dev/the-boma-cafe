import { NextRequest, NextResponse } from 'next/server'
import { getInventoryClient } from '@/inventory/lib/db'
import type { ApiResponse } from '@/inventory/engine/types'

type BatchLinkResult = {
  linked: number
  category_name: string | null
  product_name: string | null
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<BatchLinkResult>>> {
  try {
    const supabase = getInventoryClient()
    const body = await request.json().catch(() => ({}))
    const { category_id, inventory_product_id, pour_size_ml } = body as {
      category_id?: string
      inventory_product_id?: string
      pour_size_ml?: number
    }

    if (!category_id || !inventory_product_id) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'category_id and inventory_product_id are required' } },
        { status: 400 },
      )
    }

    if (!pour_size_ml || Number(pour_size_ml) <= 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'pour_size_ml must be a positive number' } },
        { status: 400 },
      )
    }

    const [categoryRes, productRes] = await Promise.all([
      supabase.from('bar_categories').select('name').eq('id', category_id).maybeSingle(),
      supabase.from('inventory_products').select('name').eq('id', inventory_product_id).maybeSingle(),
    ])

    if (categoryRes.error || !categoryRes.data) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: `Bar category not found: ${category_id}` } },
        { status: 404 },
      )
    }
    if (productRes.error || !productRes.data) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: `Inventory product not found: ${inventory_product_id}` } },
        { status: 404 },
      )
    }

    const { data: unlinked, error: unlinkedError } = await supabase
      .from('bar_items')
      .select('id')
      .eq('category_id', category_id)
      .eq('has_inventory', false)

    if (unlinkedError) {
      return NextResponse.json(
        { error: { code: 'QUERY_ERROR', message: unlinkedError.message } },
        { status: 500 },
      )
    }

    if (!unlinked || unlinked.length === 0) {
      return NextResponse.json({
        data: {
          linked: 0,
          category_name: categoryRes.data.name,
          product_name: productRes.data.name,
        },
      })
    }

    const { error: insertError } = await supabase
      .from('bar_item_inventory_links')
      .insert(
        unlinked.map(item => ({
          bar_item_id: item.id,
          inventory_product_id,
          pour_size_ml: Number(pour_size_ml),
        })),
      )
      .select('id')

    if (insertError) {
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: insertError.message } },
        { status: 500 },
      )
    }

    await supabase
      .from('bar_items')
      .update({ has_inventory: true })
      .in('id', unlinked.map(item => item.id))

    return NextResponse.json(
      {
        data: {
          linked: unlinked.length,
          category_name: categoryRes.data.name,
          product_name: productRes.data.name,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
