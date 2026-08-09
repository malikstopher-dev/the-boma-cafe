'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Badge from '@/components/admin/design-system/Badge'

type DashboardData = {
  summary: {
    inventoryValue: number
    totalProducts: number
    lowStockCount: number
    outOfStockCount: number
    todayPurchases: number
    todaySales: number
    todayLoss: number
    todayTransactions: number
    variance: number
  }
  alerts: Array<{ productId: string; productName: string; type: string; currentBalance: number; threshold: number | null }>
  recent: Array<{ id: string; productName: string; transactionType: string; quantity: number; createdAt: string }>
  fastMovers: Array<{ productId: string; productName: string; totalSold: number }>
  slowMovers: Array<{ productId: string; productName: string; totalSold: number }>
  inventoryValue: number
  todayTransactions: Array<{ type: string; count: number; totalQuantity: number }>
  purchaseOrders?: {
    openCount: number
    overdueCount: number
    overdue: Array<{ id: string; supplierName: string; expectedAt: string }>
    recent: Array<{ id: string; status: string; supplierName: string; createdAt: string }>
  }
}

type Location = { id: string; name: string; code: string; is_active: boolean }

export default function InvDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [locationValues, setLocationValues] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/inventory/dashboard?section=combined&location_id=main&limit=10&days=30')
      const json = await res.json()
      setData(json.data)

      const locRes = await fetch('/api/inventory/locations')
      const locJson = await locRes.json()
      const active = (locJson.data || []).filter((l: Location) => l.is_active)
      setLocations(active)

      const values: Record<string, number> = {}
      await Promise.all(active.map(async (l: Location) => {
        try {
          const vRes = await fetch(`/api/inventory/dashboard?section=value&location_id=${l.id}`)
          const vJson = await vRes.json()
          values[l.id] = vJson.data?.value ?? vJson.data?.inventoryValue ?? 0
        } catch { /* ignore */ }
      }))
      setLocationValues(values)
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const totalLocationValue = Object.values(locationValues).reduce((a, b) => a + (b || 0), 0)

  const cards = data ? [
    { label: 'Current Stock Value', value: `R${(data.summary.inventoryValue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
    { label: 'Low Stock', value: data.summary.lowStockCount.toString() },
    { label: 'Critical / Out of Stock', value: data.summary.outOfStockCount.toString() },
    { label: "Today's Purchases (units)", value: data.summary.todayPurchases.toString() },
    { label: "Today's Sales (units)", value: data.summary.todaySales.toString() },
    { label: "Today's Loss / Waste (units)", value: data.summary.todayLoss.toString() },
    { label: 'Products', value: data.summary.totalProducts.toString() },
    { label: 'Open POs', value: (data.purchaseOrders?.openCount ?? 0).toString() },
  ] : []

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#F0EDE8', margin: 0 }}>Inventory Dashboard</h1>
          <p style={{ fontSize: 13.5, color: '#8CA4C0', margin: '4px 0 0' }}>
            Real-time stock, purchasing, waste and supplier overview - calculated from the transaction ledger
          </p>
        </div>
        <button
          onClick={fetchData}
          style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #2A3648', background: '#141E2B', color: '#EDE8F0', fontSize: 13, cursor: 'pointer' }}
        >
          Refresh
        </button>
      </div>

      {isLoading ? (
        <p style={{ color: '#8A96AC', fontSize: 14 }}>Loading inventory...</p>
      ) : !data ? (
        <p style={{ color: '#F87171', fontSize: 14 }}>Could not load inventory dashboard.</p>
      ) : (
        <>
          {/* KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 26 }}>
            {cards.map(card => (
              <div key={card.label} style={{ background: '#141E2B', borderRadius: 12, border: '1px solid #243043', padding: '16px 18px' }}>
                <p style={{ margin: 0, fontSize: 11.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7A8CA8' }}>{card.label}</p>
                <p style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 800, color: '#F0EDE8' }}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* Low stock alerts */}
          <div style={{ background: '#141E2C', borderRadius: 12, border: '1px solid #24304A', padding: 18, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#F0EDE8' }}>Low Stock Alerts ({data.alerts.length})</h3>
              <Link href="/inv/adjustments" style={{ fontSize: 13, color: '#C4A04E', textDecoration: 'none' }}>Record adjustment -&gt;</Link>
            </div>
            {data.alerts.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: '#6B7A92' }}>No low-stock alerts - everything is at or above minimum.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
                {data.alerts.slice(0, 12).map(a => (
                  <div key={a.productId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: '#0F1729', borderRadius: 8 }}>
                    <span style={{ fontSize: 13, color: '#E8E6F0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{a.productName}</span>
                    <Badge variant={a.type === 'negative_balance' || a.type === 'out_of_stock' ? 'danger' : 'warning'}>
                      {a.type.replace(/_/g, ' ')} ({a.currentBalance})
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16, marginBottom: 16 }}>
            {/* Stock by location */}
            <div style={{ background: '#141E2C', borderRadius: 12, border: '1px solid #24304A', padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#F0EDE8' }}>Stock Value by Location</h3>
                <Link href="/inv/stock" style={{ fontSize: 13, color: '#93A4BC', textDecoration: 'none' }}>View stock -&gt;</Link>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '6px 8px', color: '#7A8CA8', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Location</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px', color: '#7A8CA8', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Stock Value</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px', color: '#7A8CA8', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map(l => {
                    const v = locationValues[l.id] ?? 0
                    const pct = totalLocationValue > 0 ? Math.round((v / totalLocationValue) * 100) : 0
                    return (
                      <tr key={l.id} style={{ borderTop: '1px solid #1C2840' }}>
                        <td style={{ padding: '8px', color: '#E8E6F0' }}>{l.name}</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: '#F0EDE8' }}>R{v.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#93A4BC' }}>{pct}%</td>
                      </tr>
                    )
                  })}
                  <tr style={{ borderTop: '2px solid #2A3A58' }}>
                    <td style={{ padding: '8px', fontWeight: 700, color: '#C4A04E' }}>TOTAL</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 800, color: '#C4A04E' }}>R{totalLocationValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#C4A04E' }}>100%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Supplier / PO overview */}
            <div style={{ background: '#141E2C', borderRadius: 12, border: '1px solid #24304A', padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#F0EDE8' }}>Deliveries &amp; Suppliers</h3>
                <Link href="/inv/purchases" style={{ fontSize: 13, color: '#93A4BC', textDecoration: 'none' }}>Receive stock -&gt;</Link>
              </div>
              {!data.purchaseOrders || (data.purchaseOrders.overdue.length === 0 && data.purchaseOrders.recent.length === 0) ? (
                <p style={{ margin: 0, fontSize: 13, color: '#6B7A92' }}>No purchase orders yet.</p>
              ) : (
                <>
                  {data.purchaseOrders.overdue.length > 0 && (
                    <p style={{ margin: '0 0 8px', fontSize: 11.5, fontWeight: 700, color: '#F87171', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {data.purchaseOrders.overdue.length} overdue delivery{data.purchaseOrders.overdue.length > 1 ? 's' : ''}
                    </p>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                    {data.purchaseOrders.recent.map(po => (
                      <Link key={po.id} href={`/admin/operations/purchase-orders/${po.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#0F1729', borderRadius: 8, textDecoration: 'none' }}>
                        <span style={{ fontSize: 13, color: '#E8E6F0' }}>{po.supplierName}</span>
                        <Badge variant={po.status === 'received' ? 'success' : po.status === 'ordered' ? 'info' : 'warning'}>{po.status}</Badge>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Recent activity */}
          <div style={{ background: '#141E2C', borderRadius: 12, border: '1px solid #24304A', padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#F0EDE8' }}>Recent Stock Movement</h3>
              <Link href="/inv/activity" style={{ fontSize: 13, color: '#93A4BC', textDecoration: 'none' }}>Full activity -&gt;</Link>
            </div>
            {data.recent.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: '#6B7A92' }}>No stock movements yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
                {data.recent.map(r => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: '#0F1729', borderRadius: 8 }}>
                    <span style={{ fontSize: 13, color: '#E8E6F0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.productName}</span>
                    <span style={{ fontSize: 12, color: '#7A8CA8', textTransform: 'capitalize' }}>{r.transactionType.replace(/_/g, ' ')}</span>
                    <span style={{ fontWeight: 700, fontSize: 13, color: r.quantity < 0 ? '#F87171' : '#34D399' }}>
                      {r.quantity > 0 ? '+' : ''}{r.quantity}
                    </span>
                    <span style={{ fontSize: 11.5, color: '#5A6B82' }}>
                      {new Date(r.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}