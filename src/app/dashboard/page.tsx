'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'

// ---------------------------------------------------------------------------
// Data contract (mirrors src/inventory/engine/owner-dashboard.ts)
// ---------------------------------------------------------------------------

interface OwnerDashboardData {
  range: { start: string; end: string; label: string; previousStart: string; previousEnd: string }
  location: string | null
  locationName: string
  kpi: {
    purchased: number
    used: number
    wastage: number
    adjustments: number
    stockValue: number
    supplierPayments: number
    supplierOutstanding: number
    purchasedPrev: number
    usedPrev: number
    wastagePrev: number
    adjustmentsPrev: number
    stockValuePrev: number | null
  }
  locations: Array<{ locationId: string; name: string; items: number; value: number; pct: number; movement: number }>
  suppliers: Array<{ supplierId: string | null; supplierName: string; week: number; month: number; outstanding: number }>
  alerts: Array<{ severity: 'high' | 'medium' | 'low'; message: string; href?: string }>
  activity: Array<{ kind: string; description: string; person: string; at: string }>
  movement: Array<{ date: string; purchased: number; used: number }>
  supplierPaymentsEnabled: boolean
}

// ---------------------------------------------------------------------------
// Visual primitives (premium Excel-like, dark)
// ---------------------------------------------------------------------------

const theme = {
  bg: '#0F1220',
  panel: '#141E2B',
  panelBorder: '#24304A',
  panelAlt: '#0F1729',
  ink: '#F0EDE8',
  text: '#E8E6F0',
  textSoft: '#93A4BC',
  textDim: '#7A8CA8',
  gold: '#C4A04E',
  green: '#34D399',
  red: '#F87171',
  amber: '#FBBF24',
  blue: '#60A5FA',
  border: '#2A3648',
}

const fmtR0 = (n: number | null | undefined): string =>
  `R${Math.round(Number(n ?? 0)).toLocaleString('en-ZA')}`

function formatRange(start: string, end: string): string {
  return `${new Date(start).toISOString().slice(0, 10)} to ${end.slice(0, 10)}`
}

function deltaPct(current: number, prev: number): { pct: number; dir: 'up' | 'down' | 'flat' } | null {
  if (prev === 0) return null
  const pct = ((current - prev) / Math.abs(prev)) * 100
  if (Math.abs(pct) < 0.05) return { pct: 0, dir: 'flat' }
  return { pct, dir: pct > 0 ? 'up' : 'down' }
}

const PERIODS: Array<{ id: string; label: string }> = [
  { id: 'this_week', label: 'This Week' },
  { id: 'this_month', label: 'This Month' },
  { id: 'last_7', label: 'Last 7 Days' },
  { id: 'last_30', label: 'Last 30 Days' },
  { id: 'custom', label: 'Custom' },
]

const table: CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 13 }
const thStyle: CSSProperties = {
  textAlign: 'left', padding: '9px 12px', color: theme.textDim,
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
  borderBottom: `1px solid ${theme.panelBorder}`, whiteSpace: 'nowrap',
}
const thRight: CSSProperties = { ...thStyle, textAlign: 'right' }
const tdStyle: CSSProperties = { padding: '9px 12px', borderBottom: '1px solid #1A2434', color: theme.text }
const tdRight: CSSProperties = { ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }

