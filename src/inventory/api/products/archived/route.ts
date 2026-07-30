import { NextRequest, NextResponse } from 'next/server'
import { getInventoryClient } from '@/inventory/lib/db'
import type { ApiResponse, InventoryProduct } from '@/inventory/engine/types'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<InventoryProduct[]>>> {
  try {
    const supabase = getInventoryClient()

    const { data, error } = await supabase
      .from('inventory_products')
      .select('*')
      .eq('is_active', false)
      .order('deleted_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: { code: 'QUERY_ERROR', message: error.message } },
        { status: 500 },
      )
    }

    return NextResponse.json({ data: (data ?? []) as InventoryProduct[] })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
