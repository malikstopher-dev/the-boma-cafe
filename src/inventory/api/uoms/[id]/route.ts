import { NextRequest, NextResponse } from 'next/server'
import { getInventoryClient } from '@/inventory/lib/db'
import type { ApiResponse, InventoryUom } from '@/inventory/engine/types'
import { requireInventoryPermission } from '@/inventory/lib/require-inventory-permission'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<InventoryUom>>> {
  try {
    const { id } = await params
    const supabase = getInventoryClient()

    const { data, error } = await supabase
      .from('inventory_uoms')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      return NextResponse.json(
        { error: { code: 'QUERY_ERROR', message: error.message } },
        { status: 500 },
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: `UOM not found: ${id}` } },
        { status: 404 },
      )
    }

    return NextResponse.json({ data: data as InventoryUom })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<void>>> {
  const denied = await requireInventoryPermission(request, 'inventory.config.write')
  if (denied) return denied
  try {
    const { id } = await params
    const supabase = getInventoryClient()

    const { count: usageCount } = await supabase
      .from('inventory_product_uoms')
      .select('*', { count: 'exact', head: true })
      .eq('uom_id', id)

    if (usageCount && usageCount > 0) {
      return NextResponse.json(
        { error: { code: 'CONFLICT', message: `UOM is in use by ${usageCount} product(s). Cannot delete.` } },
        { status: 409 },
      )
    }

    const { error } = await supabase
      .from('inventory_uoms')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: error.message } },
        { status: 500 },
      )
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
