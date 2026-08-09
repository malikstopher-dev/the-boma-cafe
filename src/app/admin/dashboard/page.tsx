'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AdminPage from '@/components/admin/design-system/AdminPage'
import { StatCard } from '@/components/admin/design-system/Card'
import { OrderStatusBadge } from '@/components/admin/design-system/Badge'
import Button from '@/components/admin/design-system/Button'
import { SkeletonStatCard, SkeletonText, SkeletonTextSm } from '@/components/admin/design-system/Skeleton'
import { useToast } from '@/components/admin/design-system/Toast'
import { cmsService } from '@/lib/client-cms'
import styles from '@/components/admin/design-system/DesignSystem.module.css'

interface DailyStatusRow {
  locationId: string
  locationName: string
  status: string
  notes: string | null
  count: number
}

interface OrderRecord {
  id: string; order_ref: string | null; customer_name: string; order_type: string
  total: number; status: string; created_at: string; station?: string
  preparation_time_minutes: number | null; waiter_name?: string; payment_status?: string
}

const sectionRow: React.CSSProperties = {
  background: '#1E1A14',
  border: '1px solid #3A3428',
  borderRadius: 12,
  padding: 20,
}

function QuickAction({ href, icon, label, color }: { href: string; icon: string; label: string; color: string }) {
  return (
    <Link href={href} className={styles.card} style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '14px 16px',
      textDecoration: 'none',
      fontWeight: 600,
      fontSize: 14,
      color: '#F0EBE3',
    }}
    onMouseEnter={e => {
      e.currentTarget.style.borderColor = color
      e.currentTarget.style.boxShadow = `0 4px 12px ${color}20`
    }}
    onMouseLeave={e => {
      e.currentTarget.style.borderColor = '#3A3428'
      e.currentTarget.style.boxShadow = 'none'
    }}
    >
      <span style={{ fontSize: 20 }}>{icon}</span>
      {label}
    </Link>
  )
}

function RecentOrderRow({ order }: { order: OrderRecord }) {
  const time = order.created_at ? new Date(order.created_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }) : ''
  return (
    <Link href="/admin/orders" style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 0', borderBottom: '1px solid #3A3428',
      textDecoration: 'none',
      transition: 'background 0.1s',
    }}>
      <OrderStatusBadge status={order.status} />
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: '#F0EBE3', flex: 1 }}>
        {order.order_ref || order.id.slice(0, 8)}
      </span>
      <span style={{ fontSize: 13, color: '#A09888', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {order.customer_name}
      </span>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#C8A04E', fontVariantNumeric: 'tabular-nums' }}>
        R{order.total?.toFixed(0)}
      </span>
      <span style={{ fontSize: 12, color: '#6B6358', minWidth: 44, textAlign: 'right' }}>{time}</span>
    </Link>
  )
}

const sectionCard: React.CSSProperties = {
  background: '#1E1A14',
  border: '1px solid #3A3428',
  borderRadius: 12,
  padding: 20,
}

const sectionHeading: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: '#F0EBE3',
}

const sectionLabel: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: '#A09888',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 12,
}

