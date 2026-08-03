import { NextRequest, NextResponse } from 'next/server'
import { getInventoryClient } from '@/inventory/lib/db'
import type { ApiResponse } from '@/inventory/engine/types'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<unknown[]>>> {
  try {
    const supabase = getInventoryClient()
    const { searchParams } = new URL(request.url)
    const linked = searchParams.get('linked')

    let query = supabase
      .from('bar_items')
      .select('id, name, is_available, has_inventory, category_id, bar_categories(name), bar_item_inventory_links(id, inventory_product_id, pour_size_ml, inventory_products(id, name, sku))')
      .order('name')

    if (linked === 'true') {
      query = query.eq('has_inventory', true)
    } else if (linked === 'false') {
      query = query.eq('has_inventory', false)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { error: { code: 'QUERY_ERROR', message: error.message } },
        { status: 500 },
      )
    }

    return NextResponse.json({ data: (data ?? []) as unknown[] })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
