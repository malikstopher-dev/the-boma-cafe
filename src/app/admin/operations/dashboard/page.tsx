'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Button from '@/components/admin/design-system/Button'
import Badge from '@/components/admin/design-system/Badge'
import EmptyState from '@/components/admin/design-system/EmptyState'
import styles from '@/components/admin/design-system/DesignSystem.module.css'

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

type InventoryTypeFilter = '' | 'FOOD' | 'BEVERAGE' | 'CLEANING' | 'PACKAGING' | 'GENERAL'

const typeTabs: { label: string; value: InventoryTypeFilter }[] = [
  { label: 'All', value: '' },
  { label: 'Food', value: 'FOOD' },
  { label: 'Beverage', value: 'BEVERAGE' },
  { label: 'Cleaning', value: 'CLEANING' },
  { label: 'Packaging', value: 'PACKAGING' },
  { label: 'General', value: 'GENERAL' },
]

const kpiColors = ['#D4A843', '#60A5FA', '#FBBF24', '#F87171', '#34D399', '#A78BFA', '#F87171', '#38BDF8']

export default function InventoryDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeType, setActiveType] = useState<InventoryTypeFilter>('')

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const typeParam = activeType ? `&inventory_type=${activeType}` : ''
      const res = await fetch(`/api/inventory/dashboard?section=combined&location_id=main&limit=10&days=30${typeParam}`)
      const json = await res.json()
      setData(json.data)
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [activeType])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [fetchData])

  if (isLoading) {
    return (
      <AdminPage title="Inventory Dashboard" description="Stock overview and KPIs">
        <div className={styles.kpiGrid} style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={`${styles.skeleton} ${styles.skeletonCard}`} />
          ))}
        </div>
      </AdminPage>
    )
  }

  if (!data) {
    return (
      <AdminPage title="Inventory Dashboard" description="Stock overview and KPIs">
        <EmptyState title="Could not load dashboard" description="Check your connection and try again" />
      </AdminPage>
    )
  }

  const { summary, alerts, recent, fastMovers, slowMovers, todayTransactions, purchaseOrders } = data

  const cards = [
    { label: 'Inventory Value', value: `R${summary.inventoryValue.toLocaleString()}`, color: '#D4A843' },
    { label: 'Products', value: summary.totalProducts.toString(), color: '#60A5FA' },
    { label: 'Low Stock', value: summary.lowStockCount.toString(), color: '#FBBF24' },
    { label: 'Out of Stock', value: summary.outOfStockCount.toString(), color: '#F87171' },
    { label: "Today's Purchases", value: summary.todayPurchases.toString(), color: '#34D399' },
    { label: "Today's Sales", value: summary.todaySales.toString(), color: '#A78BFA' },
    { label: "Today's Loss", value: summary.todayLoss.toString(), color: '#F87171' },
    { label: "Today's Txns", value: summary.todayTransactions.toString(), color: '#38BDF8' },
  ]

  const poCards = purchaseOrders ? [
    { label: 'Open POs', value: purchaseOrders.openCount.toString(), color: '#D4A843' },
    { label: 'Overdue', value: purchaseOrders.overdueCount.toString(), color: '#F87171' },
  ] : []

  const allCards = [...cards, ...poCards]

  const sectionCard: React.CSSProperties = {
    background: '#12121A',
    border: '1px solid #1E1E2A',
    borderRadius: 12,
    padding: 20,
  }

  return (
    <AdminPage title="Inventory Dashboard" description="Stock overview and KPIs" actions={<Button onClick={fetchData} variant="secondary" size="sm">Refresh</Button>}>
      <div className={styles.tabBar} style={{ marginBottom: 24 }}>
        {typeTabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveType(tab.value)}
            className={`${styles.tabItem} ${activeType === tab.value ? styles.tabItemActive : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.kpiGrid} style={{ marginBottom: 24 }}>
        {allCards.map((card, i) => (
          <div key={card.label} className={styles.statCard}>
            <span className={styles.statCardLabel}>{card.label}</span>
            <span className={styles.statCardValue}>{card.value}</span>
          </div>
        ))}
      </div>

      <div className={styles.twoCol} style={{ marginBottom: 24 }}>
        <div style={sectionCard}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#F0EDE8', marginBottom: 12 }}>Alerts ({alerts.length})</h3>
          {alerts.length === 0 ? (
            <p style={{ fontSize: 13, color: '#5A5666' }}>No alerts</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
              {alerts.slice(0, 10).map(a => (
                <div key={a.productId} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 13,
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: '#0E0E16',
                }}>
                  <span style={{ color: '#F0EDE8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.productName}</span>
                  <Badge variant={a.type === 'negative_balance' || a.type === 'out_of_stock' ? 'danger' : 'warning'}>
                    {a.type.replace('_', ' ')} ({a.currentBalance})
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={sectionCard}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#F0EDE8', marginBottom: 12 }}>Today's Transactions</h3>
          {todayTransactions.length === 0 ? (
            <p style={{ fontSize: 13, color: '#8A8694' }}>No transactions today</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
              {todayTransactions.map(t => (
                <div key={t.type} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 13,
                  padding: '8px 12px',
                  background: '#0E0E16',
                  borderRadius: 8,
                }}>
                  <span style={{ color: '#8A8694', textTransform: 'capitalize' }}>{t.type.replace('_', ' ')}</span>
                  <span style={{ fontWeight: 600, color: '#F0EDE8' }}>{t.count} ({t.totalQuantity > 0 ? '+' : ''}{t.totalQuantity})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.twoCol} style={{ marginBottom: 24 }}>
        <div style={sectionCard}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#F0EDE8', marginBottom: 12 }}>Recent Activity</h3>
          {recent.length === 0 ? (
            <p style={{ fontSize: 13, color: '#8A8694' }}>No recent activity</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
              {recent.map(r => (
                <div key={r.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 13,
                  padding: '8px 12px',
                  background: '#0E0E16',
                  borderRadius: 8,
                }}>
                  <span style={{ color: '#F0EDE8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.productName}</span>
                  <span style={{ fontSize: 12, color: '#5A566C', textTransform: 'capitalize', marginLeft: 8 }}>{r.transactionType}</span>
                  <span style={{ marginLeft: 8, fontWeight: 600, color: r.quantity < 0 ? '#F87171' : '#34D399' }}>
                    {r.quantity > 0 ? '+' : ''}{r.quantity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={sectionCard}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#F0EDE8', marginBottom: 12 }}>Fast Movers</h3>
          {fastMovers.length === 0 ? (
            <p style={{ fontSize: 13, color: '#8A8694' }}>No data</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
              {fastMovers.map((m, i) => (
                <div key={m.productId} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 13,
                  padding: '8px 12px',
                  background: '#0E0E16',
                  borderRadius: 8,
                }}>
                  <span style={{ color: '#F0EDE8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ color: '#5A566C', marginRight: 8 }}>#{i + 1}</span>{m.productName}
                  </span>
                  <span style={{ fontWeight: 600, color: '#F0EDE8' }}>{m.totalSold}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.twoCol} style={{ marginBottom: 24 }}>
        <div style={sectionCard}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#F0EDE8', marginBottom: 12 }}>Slow Movers</h3>
          {slowMovers.length === 0 ? (
            <p style={{ fontSize: 13, color: '#8A8694' }}>No data</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
              {slowMovers.map((m, i) => (
                <div key={m.productId} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 13,
                  padding: '8px 12px',
                  background: '#0E0E16',
                  borderRadius: 8,
                }}>
                  <span style={{ color: '#F0EDE8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ color: '#5A566C', marginRight: 8 }}>#{i + 1}</span>{m.productName}
                  </span>
                  <span style={{ fontWeight: 600, color: '#F0EDE8' }}>{m.totalSold}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={sectionCard}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#F0EDE8', marginBottom: 12 }}>Purchase Orders</h3>
          {!purchaseOrders || (purchaseOrders.overdue.length === 0 && purchaseOrders.recent.length === 0) ? (
            <p style={{ fontSize: 13, color: '#8A8694' }}>No purchase orders</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
              {purchaseOrders.overdue.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#F87171', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Overdue Deliveries
                  </p>
                  {purchaseOrders.overdue.map(po => (
                    <a
                      key={po.id}
                      href={`/admin/operations/purchase-orders/${po.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: 13,
                        padding: '8px 12px',
                        background: 'rgba(248,113,113,0.08)',
                        borderRadius: 8,
                        marginBottom: 4,
                        textDecoration: 'none',
                      }}
                    >
                      <span style={{ color: '#F0EDE8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{po.supplierName}</span>
                      <Badge variant="danger">Overdue</Badge>
                    </a>
                  ))}
                </div>
              )}
              {purchaseOrders.recent.map(po => (
                <a
                  key={po.id}
                  href={`/admin/operations/purchase-orders/${po.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 13,
                    padding: '8px 12px',
                    background: '#0E0E16',
                    borderRadius: 8,
                    textDecoration: 'none',
                  }}
                >
                  <span style={{ color: '#F0EDE8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{po.supplierName}</span>
                  <Badge variant={po.status === 'received' ? 'success' : po.status === 'ordered' ? 'info' : 'warning'}>{po.status}</Badge>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.twoCol}>
        <div style={sectionCard}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#F0EDE8', marginBottom: 12 }}>Quick Actions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Link href="/admin/operations/products"><Button variant="secondary" style={{ width: '100%' }} size="sm">Products</Button></Link>
            <Link href="/admin/operations/transactions"><Button variant="secondary" style={{ width: '100%' }} size="sm">Transactions</Button></Link>
            <Link href="/admin/operations/imports"><Button variant="secondary" style={{ width: '100%' }} size="sm">Imports</Button></Link>
            <Link href="/admin/operations/reports"><Button variant="secondary" style={{ width: '100%' }} size="sm">Reports</Button></Link>
            <Link href="/admin/operations/purchase-orders"><Button variant="secondary" style={{ width: '100%' }} size="sm">Purchase Orders</Button></Link>
          </div>
        </div>
      </div>
    </AdminPage>
  )
}