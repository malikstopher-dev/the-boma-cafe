'use client'

import { useState, useEffect } from 'react'
import BackButton from '@/components/admin/BackButton'
import Link from 'next/link'

interface TopProduct {
  name: string
  qty: number
  rev: number
}

interface DailyRev {
  date: string
  revenue: number
}

interface Freq {
  date: string
  count: number
}

interface AnalyticsData {
  revenue: number
  totalOrders: number
  topProducts: TopProduct[]
  orderTypeBreakdown: Record<string, number>
  dailyRevenue: DailyRev[]
  orderFrequency: Freq[]
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [days, setDays] = useState(30)

  useEffect(() => {
    setLoading(true)
    setError('')
    fetch(`/api/admin/analytics?days=${days}`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to load analytics')
        return r.json()
      })
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [days])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f0f1a', color: '#fff', padding: '3rem', textAlign: 'center' }}>
        Loading analytics...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f0f1a', color: '#ef4444', padding: '3rem', textAlign: 'center' }}>
        {error}
      </div>
    )
  }

  if (!data) return null

  const maxRev = Math.max(...data.dailyRevenue.map(d => d.revenue), 1)
  const maxFreq = Math.max(...data.orderFrequency.map(d => d.count), 1)

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f0f1a',
      color: '#fff',
      padding: '2rem',
      maxWidth: '1200px',
      margin: '0 auto',
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <BackButton />
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>📊 Analytics</h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>Period:</label>
          <select
            value={days}
            onChange={e => setDays(parseInt(e.target.value))}
            style={{
              padding: '0.4rem 0.75rem', borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '0.85rem',
            }}
          >
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
          </select>
          <Link href="/admin" style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: '#60a5fa', fontSize: '0.85rem', textDecoration: 'none' }}>
            ← Back
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: '#16162a', borderRadius: '16px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Revenue</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981' }}>R{data.revenue.toFixed(2)}</div>
        </div>
        <div style={{ background: '#16162a', borderRadius: '16px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Total Orders</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f59e0b' }}>{data.totalOrders}</div>
        </div>
        <div style={{ background: '#16162a', borderRadius: '16px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Avg Order Value</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#8b5cf6' }}>
            R{data.totalOrders > 0 ? (data.revenue / data.totalOrders).toFixed(2) : '0.00'}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Revenue Chart */}
        <div style={{ background: '#16162a', borderRadius: '16px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>Daily Revenue</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '120px' }}>
            {data.dailyRevenue.map((d, i) => (
              <div
                key={i}
                title={`${d.date}: R${d.revenue.toFixed(2)}`}
                style={{
                  flex: 1,
                  height: `${Math.max((d.revenue / maxRev) * 100, 2)}%`,
                  background: '#10b981',
                  borderRadius: '3px 3px 0 0',
                  opacity: 0.7 + 0.3 * (d.revenue / maxRev),
                  minWidth: '4px',
                }}
              />
            ))}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.5rem', textAlign: 'center' }}>
            Last {days} days
          </div>
        </div>

        {/* Order Frequency Chart */}
        <div style={{ background: '#16162a', borderRadius: '16px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>Orders per Day</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '120px' }}>
            {data.orderFrequency.map((d, i) => (
              <div
                key={i}
                title={`${d.date}: ${d.count} orders`}
                style={{
                  flex: 1,
                  height: `${Math.max((d.count / maxFreq) * 100, 2)}%`,
                  background: '#f59e0b',
                  borderRadius: '3px 3px 0 0',
                  opacity: 0.7 + 0.3 * (d.count / maxFreq),
                  minWidth: '4px',
                }}
              />
            ))}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.5rem', textAlign: 'center' }}>
            Last {days} days
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Top Products */}
        <div style={{ background: '#16162a', borderRadius: '16px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>Top Products</h3>
          {data.topProducts.length === 0 && (
            <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.85rem' }}>No completed orders yet</div>
          )}
          {data.topProducts.map((p, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span>
                <span style={{ color: 'rgba(255,255,255,0.3)', marginRight: '0.5rem' }}>#{i + 1}</span>
                {p.name}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>{p.qty} sold · R{p.rev.toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Order Type Breakdown */}
        <div style={{ background: '#16162a', borderRadius: '16px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>Order Type</h3>
          {Object.entries(data.orderTypeBreakdown).map(([type, count]) => {
            const pct = data.totalOrders > 0 ? (count / data.totalOrders * 100).toFixed(1) : '0'
            const icon = type === 'delivery' ? '🚚' : type === 'pickup' ? '📦' : '🍽️'
            return (
              <div key={type} style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                  <span>{icon} {type.charAt(0).toUpperCase() + type.slice(1)}</span>
                  <span>{count} ({pct}%)</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${pct}%`, height: '100%',
                    background: type === 'delivery' ? '#8b5cf6' : type === 'pickup' ? '#f59e0b' : '#3b82f6',
                    borderRadius: '999px',
                    transition: 'width 0.3s',
                  }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
