import { NextRequest, NextResponse } from 'next/server'
import { getInventoryClient } from '@/inventory/lib/db'
import type { ApiResponse } from '@/inventory/engine/types'
import { requireInventoryPermission } from '@/inventory/lib/require-inventory-permission'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<{ removed: boolean }>>> {
  const denied = await requireInventoryPermission(request, 'inventory.config.write')
  if (denied) return denied
  try {
    const { id } = await params
    const supabase = getInventoryClient()

    const { error: deleteError } = await supabase
      .from('bar_item_inventory_links')
      .delete()
      .eq('bar_item_id', id)

    if (deleteError) {
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: deleteError.message } },
        { status: 500 },
      )
    }

    const { count: remaining } = await supabase
      .from('bar_item_inventory_links')
      .select('*', { count: 'exact', head: true })
      .eq('bar_item_id', id)

    if (remaining === 0) {
      await supabase
        .from('bar_items')
        .update({ has_inventory: false })
        .eq('id', id)
    }

    return NextResponse.json({ data: { removed: true } })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
