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

interface OrderRecord {
  id: string; order_ref: string | null; customer_name: string; order_type: string
  total: number; status: string; created_at: string; station?: string
  preparation_time_minutes: number | null; waiter_name?: string; payment_status?: string
}

function QuickAction({ href, icon, label, color }: { href: string; icon: string; label: string; color: string }) {
  return (
    <Link href={href} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 16px', borderRadius: 12,
      background: '#FFFFFF', border: '1px solid #E5E7EB',
      textDecoration: 'none', color: '#0F172A',
      fontWeight: 600, fontSize: 14,
      transition: 'all 0.15s ease',
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.boxShadow = `0 4px 12px ${color}20` }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none' }}
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
      padding: '10px 0', borderBottom: '1px solid #F1F3F7',
      textDecoration: 'none', color: '#0F172A',
      transition: 'background 0.1s',
    }}>
      <OrderStatusBadge status={order.status} />
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: '#0F172A', flex: 1 }}>
        {order.order_ref || order.id.slice(0, 8)}
      </span>
      <span style={{ fontSize: 13, color: '#94A3B8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {order.customer_name}
      </span>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>
        R{order.total?.toFixed(0)}
      </span>
      <span style={{ fontSize: 12, color: '#94A3B8', minWidth: 44, textAlign: 'right' }}>{time}</span>
    </Link>
  )
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
  }, [])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
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

      {/* Quick Actions */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Quick Actions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          <QuickAction href="/admin/orders" icon="📋" label="Orders" color="#3B82F6" />
          <QuickAction href="/admin/kitchen" icon="👨‍🍳" label="Kitchen" color="#F59E0B" />
          <QuickAction href="/admin/bar" icon="🍸" label="Bar" color="#8B5CF6" />
          <QuickAction href="/admin/menu" icon="🍽️" label="Menu" color="#10B981" />
          <QuickAction href="/admin/events" icon="📅" label="Events" color="#06B6D4" />
          <QuickAction href="/admin/promotions" icon="🎉" label="Promotions" color="#F59E0B" />
        </div>
      </div>

      {/* Two-column: Recent Orders + Waiter Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16, marginBottom: 24 }}>
        {/* Recent Orders */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A' }}>Recent Orders</h2>
            <Link href="/admin/orders" style={{ fontSize: 13, fontWeight: 500, color: '#0F766E', textDecoration: 'none' }}>View all →</Link>
          </div>
          {recentOrders.length > 0 ? (
            <div>
              {recentOrders.slice(0, 8).map((o, i) => <RecentOrderRow key={o.id || i} order={o} />)}
            </div>
          ) : (
            <p style={{ color: '#94A3B8', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>No recent orders</p>
          )}
        </div>

        {/* Waiter Stats */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', marginBottom: 16 }}>Orders by Waiter</h2>
          {waiterStats.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {waiterStats.slice(0, 8).map((w, i) => {
                const maxCount = Math.max(...waiterStats.map(s => s.count))
                const pct = maxCount > 0 ? (w.count / maxCount) * 100 : 0
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          width: 28, height: 28, borderRadius: 8,
                          background: '#ECFDF5', color: '#0F766E',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 12, flexShrink: 0,
                        }}>{w.name.charAt(0).toUpperCase()}</span>
                        <span style={{ fontWeight: 500, color: '#0F172A', fontSize: 14 }}>{w.name}</span>
                      </span>
                      <span style={{ fontWeight: 700, color: '#0F766E', fontSize: 14 }}>{w.count}</span>
                    </div>
                    <div style={{ height: 4, background: '#F1F3F7', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: '#0F766E', borderRadius: 2, transition: 'width 0.3s ease' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p style={{ color: '#94A3B8', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>No waiter data</p>
          )}
        </div>
      </div>

      {/* CMS Stats */}
      <div>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Content Overview</h2>
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