export default function AdminDashboard() {
  const [menuItems, setMenuItems] = useState(0)
  const [events, setEvents] = useState(0)
  const [promotions, setPromotions] = useState(0)
  const [inquiries, setInquiries] = useState(0)
  const [waiterStats, setWaiterStats] = useState<{ name: string; count: number }[]>([])
  const [orderStats, setOrderStats] = useState<{
    todaySales: number; kitchenOrders: number; barOrders: number
    avgPrepTime: number; cancelledOrders: number; activeOrders: number; completedToday: number
  } | null>(null)
  const [recentOrders, setRecentOrders] = useState<OrderRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [dailyStatus, setDailyStatus] = useState<DailyStatusRow[]>([])
  const { error: showError } = useToast()

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [items, evts, promos, inqs] = await Promise.all([
          cmsService.getMenuItems(), cmsService.getEvents(), cmsService.getPromotions(), cmsService.getInquiries()
        ])
        setMenuItems(items.length); setEvents(evts.length); setPromotions(promos.length); setInquiries(inqs.length)
      } catch {
        showError('Failed to load CMS stats')
      } finally {
        setIsLoading(false)
      }
    }
    loadStats()

    fetch('/api/supabase/orders?waiter_stats=true')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setWaiterStats(data) })
      .catch(() => {})

    fetch('/api/supabase/orders?limit=500')
      .then(r => r.json())
      .then((data: OrderRecord[]) => {
        if (!Array.isArray(data)) return
        const today = new Date().toISOString().split('T')[0]
        const todayOrders = data.filter(o => o.created_at?.startsWith(today))
        const kitchenOrders = todayOrders.filter(o => o.station === 'kitchen' || (!o.station && o.order_type !== 'delivery'))
        const barOrders = todayOrders.filter(o => o.station === 'bar')
        const prepTimes = todayOrders.filter(o => o.preparation_time_minutes && o.preparation_time_minutes > 0).map(o => o.preparation_time_minutes!)
        const avgPrep = prepTimes.length > 0 ? Math.round(prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length) : 0

        setOrderStats({
          todaySales: todayOrders.reduce((s, o) => s + (o.total || 0), 0),
          kitchenOrders: kitchenOrders.length,
          barOrders: barOrders.length,
          avgPrepTime: avgPrep,
          cancelledOrders: todayOrders.filter(o => o.status === 'cancelled').length,
          activeOrders: todayOrders.filter(o => ['pending', 'confirmed', 'preparing', 'packing'].includes(o.status)).length,
          completedToday: todayOrders.filter(o => o.status === 'completed').length,
        })
        setRecentOrders(data.slice(0, 10))
      })
      .catch(() => {})
      .finally(() => setOrdersLoading(false))

    const today = new Date().toISOString().split('T')[0]
    Promise.all([
      fetch('/api/inventory/stock-counts').then(r => r.json()).catch(() => []),
      fetch('/api/inventory/locations').then(r => r.json()).catch(() => []),
    ]).then(([countsRes, locationsRes]) => {
      const counts = Array.isArray(countsRes) ? countsRes : []
      const locations = Array.isArray(locationsRes) ? locationsRes : []
      const nameById = new Map(locations.map((l: { id: string; name: string }) => [l.id, l.name]))
      const byLoc = new Map<string, DailyStatusRow>()
      for (const sc of counts) {
        const isDaily = typeof sc.notes === 'string' && sc.notes.startsWith('daily:')
        if (!isDaily) continue
        const locId = sc.location_id
        const row = byLoc.get(locId) ?? {
          locationId: locId,
          locationName: nameById.get(locId) ?? 'Location',
          status: sc.status,
          notes: sc.notes,
          count: 0,
        }
        row.count += 1
        if (['in_progress', 'submitted'].includes(sc.status) || row.status === 'cancelled' || row.status === 'approved') {
          row.status = sc.status
        }
        byLoc.set(locId, row)
      }
      setDailyStatus([...byLoc.values()].sort((a, b) => a.locationName.localeCompare(b.locationName)))
    })
  }, [])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const weeklyNumber = () => {
    const now = new Date()
    const jan1 = new Date(now.getFullYear(), 0, 1)
    const monday = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); const dow = (x.getDay() + 6) % 7; x.setDate(x.getDate() - dow); return x }
    const first = monday(jan1)
    return Math.max(1, Math.floor((monday(now).getTime() - first.getTime()) / (7 * 86400000)) + 1)
  }

  return (
    <AdminPage
      title={`${greeting()}, Admin`}
      description="Here's what's happening at The Boma Café today"
      actions={
        <Link href="/admin/orders">
          <Button variant="primary" size="md">+ New Order</Button>
        </Link>
      }
    >
      {/* Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 24,
      }}>
        {ordersLoading ? (
          <>
            <SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard />
          </>
        ) : orderStats ? (
          <>
            <StatCard value={`R${orderStats.todaySales.toFixed(0)}`} label="Today's Revenue" trend={`${orderStats.completedToday} completed`} />
            <StatCard value={orderStats.activeOrders} label="Active Orders" trend={`${orderStats.kitchenOrders} kitchen, ${orderStats.barOrders} bar`} />
            <StatCard value={`${orderStats.avgPrepTime}m`} label="Avg Prep Time" />
            <StatCard value={orderStats.cancelledOrders} label="Cancelled" trendDirection={orderStats.cancelledOrders > 0 ? 'down' : undefined} />
          </>
        ) : null}
      </div>

      {/* Operations & Stock — highlighted daily stock banner */}
      <div style={{
        marginBottom: 24,
        background: 'linear-gradient(135deg, #2A2015 0%, #1E1A14 60%)',
        border: '1px solid rgba(200,160,78,0.5)',
        borderLeft: '5px solid #C8A04E',
        borderRadius: 12,
        padding: '18px 20px',
        boxShadow: '0 6px 24px rgba(200,160,78,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#F0EBE3' }}>📋 Daily Stock Input — Operations & Stock</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#A09888' }}>
              Punch in today's stock per location · <Link href="/admin/operations/weekly" style={{ color: '#C8A04E', textDecoration: 'none', fontWeight: 600 }}>Week {weeklyNumber()}</Link> ·{' '}
              <Link href="/admin/operations/gas" style={{ color: '#C8A04E', textDecoration: 'none', fontWeight: 600 }}>Gas Tracker</Link>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link href="/admin/operations/daily-stock">
              <Button variant="primary" size="md">Open Daily Stock Input</Button>
            </Link>
            <Link href="/admin/operations">
              <Button variant="secondary" size="md">Opening Checklist</Button>
            </Link>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          {dailyStatus.length > 0 ? dailyStatus.map(row => (
            <div key={row.locationId} style={{
              background: 'rgba(200,160,78,0.07)', border: '1px solid rgba(200,160,78,0.25)',
              borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{
                width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                background: row.status === 'approved' ? '#6BBD59' : row.status === 'submitted' ? '#E8B93C' : row.status === 'in_progress' ? '#5A9EE6' : '#E85454',
              }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#F0EBE3' }}>{row.locationName}</span>
              <span style={{ fontSize: 11.5, color: '#A09888', marginLeft: 'auto' }}>
                {row.status === 'approved' ? 'Done' : row.status === 'submitted' ? 'Submitted' : row.status === 'in_progress' ? 'Counting' : '—'}
              </span>
            </div>
          )) : (
            <div style={{ fontSize: 12.5, color: '#8C8275' }}>
              No daily stock entry yet today — open <Link href="/admin/operations/daily-stock" style={{ color: '#C8A04E' }}>Daily Stock Input</Link> to start.
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions — branded command banner */}
      <div style={{
        marginBottom: 24,
        background: 'linear-gradient(135deg, #1E1A14 0%, #242018 100%)',
        border: '1px solid #3A3428',
        borderLeft: '4px solid #C8A04E',
        borderRadius: 12,
        padding: '18px 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#F0EBE3' }}>⚡ Command Center</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#8C8275' }}>Jump straight into the screens you use most</p>
          </div>
          <Link href="/admin/orders">
            <Button variant="primary" size="md">+ New Order</Button>
          </Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          <QuickAction href="/admin/operations/daily-stock" icon="📋" label="Operations & Stock" color="#C8A04E" />
          <QuickAction href="/admin/orders" icon="📋" label="Orders" color="#60A5FA" />
          <QuickAction href="/admin/kitchen" icon="👨‍🍳" label="Kitchen" color="#FBBF24" />
          <QuickAction href="/admin/bar" icon="🍸" label="Bar" color="#A78BFA" />
          <QuickAction href="/admin/menu" icon="🍽️" label="Menu" color="#34D399" />
          <QuickAction href="/admin/events" icon="📅" label="Events" color="#38BDF8" />
          <QuickAction href="/admin/promotions" icon="🎉" label="Promotions" color="#FBBF24" />
        </div>
      </div>

      {/* Two-column: Recent Orders + Waiter Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16, marginBottom: 24 }}>
        {/* Recent Orders */}
        <div style={sectionRow}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={sectionHeading}>Recent Orders</h2>
            <Link href="/admin/orders" style={{ fontSize: 13, fontWeight: 500, color: '#C8A04E', textDecoration: 'none' }}>View all →</Link>
          </div>
          {recentOrders.length > 0 ? (
            <div>
              {recentOrders.slice(0, 8).map((o, i) => <RecentOrderRow key={o.id || i} order={o} />)}
            </div>
          ) : (
            <p style={{ color: '#6B6358', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>No recent orders</p>
          )}
        </div>

        {/* Waiter Stats */}
        <div style={sectionRow}>
          <h2 style={{ ...sectionHeading, marginBottom: 16 }}>Orders by Waiter</h2>
          {waiterStats.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {(() => {
                const maxCount = Math.max(...waiterStats.map(s => s.count), 1)
                return waiterStats.slice(0, 8).map((w, i) => {
                  const pct = Math.round((w.count / maxCount) * 100)
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            width: 28, height: 28, borderRadius: 8,
                            background: 'rgba(200,160,78,0.12)', color: '#C8A04E',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: 12, flexShrink: 0,
                          }}>{w.name.charAt(0).toUpperCase()}</span>
                          <span style={{ fontWeight: 500, color: '#F0EBE3', fontSize: 14 }}>{w.name}</span>
                        </span>
                        <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                          <span style={{ fontWeight: 700, color: '#C8A04E', fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>{w.count}</span>
                          <span style={{ fontSize: 11, color: '#8C8275', fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
                        </span>
                      </div>
                      <div style={{ height: 8, background: '#2A261E', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: 'linear-gradient(90deg, #C8A04E 0%, #E5C47A 100%)',
                          borderRadius: 4,
                          transition: 'width 0.4s ease',
                          minWidth: pct > 0 ? '4px' : 0,
                        }} />
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          ) : (
            <p style={{ color: '#A09888', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>No waiter data</p>
          )}
        </div>
      </div>

      {/* CMS Stats */}
      <div>
        <h2 style={sectionLabel}>Content Overview</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <StatCard value={menuItems} label="Menu Items" />
          <StatCard value={events} label="Events" />
          <StatCard value={promotions} label="Promotions" />
          <StatCard value={inquiries} label="Inquiries" />
        </div>
      </div>
    </AdminPage>
  )
}