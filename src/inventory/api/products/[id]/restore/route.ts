import { NextRequest, NextResponse } from 'next/server'
import { getInventoryClient } from '@/inventory/lib/db'
import type { ApiResponse, InventoryProduct } from '@/inventory/engine/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<InventoryProduct>>> {
  try {
    const { id } = await params
    const supabase = getInventoryClient()

    const { data, error } = await supabase
      .from('inventory_products')
      .update({ is_active: true, deleted_at: null })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: `Product not found: ${id}` } },
        { status: 404 },
      )
    }

    await supabase
      .from('inventory_audit_log')
      .insert({
        table_name: 'inventory_products',
        record_id: id,
        action: 'restored',
      })

    return NextResponse.json({ data: data as InventoryProduct })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