const dateInputStyle: CSSProperties = {
  background: '#1A2434', border: `1px solid ${theme.border}`, color: '#F0EDE8',
  borderRadius: 8, padding: '7px 10px', fontSize: 12.5, outline: 'none',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OwnerDashboardPage() {
  const [period, setPeriod] = useState('this_week')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [data, setData] = useState<OwnerDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async (p: string, from?: string, to?: string) => {
    setIsLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ period: p })
      if (p === 'custom' && from && to) {
        params.set('from', from)
        params.set('to', to)
      }
      const res = await fetch(`/api/inventory/owner-dashboard?${params.toString()}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message ?? 'Failed to load dashboard')
      setData(json.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load(period, customFrom, customTo)
  }, [load, period, customFrom, customTo])

  const pickPeriod = (p: string) => setPeriod(p)

  const kpiCards: Array<{ label: string; value: ReactNode; sub: ReactNode; subColor?: string; href?: string }> = data
    ? [
        {
          label: 'Stock Purchased',
          value: fmtR0(data.kpi.purchased),
          sub: cmpText(data.kpi.purchased, data.kpi.purchasedPrev, 'vs previous period', theme),
          href: '/admin/operations/transactions?type=purchase',
        },
        {
          label: 'Stock Used',
          value: fmtR0(data.kpi.used),
          sub: cmpText(data.kpi.used, data.kpi.usedPrev, 'vs previous period', theme),
          href: '/admin/operations/transactions?type=sale',
        },
        {
          label: 'Current Stock Value',
          value: fmtR0(data.kpi.stockValue),
          sub: data.kpi.stockValuePrev != null
            ? cmpText(data.kpi.stockValue, data.kpi.stockValuePrev, 'vs period start', theme)
            : 'Refreshes when stock is reconciled',
          href: '/inv/stock',
        },
        {
          label: 'Supplier Outstanding',
          value: fmtR0(data.kpi.supplierOutstanding),
          sub: 'Amount currently owed to suppliers',
          href: '/inv/suppliers',
        },
        {
          label: 'Adjustments / Wastage',
          value: fmtR0(data.kpi.adjustments + data.kpi.wastage),
          sub: cmpText(
            data.kpi.adjustments + data.kpi.wastage,
            data.kpi.adjustmentsPrev + data.kpi.wastagePrev,
            'vs previous period',
            theme,
          ),
          href: '/admin/operations/waste',
        },
      ]
    : []

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, color: theme.ink }}>
      {/* Top header */}
      <div style={{ background: '#101A26', borderBottom: '1px solid #1E2A3A' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: '20px 24px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
            <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: '0.02em' }}>OWNER DASHBOARD</span>
            <span style={{ fontSize: 12, color: theme.gold, fontWeight: 600, padding: '3px 10px', border: `1px solid ${theme.gold}55`, borderRadius: 999 }}>Boma Cafe</span>
          </div>
          <p style={{ margin: 0, fontSize: 13.5, color: theme.textDim }}>Financial &amp; Inventory Overview</p>

          {/* Period selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            {PERIODS.map(p => (
              <button
                key={p.id}
                onClick={() => pickPeriod(p.id)}
                style={{
                  padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                  border: `1px solid ${period === p.id ? theme.gold : '#2A3648'}`,
                  background: period === p.id ? `${theme.gold}22` : '#141E2B',
                  color: period === p.id ? theme.gold : theme.ink,
                }}
              >
                {p.label}
              </button>
            ))}
            {period === 'custom' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={dateInputStyle} />
                <span style={{ color: theme.textDim }}>to</span>
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={dateInputStyle} />
              </div>
            )}
            <span style={{ fontSize: 12.5, color: theme.textDim, marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>
              {data ? `${formatRange(data.range.start, data.range.end)}  |  ${data.range.label}` : '\u00A0'}
            </span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '22px 24px 60px' }}>
        {/* Status bars */}
        {isLoading && <LoadBar />}
        {error && (
          <div style={{ background: '#2A1418', border: '1px solid #5C2630', color: '#FCA5A5', borderRadius: 10, padding: '14px 18px', fontSize: 13.5, marginBottom: 18 }}>
            Warning: {error} — check that inventory data is populated and the admin session is valid.
          </div>
        )}

        {data && !isLoading && (
          <>
            {/* KPI cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14, marginBottom: 26 }}>
              {kpiCards.map(card => (
                <Link
                  key={card.label}
                  href={card.href ?? '#'}
                  style={{
                    textDecoration: 'none', display: 'block',
                    background: theme.panel, border: `1px solid ${theme.panelBorder}`, borderRadius: 12,
                    padding: '16px 18px',
                  }}
                >
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: theme.textDim }}>
                    {card.label}
                  </p>
                  <p style={{ margin: '8px 0 2px', fontSize: 24, fontWeight: 800, color: theme.ink, fontVariantNumeric: 'tabular-nums' }}>
                    {card.value}
                  </p>
                  <p style={{ margin: 0, fontSize: 11.5, fontWeight: 600 }}>{card.sub}</p>
                </Link>
              ))}
            </div>

            {/* This Week / This Month summary tables */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, marginBottom: 22 }}>
              <SummaryTable title={`THIS WEEK${data.range.label === 'This week' ? '' : ' (selected period)'}`} data={data} theme={theme} />
              <SummaryTable title="THIS MONTH (calendar)" data={data} theme={theme} />
            </div>

            {/* Stock by location */}
            <ExcelCard title="CURRENT STOCK BY LOCATION" subtitle="Where the inventory money is sitting">
              <div style={{ overflowX: 'auto' }}>
                <table style={table}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Location</th>
                      <th style={thRight}>Items</th>
                      <th style={thRight}>Stock Value</th>
                      <th style={thRight}>% of Total</th>
                      <th style={thRight}>Net Movement*</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.locations.map(loc => (
                      <tr key={loc.locationId}>
                        <td style={tdStyle}>
                          <Link href={`/admin/operations/locations/${loc.locationId}/stock`} style={{ color: theme.ink, textDecoration: 'none' }}>
                            {loc.name}
                          </Link>
                        </td>
                        <td style={tdRight}>{loc.items}</td>
                        <td style={{ ...tdRight, fontWeight: 600 }}>{fmtR0(loc.value)}</td>
                        <td style={tdRight}>{loc.pct}%</td>
                        <td style={tdRight}>
                          <span style={{ color: loc.movement >= 0 ? theme.green : theme.red }}>
                            {loc.movement >= 0 ? 'up ' : 'down '}{fmtR0(Math.abs(loc.movement))}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {data.locations.length === 0 && (
                      <tr><td colSpan={5} style={{ ...tdStyle, color: theme.textDim, textAlign: 'center', padding: 20 }}>No active locations yet.</td></tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr style={{ fontWeight: 700, color: theme.gold }}>
                      <td style={{ padding: '9px 12px', borderTop: '2px solid #2A3A58', fontWeight: 700, color: theme.gold }}>TOTAL</td>
                      <td style={{ padding: '9px 12px', borderTop: '2px solid #2A3A58', fontWeight: 700, color: theme.gold }}>{data.locations.reduce((a, l) => a + l.items, 0)}</td>
                      <td style={{ padding: '9px 12px', borderTop: '2px solid #2A3A58', fontWeight: 700, color: theme.gold }}>{fmtR0(data.kpi.stockValue)}</td>
                      <td style={{ padding: '9px 12px', borderTop: '2px solid #2A3A58', fontWeight: 700, color: theme.gold }}>100%</td>
                      <td style={{ padding: '9px 12px', borderTop: '2px solid #2A3A58', fontWeight: 700, color: theme.gold }}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p style={{ fontSize: 11, color: theme.textDim, marginTop: 8 }}>*Net movement = purchases minus usage in the selected period, at cost.</p>
            </ExcelCard>

            {/* Supplier amount owed */}
            <div style={{ marginTop: 22 }}>
              <ExcelCard
                title="SUPPLIER AMOUNTS OWED"
                subtitle={data.supplierPaymentsEnabled ? 'Value of open invoices not yet fully paid' : 'Supplier invoicing is not set up yet — enable migration 064 for live outstanding figures'}
              >
                {data.suppliers.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 13, color: theme.textDim }}>
                    No suppliers on file, or no open balances.
                  </p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={table}>
                      <thead>
                        <tr>
                          <th style={thStyle}>Supplier</th>
                          <th style={thRight}>This Week</th>
                          <th style={thRight}>This Month</th>
                          <th style={thRight}>Outstanding</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.suppliers.map(s => (
                          <tr key={s.supplierId ?? s.supplierName}>
                            <td style={tdStyle}>
                              <Link href={s.supplierId ? `/admin/operations/suppliers/${s.supplierId}` : '#'} style={{ color: theme.ink, textDecoration: 'none' }}>
                                {s.supplierName}
                              </Link>
                            </td>
                            <td style={tdRight}>{fmtR0(s.week)}</td>
                            <td style={tdRight}>{fmtR0(s.month)}</td>
                            <td style={{ ...tdRight, fontWeight: 600, color: s.outstanding > 0 ? theme.red : theme.textDim }}>
                              {fmtR0(s.outstanding)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ fontWeight: 700 }}>
                          <td style={{ padding: '9px 12px', borderTop: '2px solid #2A3A58', fontWeight: 700, color: theme.gold }}>TOTAL OUTSTANDING</td>
                          <td style={{ padding: '9px 12px', borderTop: '2px solid #2A3A58' }}></td>
                          <td style={{ padding: '9px 12px', borderTop: '2px solid #2A3A58' }}></td>
                          <td style={{ padding: '9px 12px', borderTop: '2px solid #2A3A58', fontWeight: 700, color: theme.gold }}>{fmtR0(data.kpi.supplierOutstanding)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </ExcelCard>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, marginTop: 22 }}>
              {/* Requires attention */}
              <ExcelCard title="REQUIRES ATTENTION" subtitle="Only what actually needs action">
                {data.alerts.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 13.5, color: theme.green }}>Everything is up to date.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {data.alerts.map((a, i) => (
                      <AlertCard key={i} alert={a} theme={theme} />
                    ))}
                  </div>
                )}
              </ExcelCard>

              {/* Recent activity */}
              <ExcelCard title="RECENT ACTIVITY" subtitle="Latest inventory events, verified from the ledger">
                {data.activity.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 13, color: theme.textDim }}>No activity recorded yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {data.activity.map((a, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <span style={{ fontSize: 15, width: 20 }}>{kindIcon(a.kind)}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 13, color: theme.ink }}>{kindLabel(a.kind)} - {a.description}</p>
                          <p style={{ margin: '1px 0 0', fontSize: 11, color: theme.textDim }}>
                            {a.person || 'System'} · {new Date(a.at).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ExcelCard>
            </div>

            {/* Purchased vs Used (minimal chart, pure CSS) */}
            {data.movement.length > 0 && (
              <div style={{ marginTop: 22 }}>
                <ExcelCard title="STOCK MOVEMENT - Purchased vs Used" subtitle="Value at cost per day, from the ledger">
                  <FundsChart points={data.movement} theme={theme} />
                </ExcelCard>
              </div>
            )}

            <p style={{ marginTop: 26, fontSize: 11, color: theme.textDim }}>
              All figures are calculated live from the inventory transaction ledger, stock balances, invoices and payments. No hard-coded numbers.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Small presentational components
// ---------------------------------------------------------------------------

function LoadBar() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderRadius: 10, background: theme.panel, border: `1px solid ${theme.panelBorder}`, marginBottom: 16, fontSize: 13, color: theme.textDim }}>
      <span style={{ width: 14, height: 14, borderRadius: 999, border: `2px solid ${theme.panelBorder}`, borderTopColor: theme.gold, display: 'inline-block' }} />
      Loading the financial overview...
    </div>
  )
}

function cmpText(cur: number, prev: number, suffix: string, theme: any) {
  const d = deltaPct(cur, prev)
  if (!d) return <span style={{ color: theme.textDim }}>{suffix}</span>
  const color = d.dir === 'up' ? theme.green : d.dir === 'down' ? theme.red : theme.textDim
  const arrow = d.dir === 'up' ? 'up ' : d.dir === 'down' ? 'down ' : 'flat '
  return (
    <span style={{ color, fontWeight: 700 }}>
      {arrow} {d.pct.toFixed(1)}% <span style={{ fontWeight: 400, color: theme.textDim }}>{suffix}</span>
    </span>
  )
}

function SummaryTable({ title, data, theme }: { title: string; data: OwnerDashboardData; theme: any }) {
  const rows: Array<{ label: string; amount: number; highlight?: boolean }> = [
    { label: 'Stock Purchased', amount: data.kpi.purchased },
    { label: 'Stock Used', amount: data.kpi.used },
    { label: 'Wastage', amount: data.kpi.wastage },
    { label: 'Adjustments', amount: data.kpi.adjustments },
    { label: 'Supplier Payments', amount: data.kpi.supplierPayments },
    { label: 'Supplier Outstanding', amount: data.kpi.supplierOutstanding, highlight: true },
    { label: 'Current Stock Value', amount: data.kpi.stockValue },
  ]
  return (
    <div style={{ background: theme.panel, border: `1px solid ${theme.panelBorder}`, borderRadius: 12, padding: 18, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: theme.ink }}>{title}</h3>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>
              <td style={{ padding: '9px 12px', borderBottom: '1px solid #1A2434', color: theme.text }}>{row.label}</td>
              <td style={{ padding: '9px 12px', borderBottom: '1px solid #1A2434', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: row.highlight && row.amount > 0 ? theme.red : theme.ink }}>
                {fmtR0(row.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AlertCard({ alert, theme }: { alert: { severity: string; message: string; href?: string }; theme: any }) {
  const colors: Record<string, string> = { high: theme.red, medium: theme.amber, low: theme.blue }
  const bg: Record<string, string> = { high: '#2A1418', medium: '#2A2212', low: '#12202C' }
  const c = colors[alert.severity] ?? theme.blue
  const icon = alert.severity === 'high' ? '!' : alert.severity === 'medium' ? '!' : 'i'
  const body = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: bg[alert.severity] ?? 'transparent', border: `1px solid ${c}55` }}>
      <span style={{ fontSize: 14, fontWeight: 800, color: c }}>{icon}</span>
      <span style={{ fontSize: 12.5, color: theme.ink }}>{alert.message}</span>
    </div>
  )
  return alert.href ? (
    <Link href={alert.href} style={{ textDecoration: 'none' }}>{body}</Link>
  ) : body
}

function ExcelCard({ title, subtitle, children, top }: { title: string; subtitle?: string; children: ReactNode; top?: ReactNode }) {
  return (
    <div style={{ background: theme.panel, border: `1px solid ${theme.panelBorder}`, borderRadius: 12, padding: '18px 18px', marginBottom: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: theme.ink }}>{title}</h3>
        {subtitle && <span style={{ fontSize: 11, color: theme.textDim }}>{subtitle}</span>}
      </div>
      {top}
      {children}
    </div>
  )
}

function kindIcon(kind: string): string {
  switch ((kind || '').toLowerCase()) {
    case 'purchase': return '+'
    case 'receipt': return '+'
    case 'count': return '#'
    case 'waste': return 'x'
    case 'adjustment': return '~'
    case 'invoice': return 'f'
    case 'payment': return '$'
    case 'sale': return '-'
    default: return 'o'
  }
}

function kindLabel(kind: string): string {
  const map: Record<string, string> = {
    purchase: 'Stock received',
    payment: 'Supplier payment',
    count: 'Stock count',
    waste: 'Wastage recorded',
    adjustment: 'Stock adjustment',
    invoice: 'Supplier invoice',
    sale: 'Sale',
  }
  return map[kind.toLowerCase()] ?? 'Stock movement'
}

// ---------------------------------------------------------------------------
// Chart - two series per day, pure CSS
// ---------------------------------------------------------------------------

function FundsChart({ points, theme }: { points: Array<{ date: string; purchased: number; used: number }>; theme: any }) {
  const max = Math.max(...points.map(p => Math.max(p.purchased, p.used)), 1)
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, minWidth: 420, height: 180 }}>
        {points.map(p => (
          <div key={p.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 2, width: '100%', height: 140, alignItems: 'flex-end' }}>
              <div
                title={`Purchased ${fmtR0(p.purchased)}`}
                style={{ flex: 1, height: `${Math.max(2, (p.purchased / max) * 140)}px`, background: theme.gold, borderRadius: '3px 0 0 3px' }}
              />
              <div
                title={`Used ${fmtR0(p.used)}`}
                style={{ flex: 1, height: `${Math.max(2, (p.used / max) * 140)}px`, background: theme.blue, borderRadius: '0 3px 3px 0' }}
              />
            </div>
            <span style={{ fontSize: 9.5, color: theme.textDim, whiteSpace: 'nowrap' }}>{p.date.slice(5)}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 16, fontSize: 11.5, color: theme.textDim, marginTop: 10 }}>
        <span><span style={{ color: theme.gold }}>Purchased</span> (gold)</span>
        <span><span style={{ color: theme.blue }}>Used</span> (blue)</span>
      </div>
    </div>
  )
}