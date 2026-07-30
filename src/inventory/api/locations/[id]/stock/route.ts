import { NextRequest, NextResponse } from 'next/server'
import { getInventoryClient } from '@/inventory/lib/db'
import type { ApiResponse } from '@/inventory/engine/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<unknown[]>>> {
  try {
    const { id } = await params
    const supabase = getInventoryClient()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const cursor = searchParams.get('cursor')
    const pageSize = Math.min(Number(searchParams.get('page_size')) || 50, 100)

    let query = supabase
      .from('inventory_product_balances')
      .select('product_id, balance, refreshed_at, inventory_products(id, name, sku, is_active)')
      .eq('location_id', id)

    if (search) {
      query = query.ilike('inventory_products.name', `%${search}%`)
    }

    if (cursor) {
      query = query.lt('refreshed_at', cursor)
    }

    const { data, error } = await query
      .order('balance', { ascending: false })
      .limit(pageSize)

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
