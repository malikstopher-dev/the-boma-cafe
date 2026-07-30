import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse } from '@/inventory/engine/types'
import { getInventoryClient } from '@/inventory/lib/db'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const supabase = getInventoryClient()
    const { searchParams } = new URL(request.url)
    const supplierId = searchParams.get('supplier_id') ?? undefined

    let query = supabase
      .from('inventory_purchase_orders')
      .select('*, inventory_suppliers(name), inventory_purchase_order_items(product_id, quantity_ordered, quantity_received, inventory_products(id, name))')
      .in('status', ['ordered', 'partial'])
      .order('expected_at', { ascending: true })

    if (supplierId) query = query.eq('supplier_id', supplierId)

    const { data, error } = await query

    if (error) throw new Error(error.message)

    const now = new Date().toISOString().slice(0, 10)

    const enriched = (data ?? []).map((po: any) => {
      const items = (po.inventory_purchase_order_items ?? []).map((item: any) => ({
        product_id: item.product_id,
        product_name: item.inventory_products?.name ?? 'Unknown',
        quantity_ordered: Number(item.quantity_ordered),
        quantity_received: Number(item.quantity_received ?? 0),
        quantity_outstanding: Number(item.quantity_ordered) - Number(item.quantity_received ?? 0),
      }))

      const totalOutstanding = items.reduce((s: number, i: any) => s + i.quantity_outstanding, 0)
      const isOverdue = po.expected_at && po.expected_at < now

      return {
        id: po.id,
        supplier_name: po.inventory_suppliers?.name ?? 'Unknown',
        status: po.status,
        expected_at: po.expected_at,
        is_overdue: isOverdue,
        total_outstanding: totalOutstanding,
        items: items.filter((i: any) => i.quantity_outstanding > 0),
      }
    })

    return NextResponse.json({ data: enriched })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
