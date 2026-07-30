import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse } from '@/inventory/engine/types'
import { getInventoryClient } from '@/inventory/lib/db'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const supabase = getInventoryClient()
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from') ?? new Date(Date.now() - 90 * 86400000).toISOString()
    const to = searchParams.get('to') ?? new Date().toISOString()

    const { data } = await supabase
      .from('inventory_purchase_orders')
      .select('supplier_id, inventory_suppliers!inner(name), created_at, received_at, inventory_purchase_order_items(quantity_ordered, quantity_received, unit_cost)')
      .gte('created_at', from)
      .lte('created_at', to)
      .in('status', ['received', 'partial'])
      .order('created_at', { ascending: false })

    if (!data) return NextResponse.json({ data: [] })

    const grouped: Record<string, any> = {}
    for (const po of data as any[]) {
      const sid = po.supplier_id
      if (!grouped[sid]) {
        grouped[sid] = {
          supplier_id: sid,
          supplier_name: po.inventory_suppliers?.name ?? 'Unknown',
          po_count: 0,
          total_ordered: 0,
          total_received: 0,
          total_value: 0,
        }
      }
      grouped[sid].po_count++
      for (const item of (po.inventory_purchase_order_items ?? [])) {
        grouped[sid].total_ordered += Number(item.quantity_ordered)
        grouped[sid].total_received += Number(item.quantity_received ?? 0)
        if (item.unit_cost) {
          grouped[sid].total_value += Number(item.quantity_received ?? 0) * Number(item.unit_cost)
        }
      }
    }

    return NextResponse.json({ data: Object.values(grouped) })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
