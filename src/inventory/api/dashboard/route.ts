import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse } from '@/inventory/engine/types'
import { getInventoryTypeFilter } from '@/inventory/lib/api-utils'
import {
  getDashboardSummary,
  getAlerts,
  getRecentActivity,
  getFastMovers,
  getSlowMovers,
  getTodayTransactions,
  type DashboardSummary,
  type AlertItem,
  type RecentActivityItem,
  type FastMoverItem,
  type SlowMoverItem,
  type TodayTransactionSummary,
} from '@/inventory/engine/dashboard'
import { getReconciliation, getInventoryValue, type ReconciliationRow } from '@/inventory/engine/reconciliation'
import { getInventoryClient } from '@/inventory/lib/db'
import { resolveLocationId } from '@/inventory/lib/location'

async function getOpenPoStats() {
  const supabase = getInventoryClient()
  const today = new Date().toISOString().slice(0, 10)

  const { count: openCount } = await supabase
    .from('inventory_purchase_orders')
    .select('*', { count: 'exact', head: true })
    .in('status', ['ordered', 'partial'])

  const { data: overdue } = await supabase
    .from('inventory_purchase_orders')
    .select('id, supplier_id, expected_at, inventory_suppliers!inner(name)')
    .in('status', ['ordered', 'partial'])
    .lt('expected_at', today)
    .limit(5)

  const { data: recentPos } = await supabase
    .from('inventory_purchase_orders')
    .select('id, status, created_at, supplier_id, inventory_suppliers!inner(name)')
    .in('status', ['ordered', 'partial', 'received'])
    .order('created_at', { ascending: false })
    .limit(5)

  return {
    openCount: openCount ?? 0,
    overdueCount: overdue?.length ?? 0,
    overdue: (overdue ?? []).map((p: any) => ({
      id: p.id,
      supplierName: p.inventory_suppliers?.name ?? 'Unknown',
      expectedAt: p.expected_at,
    })),
    recent: (recentPos ?? []).map((p: any) => ({
      id: p.id,
      status: p.status,
      supplierName: p.inventory_suppliers?.name ?? 'Unknown',
      createdAt: p.created_at,
    })),
  }
}

function missingLocation(): NextResponse<ApiResponse<unknown>> {
  return NextResponse.json(
    { error: { code: 'VALIDATION_ERROR', message: 'location_id query parameter is required' } },
    { status: 400 },
  )
}

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const { searchParams } = new URL(request.url)
    const locationId = await resolveLocationId(searchParams.get('location_id'))
    const section = searchParams.get('section') ?? 'summary'
    const limit = Math.min(Number(searchParams.get('limit')) || 10, 100)
    const days = Number(searchParams.get('days')) || 30
    const inventoryType = getInventoryTypeFilter(searchParams)

    if (!locationId) return missingLocation()

    switch (section) {
      case 'summary': {
        const data = await getDashboardSummary(locationId, inventoryType)
        return NextResponse.json({ data })
      }

      case 'alerts': {
        const data = await getAlerts(locationId, inventoryType)
        return NextResponse.json({ data })
      }

      case 'reconciliation': {
        const date = searchParams.get('date') ?? undefined
        const data = await getReconciliation(locationId, date, inventoryType ?? undefined)
        return NextResponse.json({ data })
      }

      case 'recent': {
        const data = await getRecentActivity(locationId, limit, inventoryType)
        return NextResponse.json({ data })
      }

      case 'fast-movers': {
        const data = await getFastMovers(locationId, days, limit, inventoryType)
        return NextResponse.json({ data })
      }

      case 'slow-movers': {
        const data = await getSlowMovers(locationId, days, limit, inventoryType)
        return NextResponse.json({ data })
      }

      case 'value': {
        const data = await getInventoryValue(locationId)
        return NextResponse.json({ data: { value: data } })
      }

      case 'today': {
        const data = await getTodayTransactions(locationId, inventoryType)
        return NextResponse.json({ data })
      }

      case 'combined': {
        const supabase = getInventoryClient()
        const rpcRes = await supabase.rpc('combined_dashboard', {
          p_location: locationId,
          p_days: days,
          p_inventory_type: inventoryType ?? null,
        }) as unknown as { data: unknown | null; error: { message: string } | null }

        if (!rpcRes.error && rpcRes.data != null) {
          return NextResponse.json({ data: rpcRes.data })
        }

        // Fallback: RPC not yet applied to the DB (migration 072) — keep the
        // old multi-query path so the page keeps working until then.
        const [summary, alerts, recent, fastMovers, slowMovers, value, today, poResult] = await Promise.all([
          getDashboardSummary(locationId, inventoryType),
          getAlerts(locationId, inventoryType),
          getRecentActivity(locationId, 10, inventoryType),
          getFastMovers(locationId, days, 5, inventoryType),
          getSlowMovers(locationId, days, 5, inventoryType),
          getInventoryValue(locationId),
          getTodayTransactions(locationId, inventoryType),
          getOpenPoStats(),
        ])
        return NextResponse.json({
          data: {
            summary,
            alerts,
            recent,
            fastMovers,
            slowMovers,
            inventoryValue: value,
            todayTransactions: today,
            purchaseOrders: poResult,
          },
        })
      }

      default:
        return NextResponse.json(
          { error: { code: 'BAD_REQUEST', message: `Unknown section: ${section}` } },
          { status: 400 },
        )
    }
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
