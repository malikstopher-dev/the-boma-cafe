import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse } from '@/inventory/engine/types'
import { getInventoryClient } from '@/inventory/lib/db'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const supabase = getInventoryClient()

    const { data: suppliers } = await supabase
      .from('inventory_suppliers')
      .select('id, name')
      .eq('is_active', true)

    if (!suppliers) return NextResponse.json({ data: [] })

    const result = []

    for (const supplier of suppliers) {
      const { data: pos } = await supabase
        .from('inventory_purchase_orders')
        .select('status, expected_at, created_at, received_at')
        .eq('supplier_id', supplier.id)
        .in('status', ['received', 'partial', 'ordered', 'cancelled'])

      if (!pos || pos.length === 0) continue

      const total = pos.length
      const received = pos.filter(p => p.status === 'received' || p.status === 'partial').length
      const cancelled = pos.filter(p => p.status === 'cancelled').length
      const onTime = pos.filter(p =>
        p.status === 'received' && p.expected_at &&
        p.received_at && new Date(p.received_at) <= new Date(p.expected_at + 'T23:59:59Z')
      ).length

      let totalLeadTime = 0
      let leadTimeCount = 0
      for (const po of pos) {
        if (po.received_at && po.created_at) {
          const diff = (new Date(po.received_at).getTime() - new Date(po.created_at).getTime()) / 86400000
          totalLeadTime += diff
          leadTimeCount++
        }
      }

      result.push({
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        total_pos: total,
        received_count: received,
        cancelled_count: cancelled,
        on_time_count: onTime,
        on_time_rate: received > 0 ? Math.round((onTime / received) * 100) : 0,
        avg_lead_time_days: leadTimeCount > 0 ? Math.round((totalLeadTime / leadTimeCount) * 10) / 10 : null,
        open_pos: pos.filter(p => p.status === 'ordered' || p.status === 'partial').length,
      })
    }

    return NextResponse.json({ data: result.sort((a: any, b: any) => a.on_time_rate - b.on_time_rate) })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
