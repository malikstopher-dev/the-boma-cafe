import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse } from '@/inventory/engine/types'
import { getInventoryClient } from '@/inventory/lib/db'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const supabase = getInventoryClient()
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from') ?? new Date(Date.now() - 90 * 86400000).toISOString()
    const to = searchParams.get('to') ?? new Date().toISOString()
    const supplierId = searchParams.get('supplier_id')

    let query = supabase
      .from('inventory_purchase_order_items')
      .select('product_id, quantity_ordered, quantity_received, unit_cost, inventory_products!inner(id, name, sku), inventory_purchase_orders!inner(created_at, supplier_id, inventory_suppliers!inner(name))')
      .gte('inventory_purchase_orders.created_at', from)
      .lte('inventory_purchase_orders.created_at', to)
      .in('inventory_purchase_orders.status', ['received', 'partial'])

    if (supplierId) query = query.eq('inventory_purchase_orders.supplier_id', supplierId)

    const { data } = await query.order('quantity_ordered', { ascending: false })

    if (!data) return NextResponse.json({ data: [] })

    const grouped: Record<string, any> = {}
    for (const item of data as any[]) {
      const pid = item.product_id
      if (!grouped[pid]) {
        grouped[pid] = {
          product_id: pid,
          product_name: item.inventory_products?.name ?? 'Unknown',
          product_sku: item.inventory_products?.sku ?? null,
          total_ordered: 0,
          total_received: 0,
          total_value: 0,
          po_count: 0,
        }
      }
      grouped[pid].total_ordered += Number(item.quantity_ordered)
      grouped[pid].total_received += Number(item.quantity_received ?? 0)
      if (item.unit_cost) grouped[pid].total_value += Number(item.quantity_received ?? 0) * Number(item.unit_cost)
      grouped[pid].po_count++
    }

    return NextResponse.json({ data: Object.values(grouped).sort((a: any, b: any) => b.total_value - a.total_value) })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
