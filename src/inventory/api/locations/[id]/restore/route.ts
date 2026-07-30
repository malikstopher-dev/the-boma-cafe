import { NextRequest, NextResponse } from 'next/server'
import { getInventoryClient } from '@/inventory/lib/db'
import type { ApiResponse, InventoryLocation } from '@/inventory/engine/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<InventoryLocation>>> {
  try {
    const { id } = await params
    const supabase = getInventoryClient()

    const { data, error } = await supabase
      .from('inventory_locations')
      .update({ is_active: true, deleted_at: null })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: `Location not found: ${id}` } },
        { status: 404 },
      )
    }

    await supabase
      .from('inventory_audit_log')
      .insert({ table_name: 'inventory_locations', record_id: id, action: 'restored' })

    return NextResponse.json({ data: data as InventoryLocation })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
