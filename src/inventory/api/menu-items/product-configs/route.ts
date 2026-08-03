import { NextResponse } from 'next/server'
import { getInventoryClient } from '@/inventory/lib/db'
import type { ApiResponse } from '@/inventory/engine/types'

export async function GET(): Promise<NextResponse<ApiResponse<unknown[]>>> {
  try {
    const supabase = getInventoryClient()

    const { data, error } = await supabase
      .from('bar_product_config')
      .select('product_id, bottle_size_ml, pour_size_ml, display_as')

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
