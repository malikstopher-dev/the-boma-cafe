'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import StatusBadge from '@/components/pos/StatusBadge'
import StationBadge from '@/components/pos/StationBadge'
import PosButton from '@/components/pos/PosButton'
import Timer from '@/components/pos/Timer'

interface Order {
  id: string; order_ref: string | null; customer_name: string; status: string; station: string | null
  waiter_name: string | null; table_number: string | null; created_at: string; items_json: string
  total?: number; cancellation_reason?: string | null; parent_order_id?: string | null; source?: string
}

type FilterStatus = 'all' | 'active' | 'ready' | 'served'

export default function WaiterOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [updating, setUpdating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterStatus>('active')

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/supabase/orders?limit=500')
      if (!res.ok) return
      const data = await res.json()
      setOrders((data || []).filter((o: Order) => o.source === 'waiter'))
    } catch { /* */ }
  }, [])

  useEffect(() => {
    loadOrders()
    let supabase = createBrowserClient()
    let channel: any = null
    try {
      channel = supabase.channel('waiter-active-orders')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadOrders())
        .subscribe()
    } catch { /* */ }
    return () => { if (channel && supabase) supabase.removeChannel(channel) }
  }, [loadOrders])

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id); setError(null)
    try {
      const res = await fetch(`/api/supabase/orders?id=${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || `Failed (${res.status})`) }
    } catch { setError('Network error') }
    finally { setUpdating(null) }
  }

  const tableGroups = orders.reduce<Record<string, Order[]>>((acc, o) => {
    const key = o.parent_order_id || o.id
    if (!acc[key]) acc[key] = []
    acc[key].push(o)
    return acc
  }, {})

  const allTables = Object.entries(tableGroups).map(([parentId, group]) => {
    const first = group[0]
    const tableNum = first.table_number || first.customer_name?.replace('Table ', '') || '?'
    const allDone = group.every(o => o.status === 'ready' || o.status === 'served' || o.status === 'completed')
    const hasReady = group.some(o => o.status === 'ready')
    const hasServed = group.some(o => o.status === 'served')
    const hasCompleted = group.every(o => o.status === 'completed')
    const totalAmount = group.reduce((s, o) => s + (o.total || 0), 0)
    return { parentId, tableNum, group, allDone, hasReady, hasServed, hasCompleted, first, totalAmount }
  })

  const filteredTables = useMemo(() => {
    let result = allTables
    if (filter === 'active') result = result.filter(t => !t.hasCompleted)
    else if (filter === 'ready') result = result.filter(t => t.hasReady)
    else if (filter === 'served') result = result.filter(t => t.hasServed && !t.hasCompleted)
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(t => t.tableNum.toLowerCase().includes(q) || t.group.some(o => o.order_ref?.toLowerCase().includes(q)))
    }
    return result
  }, [allTables, filter, search])

  return (
    <div style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto', fontFamily: 'var(--pos-font)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--pos-text)' }}>📋 Active Table Orders</h2>
        <PosButton variant="ghost" size="sm" onClick={loadOrders}>Refresh</PosButton>
      </div>

      {/* Search */}
      <label htmlFor="order-search" className="sr-only" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>Search orders</label>
      <input id="order-search" type="text" placeholder="🔍 Search by table or order ref..." value={search} onChange={e => setSearch(e.target.value)} aria-label="Search orders by table number or order reference"
        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 'var(--pos-radius-md)', border: '1px solid var(--pos-border)', background: 'var(--pos-card)', color: 'var(--pos-text)', fontSize: '0.85rem', boxSizing: 'border-box', outline: 'none', marginBottom: '0.75rem', fontFamily: 'var(--pos-font)' }} />

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1rem' }}>
        {([
          { key: 'active', label: 'Active', count: allTables.filter(t => !t.hasCompleted).length },
          { key: 'ready', label: 'Ready', count: allTables.filter(t => t.hasReady).length },
          { key: 'served', label: 'Served', count: allTables.filter(t => t.hasServed && !t.hasCompleted).length },
          { key: 'all', label: 'All', count: allTables.length },
        ] as const).map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            style={{ padding: '0.4rem 0.75rem', borderRadius: 'var(--pos-radius-full)', border: filter === f.key ? '1px solid var(--pos-amber)' : '1px solid var(--pos-border)', background: filter === f.key ? 'rgba(245,158,11,0.15)' : 'var(--pos-card)', color: filter === f.key ? 'var(--pos-amber)' : 'var(--pos-text-muted)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--pos-font)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            {f.label}
            {f.count > 0 && <span style={{ padding: '0 4px', borderRadius: '999px', background: filter === f.key ? 'var(--pos-amber)' : 'var(--pos-border)', color: filter === f.key ? '#000' : 'var(--pos-text-dim)', fontSize: '0.6rem', fontWeight: 800, minWidth: '16px', textAlign: 'center' as const }}>{f.count}</span>}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ padding: '0.6rem', marginBottom: '0.75rem', borderRadius: 'var(--pos-radius-md)', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: '0.8rem', textAlign: 'center' }}>{error}</div>
      )}

      {filteredTables.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--pos-text-dim)', fontSize: '0.85rem' }}>
          {search ? 'No matching orders' : 'No active orders'}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {filteredTables.map(({ parentId, tableNum, group, hasReady }) => (
          <div key={parentId} style={{
            background: 'var(--pos-card)', borderRadius: 'var(--pos-radius-lg)', padding: '0.75rem',
            border: hasReady ? '2px solid rgba(16,185,129,0.3)' : '1px solid var(--pos-border)',
          }}>
            {/* Table header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem' }}>🍽️</span>
                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: hasReady ? '#10b981' : 'var(--pos-text)' }}>Table {tableNum}</span>
                {group[0]?.waiter_name && <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 600 }}>👤 {group[0].waiter_name}</span>}
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--pos-text-dim)' }}>{group.length} ticket{group.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Orders */}
            {group.map(order => {
              const items: any[] = []
              try { const p = JSON.parse(order.items_json); (Array.isArray(p) ? p : p?.items || []).forEach((i: any) => items.push(i)) } catch { /* */ }
              return (
                <div key={order.id} style={{ padding: '0.4rem 0', borderTop: '1px solid var(--pos-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <StationBadge station={order.station as any} size="sm" />
                      <span style={{ fontFamily: 'var(--pos-font-mono)', fontSize: '0.75rem', color: 'var(--pos-text-dim)' }}>{order.order_ref}</span>
                      <StatusBadge status={order.status as any} size="sm" />
                    </div>
                    <Timer startTime={order.created_at} targetMinutes={15} size="sm" />
                  </div>

                  {items.length > 0 && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--pos-text-secondary)', marginBottom: '0.2rem' }}>
                      {items.map((item: any, i: number) => <span key={i}>{item.quantity}x {item.name}{i < items.length - 1 ? ', ' : ''}</span>)}
                    </div>
                  )}

                  {order.cancellation_reason && (
                    <div style={{ padding: '0.3rem 0.5rem', borderRadius: 'var(--pos-radius-sm)', background: 'rgba(239,68,68,0.1)', color: '#fca5a5', fontSize: '0.75rem', marginBottom: '0.4rem' }}>
                      ❌ Cancelled: {order.cancellation_reason}
                    </div>
                  )}

                  {order.status === 'ready' && (
                    <PosButton variant="primary" fullWidth size="sm" loading={updating === order.id} onClick={() => updateStatus(order.id, 'served')} style={{ marginTop: '0.3rem' }}>
                      ✅ Mark Served
                    </PosButton>
                  )}
                  {order.status === 'served' && (
                    <PosButton variant="secondary" fullWidth size="sm" loading={updating === order.id} onClick={() => updateStatus(order.id, 'completed')} style={{ marginTop: '0.3rem' }}>
                      Complete Order
                    </PosButton>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
