'use client'

import { useState, useEffect } from 'react'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Badge from '@/components/admin/design-system/Badge'
import styles from '@/components/admin/design-system/DesignSystem.module.css'

type DepletionRow = {
  productId: string
  productName: string
  sku: string | null
  barcode: string | null
  inventoryType: string
  currentBalance: number
  dailyUsage: number
  daysRemaining: number | null
  projectedStockoutDate: string | null
  minLevel: number
  leadTimeDays: number
  urgency: 'out_of_stock' | 'critical' | 'warning' | 'ok'
}

type DayPattern = {
  dayOfWeek: number
  dayName: string
  totalQuantity: number
  sharePercent: number
  multiplier: number
}

type HourPattern = {
  hour: number
  totalQuantity: number
}

type ConsumptionPattern = {
  totalConsumed: number
  averagePerDay: number
  busiestDay: string
  peakHour: number
  daysAnalyzed: number
  dayOfWeek: DayPattern[]
  hourly: HourPattern[]
}

const urgencyBadgeVariant: Record<string, 'success' | 'warning' | 'info' | 'danger'> = {
  out_of_stock: 'danger',
  critical: 'danger',
  warning: 'info',
  ok: 'success',
}

const TYPE_TABS = [
  { value: '', label: 'All' },
  { value: 'FOOD', label: 'Food' },
  { value: 'BEVERAGE', label: 'Beverage' },
  { value: 'CLEANING', label: 'Cleaning' },
  { value: 'PACKAGING', label: 'Packaging' },
  { value: 'GENERAL', label: 'General' },
]

const kpiCard: React.CSSProperties = {
  background: '#1E1A14',
  border: '1px solid #3A3428',
  borderRadius: 12,
  padding: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
}

const chartCard: React.CSSProperties = {
  background: '#1E1A14',
  border: '1px solid #3A3428',
  borderRadius: 12,
  padding: 20,
}

