'use client'

import { useState, useEffect } from 'react'
import BackButton from '@/components/admin/BackButton'
import { cmsService } from '@/lib/client-cms'

interface OrderRecord {
  id: string; order_ref: string | null; customer_name: string; order_type: string
  total: number; status: string; created_at: string; station?: string
  preparation_time_minutes: number | null; waiter_name?: string; payment_status?: string
  cancellation_reason?: string | null
}

function StatCard({ label, value, icon, color, sub }: { label: string; value: string | number; icon: string; color: string; sub?: string }) {
  return (
    <div style={{ background: 'var(--white)', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: `4px solid ${color}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '1.75rem' }}>{icon}</span>
        <span style={{ padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 600, background: `${color}18`, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--dark-brown)', lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>{sub}</div>}
    </div>
  )
}

export default function AdminDashboard() {
  const [menuItems, setMenuItems] = useState(0)
  const [events, setEvents] = useState(0)
  const [promotions, setPromotions] = useState(0)
  const [inquiries, setInquiries] = useState(0)
  const [waiterStats, setWaiterStats] = useState<{ name: string; count: number }[]>([])
  const [orderStats, setOrderStats] = useState<{ todaySales: number; kitchenOrders: number; barOrders: number; avgPrepTime: number; cancelledOrders: number; activeOrders: number; completedToday: number } | null>(null)
  const [recentOrders, setRecentOrders] = useState<OrderRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [items, evts, promos, inqs] = await Promise.all([
          cmsService.getMenuItems(), cmsService.getEvents(), cmsService.getPromotions(), cmsService.getInquiries()
        ])
        setMenuItems(items.length); setEvents(evts.length); setPromotions(promos.length); setInquiries(inqs.length)
      } catch (error) { console.error('Error loading dashboard stats:', error) }
      finally { setIsLoading(false) }
    }
    loadStats()

    fetch('/api/supabase/orders?waiter_stats=true').then(r => r.json()).then(data => { if (Array.isArray(data)) setWaiterStats(data) }).catch(() => {})

    // Fetch all orders for computed stats
    fetch('/api/supabase/orders?limit=500').then(r => r.json()).then((data: OrderRecord[]) => {
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
    }).catch(() => {})
  }, [])

  const statusColor = (s: string) => {
    const m: Record<string, string> = { pending: '#f59e0b', confirmed: '#3b82f6', preparing: '#eab308', ready: '#10b981', completed: '#6b7280', cancelled: '#ef4444', rejected: '#ef4444', served: '#06b6d4' }
    return m[s] || '#6b7280'
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <BackButton />
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--dark-brown)', marginBottom: '0.25rem' }}>Dashboard</h1>
        <p style={{ color: 'var(--text-light)', fontSize: '0.95rem' }}>Restaurant overview and quick actions</p>
      </div>

      {/* Order Statistics */}
      {orderStats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <StatCard label="Today's Sales" value={`R${orderStats.todaySales.toFixed(0)}`} icon="💰" color="#10b981" sub={`${orderStats.completedToday} completed`} />
          <StatCard label="Kitchen" value={orderStats.kitchenOrders} icon="🍳" color="#f59e0b" sub={`${orderStats.activeOrders} active`} />
          <StatCard label="Bar" value={orderStats.barOrders} icon="🍸" color="#8b5cf6" />
          <StatCard label="Avg Prep Time" value={`${orderStats.avgPrepTime}m`} icon="⏱️" color="#3b82f6" />
          <StatCard label="Cancelled" value={orderStats.cancelledOrders} icon="❌" color="#ef4444" />
        </div>
      )}

      {/* Quick Links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
        {[
          { href: '/admin/kitchen', label: 'Kitchen Orders', icon: '👨‍🍳', color: '#f59e0b' },
          { href: '/admin/bar', label: 'Bar Orders', icon: '🍸', color: '#8b5cf6' },
          { href: '/admin/orders', label: 'All Orders', icon: '📋', color: '#3b82f6' },
          { href: '/admin/menu', label: 'Manage Menu', icon: '🍽️', color: '#10b981' },
          { href: '/admin/events', label: 'Events', icon: '📅', color: '#06b6d4' },
          { href: '/admin/promotions', label: 'Promotions', icon: '🎉', color: '#f59e0b' },
        ].map(link => (
          <a key={link.href} href={link.href} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', borderRadius: '12px', background: 'var(--white)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textDecoration: 'none', color: 'var(--dark-brown)', fontWeight: 600, fontSize: '0.9rem', borderLeft: `3px solid ${link.color}`, transition: 'all 0.2s ease' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)' }}>
            <span style={{ fontSize: '1.3rem' }}>{link.icon}</span>
            {link.label}
          </a>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Orders By Waiter */}
        {waiterStats.length > 0 && (
          <div style={{ background: 'var(--white)', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--dark-brown)', marginBottom: '1rem' }}>Orders By Waiter</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {waiterStats.slice(0, 8).map((w, i) => {
                const maxCount = Math.max(...waiterStats.map(s => s.count))
                const pct = maxCount > 0 ? (w.count / maxCount) * 100 : 0
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>{w.name.charAt(0).toUpperCase()}</span>
                        <span style={{ fontWeight: 500, color: 'var(--dark-brown)', fontSize: '0.85rem' }}>{w.name}</span>
                      </span>
                      <span style={{ fontWeight: 700, color: 'var(--warm)', fontSize: '0.9rem' }}>{w.count}</span>
                    </div>
                    <div style={{ height: '4px', background: 'var(--beige-light)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, var(--primary), var(--primary-soft))', borderRadius: '2px', transition: 'width 0.3s ease' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Recent Orders */}
        {recentOrders.length > 0 && (
          <div style={{ background: 'var(--white)', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--dark-brown)', marginBottom: '1rem' }}>Recent Orders</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {recentOrders.slice(0, 8).map((o, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0', borderBottom: i < 7 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                  <span style={{ padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 700, background: `${statusColor(o.status)}18`, color: statusColor(o.status), textTransform: 'uppercase' }}>{o.status}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 600, color: 'var(--dark-brown)', flex: 1 }}>{o.order_ref || o.id.slice(0, 8)}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>{o.customer_name}</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--warm)' }}>R{o.total?.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CMS Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginTop: '2rem' }}>
        <StatCard label="Menu Items" value={menuItems} icon="🍽️" color="var(--primary)" />
        <StatCard label="Events" value={events} icon="📅" color="var(--accent)" />
        <StatCard label="Promotions" value={promotions} icon="🎉" color="var(--primary-soft)" />
        <StatCard label="Inquiries" value={inquiries} icon="✉️" color="var(--gold)" />
      </div>
    </div>
  )
}
