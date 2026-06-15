import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth/requireRole'

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')

    const { data: orders, error } = await getAdminClient()
      .from('orders')
      .select('id, total, status, order_type, items_json, created_at')
      .gte('created_at', new Date(Date.now() - days * 86400000).toISOString())
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!orders || orders.length === 0) {
      return NextResponse.json({
        revenue: 0,
        totalOrders: 0,
        topProducts: [],
        orderTypeBreakdown: { pickup: 0, delivery: 0, 'dine-in': 0 },
        dailyRevenue: [],
        orderFrequency: [],
      })
    }

    const completed = orders.filter(o => o.status === 'completed')
    const revenue = completed.reduce((s, o) => s + (parseFloat(o.total) || 0), 0)

    // ── Top products ─────────────────────────────────────────
    const productCount = new Map<string, { name: string; qty: number; rev: number }>()
    for (const order of completed) {
      try {
        const parsed = JSON.parse(order.items_json)
        const items = Array.isArray(parsed) ? parsed : (parsed?.items || [])
        for (const item of items) {
          const existing = productCount.get(item.name) || { name: item.name, qty: 0, rev: 0 }
          existing.qty += item.quantity || 1
          existing.rev += (item.price || 0) * (item.quantity || 1)
          productCount.set(item.name, existing)
        }
      } catch { /* skip */ }
    }
    const topProducts = Array.from(productCount.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10)

    // ── Order type breakdown ──────────────────────────────────
    const orderTypeBreakdown: Record<string, number> = { pickup: 0, delivery: 0, 'dine-in': 0 }
    for (const order of orders) {
      const t = order.order_type || 'pickup'
      orderTypeBreakdown[t] = (orderTypeBreakdown[t] || 0) + 1
    }

    // ── Daily revenue (last 30 days) ──────────────────────────
    const dailyMap = new Map<string, number>()
    for (const order of completed) {
      const day = new Date(order.created_at).toISOString().slice(0, 10)
      dailyMap.set(day, (dailyMap.get(day) || 0) + (parseFloat(order.total) || 0))
    }
    const dailyRevenue: { date: string; revenue: number }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
      dailyRevenue.push({ date: d, revenue: Math.round((dailyMap.get(d) || 0) * 100) / 100 })
    }

    // ── Order frequency (orders per day) ──────────────────────
    const freqMap = new Map<string, number>()
    for (const order of orders) {
      const day = new Date(order.created_at).toISOString().slice(0, 10)
      freqMap.set(day, (freqMap.get(day) || 0) + 1)
    }
    const orderFrequency: { date: string; count: number }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
      orderFrequency.push({ date: d, count: freqMap.get(d) || 0 })
    }

    return NextResponse.json({
      revenue: Math.round(revenue * 100) / 100,
      totalOrders: orders.length,
      topProducts,
      orderTypeBreakdown,
      dailyRevenue,
      orderFrequency,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error)?.message || 'Unknown error' }, { status: 500 })
  }
}