export default function ForecastPage() {
  const [rows, setRows] = useState<DepletionRow[]>([])
  const [pattern, setPattern] = useState<ConsumptionPattern | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [typeTab, setTypeTab] = useState('')
  const [showHealthy, setShowHealthy] = useState(false)

  useEffect(() => {
    fetchForecast()
    fetchPattern()
  }, [])

  async function fetchForecast() {
    setIsLoading(true)
    try {
      const res = await fetch('/api/inventory/forecast/depletion?location_id=main')
      const json = await res.json()
      setRows(json.data ?? [])
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchPattern() {
    try {
      const res = await fetch('/api/inventory/forecast/patterns?location_id=main&days=60')
      const json = await res.json()
      setPattern(json.data ?? null)
    } catch {
      // ignore
    }
  }

  const filtered = rows.filter(r => {
    if (typeTab && r.inventoryType !== typeTab) return false
    if (!showHealthy && r.urgency === 'ok') return false
    return true
  })

  const outOfStock = rows.filter(r => r.urgency === 'out_of_stock').length
  const critical = rows.filter(r => r.urgency === 'critical').length
  const warning = rows.filter(r => r.urgency === 'warning').length
  const maxHour = pattern ? Math.max(...pattern.hourly.map(h => h.totalQuantity), 1) : 1

  return (
    <AdminPage
      title="Forecasting"
      description="Predicted stock-out dates and consumption patterns"
      actions={
        <button
          onClick={() => { fetchForecast(); fetchPattern() }}
          style={{ fontSize: 13, color: '#D4A843', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
        >
          Refresh
        </button>
      }
    >
      <div style={{ padding: '0 24px' }}>
        <div className={styles.kpiGrid} style={{ marginBottom: 24 }}>
          <div style={kpiCard}>
            <p style={{ fontSize: 12, color: '#A09888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, fontFamily: 'Inter, sans-serif' }}>Products Tracked</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#F0EBE3', fontFamily: 'Inter, sans-serif' }}>{rows.length}</p>
          </div>
          <div style={kpiCard}>
            <p style={{ fontSize: 12, color: '#A09888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, fontFamily: 'Inter, sans-serif' }}>Out of Stock</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#E85454', fontFamily: 'Inter, sans-serif' }}>{outOfStock}</p>
          </div>
          <div style={kpiCard}>
            <p style={{ fontSize: 12, color: '#A09888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, fontFamily: 'Inter, sans-serif' }}>Critical (within lead time)</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#FF9800', fontFamily: 'Inter, sans-serif' }}>{critical}</p>
          </div>
          <div style={kpiCard}>
            <p style={{ fontSize: 12, color: '#A09888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, fontFamily: 'Inter, sans-serif' }}>Low Stock</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#C8A04E', fontFamily: 'Inter, sans-serif' }}>{warning}</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div className={styles.tabBar}>
            {TYPE_TABS.map(t => (
              <button
                key={t.value}
                onClick={() => setTypeTab(t.value)}
                className={`${styles.tabItem} ${typeTab === t.value ? styles.tabItemActive : ''}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#8A8694', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showHealthy}
              onChange={e => setShowHealthy(e.target.checked)}
              style={{ accentColor: '#C8A04E' }}
            />
            Show healthy stock
          </label>
        </div>

        {isLoading ? (
          <div style={{ color: '#A09888', padding: '48px 0', textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>Calculating forecast...</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: '#6B6358', padding: '48px 0', textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>No products match the current filters.</div>
        ) : (
          <div className={styles.dataTableWrapper} style={{ marginBottom: 32 }}>
            <table className={styles.dataTableElement}>
              <thead>
                <tr>
                  <th className={styles.dataTableHeader}>Product</th>
                  <th className={styles.dataTableHeader}>Type</th>
                  <th className={styles.dataTableHeader} style={{ textAlign: 'right' }}>Balance</th>
                  <th className={styles.dataTableHeader} style={{ textAlign: 'right' }}>Daily Usage</th>
                  <th className={styles.dataTableHeader} style={{ textAlign: 'right' }}>Days Left</th>
                  <th className={styles.dataTableHeader}>Projected Stock-out</th>
                  <th className={styles.dataTableHeader} style={{ textAlign: 'right' }}>Min Level</th>
                  <th className={styles.dataTableHeader}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.productId} className={styles.dataTableRow}>
                    <td className={styles.dataTableCell}>
                      <p style={{ fontWeight: 500, color: '#F0EBE3' }}>{r.productName}</p>
                      {r.sku && <p style={{ fontSize: 11, color: '#6B6358', marginTop: 2 }}>SKU: {r.sku}</p>}
                    </td>
                    <td className={styles.dataTableCell} style={{ color: '#A09888' }}>{r.inventoryType}</td>
                    <td className={styles.dataTableCell} style={{ textAlign: 'right', fontWeight: 600, color: '#F0EBE3' }}>{r.currentBalance.toFixed(2)}</td>
                    <td className={styles.dataTableCell} style={{ textAlign: 'right', color: '#A09888' }}>{r.dailyUsage.toFixed(2)}</td>
                    <td className={styles.dataTableCell} style={{ textAlign: 'right', color: '#A09888' }}>
                      {r.daysRemaining !== null ? r.daysRemaining.toFixed(1) : '—'}
                    </td>
                    <td className={styles.dataTableCell} style={{ color: '#A09888' }}>
                      {r.projectedStockoutDate ?? '—'}
                    </td>
                    <td className={styles.dataTableCell} style={{ textAlign: 'right', color: '#A09888' }}>{r.minLevel.toFixed(2)}</td>
                    <td className={styles.dataTableCell}>
                      <Badge variant={urgencyBadgeVariant[r.urgency] ?? 'info'}>
                        {r.urgency === 'out_of_stock' ? 'Out of stock' : r.urgency === 'critical' ? 'Critical' : r.urgency === 'warning' ? 'Low' : 'Healthy'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pattern && pattern.totalConsumed > 0 && (
          <div className={styles.twoCol}>
            <div style={chartCard}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#F0EBE3', marginBottom: 4, fontFamily: 'Inter, sans-serif' }}>Day-of-Week Consumption</h3>
              <p style={{ fontSize: 11, color: '#6B6358', marginBottom: 16, fontFamily: 'Inter, sans-serif' }}>
                Last {pattern.daysAnalyzed} days — busiest: {pattern.busiestDay}, avg {pattern.averagePerDay.toFixed(1)}/day
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pattern.dayOfWeek.map(d => {
                  const width = Math.max((d.totalQuantity / Math.max(pattern.totalConsumed, 1)) * 100, 0.5)
                  const highlight = d.dayName === pattern.busiestDay
                  return (
                    <div key={d.dayOfWeek} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ width: 96, fontSize: 12, color: '#A09888', fontFamily: 'Inter, sans-serif' }}>{d.dayName}</span>
                      <div style={{ flex: 1, height: 22, background: '#2A261E', borderRadius: 4, overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            background: highlight ? '#C8A04E' : 'rgba(200,160,78,0.3)',
                            borderRadius: 4,
                            width: `${Math.min(width, 100)}%`,
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                      <span style={{ width: 80, fontSize: 12, color: '#A09888', textAlign: 'right', fontFamily: 'Inter, sans-serif' }}>
                        {d.totalQuantity.toFixed(1)} ({d.sharePercent}%)
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={chartCard}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#F0EBE3', marginBottom: 4, fontFamily: 'Inter, sans-serif' }}>Hour-of-Day Profile</h3>
              <p style={{ fontSize: 11, color: '#6B6358', marginBottom: 16, fontFamily: 'Inter, sans-serif' }}>Peak consumption hour: {pattern.peakHour}:00</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 160 }}>
                {pattern.hourly.map(h => {
                  const height = h.totalQuantity > 0 ? (h.totalQuantity / maxHour) * 100 : 2
                  const peak = h.hour === pattern.peakHour
                  return (
                    <div key={h.hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div
                        style={{
                          width: '100%',
                          height: `${Math.max(height, 2)}%`,
                          background: peak ? '#C8A04E' : 'rgba(200,160,78,0.3)',
                          borderRadius: '2px 2px 0 0',
                          transition: 'height 0.3s ease',
                        }}
                        title={`${h.hour}:00 — ${h.totalQuantity.toFixed(1)}`}
                      />
                      {(h.hour % 4 === 0) && (
                        <span style={{ fontSize: 10, color: '#6B6358' }}>{h.hour}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminPage>
  )
}
