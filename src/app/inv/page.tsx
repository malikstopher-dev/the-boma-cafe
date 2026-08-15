'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import {
  C, Badge, Card, Kpi, PageTitle, Loading,
  formatMoney, formatDateShort, formatDateTime, pctDelta, todayIso,
} from './kit'
import { weekRange, currentWeekNumber, lastWeekOfYear } from '@/inventory/lib/weeks'

type PeriodKey = 'this_week' | 'this_month' | 'last_7' | 'last_30' | 'custom'

interface OwnerData {
  range: { start: string; end: string; label: string }
  locationName: string
  kpi: {
    purchased: number; used: number; wastage: number; adjustments: number
    stockValue: number; supplierPayments: number; supplierOutstanding: number
    purchasedPrev: number; usedPrev: number; wastagePrev: number; adjustmentsPrev: number
    stockValuePrev: number | null
  }
  locations: Array<{ locationId: string; name: string; items: number; value: number; pct: number; movement: number }>
  suppliers: Array<{ supplierId: string | null; supplierName: string; week: number; month: number; outstanding: number }>
  alerts: Array<{ severity: 'high' | 'medium' | 'low'; message: string; href?: string }>
  activity: Array<{ kind: string; description: string; person: string; at: string }>
  movement: Array<{ date: string; purchased: number; used: number }>
}

const PRESETS: Array<{ key: PeriodKey; label: string }> = [
  { key: 'this_week', label: 'This Week' },
  { key: 'this_month', label: 'This Month' },
  { key: 'last_7', label: 'Last 7 Days' },
  { key: 'last_30', label: 'Last 30 Days' },
]

function mondayIso(): string {
  const d = new Date()
  const dow = d.getDay() || 7
  d.setDate(d.getDate() - (dow - 1))
  return d.toISOString().slice(0, 10)
}

function monthStartIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function periodStart(key: PeriodKey): string {
  switch (key) {
    case 'this_week': return mondayIso()
    case 'this_month': return monthStartIso()
    case 'last_7': { const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().slice(0, 10) }
    case 'last_30': { const d = new Date(); d.setDate(d.getDate() - 29); return d.toISOString().slice(0, 10) }
    default: return todayIso()
  }
}

function greet(): string {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

const ACTIVITY_TONES: Record<string, 'gold' | 'good' | 'warning' | 'danger' | 'info' | 'muted'> = {
  payment: 'info',
  purchase: 'good',
  adjustment: 'warning',
  waste: 'danger',
  sale: 'muted',
  production: 'gold',
  stock_count: 'gold',
  invoice: 'info',
}

export default function OwnerDashboardPage() {
  const [period, setPeriod] = useState<PeriodKey>('this_week')
  const [customFrom, setCustomFrom] = useState(todayIso())
  const [customTo, setCustomTo] = useState(todayIso())
  const [weekYear, setWeekYear] = useState(() => new Date().getFullYear())
  const [weekNo, setWeekNo] = useState(() => currentWeekNumber())
  const [weekApplied, setWeekApplied] = useState<{ y: number; w: number; start: string; end: string } | null>(null)
  const [data, setData] = useState<OwnerData | null>(null)
  const [month, setMonth] = useState<OwnerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchPeriod = useCallback(async (key: PeriodKey) => {
    const params = new URLSearchParams({ period: key })
    if (key === 'custom') {
      params.set('from', customFrom)
      params.set('to', customTo)
    }
    const res = await fetch(`/api/inventory/owner-dashboard?${params.toString()}`)
    const json = await res.json()
    if (json.error) throw new Error(json.error.message)
    return json.data as OwnerData
  }, [customFrom, customTo])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    const load = async () => {
      try {
        const [curr, m] = await Promise.all([fetchPeriod(period), fetchPeriod('this_month')])
        if (cancelled) return
        setData(curr)
        setMonth(m)
        setLastUpdated(new Date())
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load dashboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [period, fetchPeriod])

  const refresh = useCallback(() => {
    setLastUpdated(null)
    setLoading(true)
    fetchPeriod(period).then(d => { setData(d); setLastUpdated(new Date()); setLoading(false) }).catch(err => { setError(err.message); setLoading(false) })
  }, [period, fetchPeriod])

  const weekOptions = useMemo(() => Array.from({ length: lastWeekOfYear(weekYear) }, (_, i) => i + 1), [weekYear])

  const applyWeek = () => {
    const { start, end } = weekRange(weekYear, weekNo)
    setCustomFrom(start)
    setCustomTo(end)
    setWeekApplied({ y: weekYear, w: weekNo, start, end })
    setPeriod('custom')
  }

  const selectStyle: CSSProperties = {
    background: '#1C1710', border: '1px solid #3A322A', color: '#F0EBE3',
    borderRadius: 8, padding: '7px 8px', fontSize: 12.5, cursor: 'pointer',
  }

  const summaryLabels: Array<[string, (d: OwnerData) => number]> = [
    ['Stock Purchased', d => d.kpi.purchased],
    ['Stock Used', d => d.kpi.used],
    ['Waste', d => d.kpi.wastage],
    ['Adjustments', d => d.kpi.adjustments],
    ['Current Stock Value', d => d.kpi.stockValue],
    ['Supplier Outstanding', d => d.kpi.supplierOutstanding],
  ]

  const kpiCards = useMemo(() => {
    if (!data) return []
    const k = data.kpi
    return [
      {
        label: 'Stock Received', value: formatMoney(k.purchased),
        delta: pctDelta(k.purchased, k.purchasedPrev), tone: 'gold' as const,
        sub: 'vs previous period',
      },
      {
        label: 'Stock Used', value: formatMoney(k.used),
        delta: pctDelta(k.used, k.usedPrev), tone: 'neutral' as const,
        sub: 'vs previous period',
      },
      {
        label: 'Current Stock Value', value: formatMoney(k.stockValue),
        delta: pctDelta(k.stockValue, k.stockValuePrev), tone: 'gold' as const,
        sub: 'estimated at cost',
      },
      {
        label: 'Supplier Amount Owed', value: formatMoney(k.supplierOutstanding),
        delta: undefined, tone: 'neutral' as const,
        sub: `Paid: ${formatMoney(k.supplierPayments)}`,
      },
      {
        label: 'Adjustments', value: formatMoney(k.adjustments),
        delta: pctDelta(k.adjustments, k.adjustmentsPrev), tone: 'neutral' as const,
        sub: 'corrections',
      },
    ]
  }, [data])

  return (
    <div>
      <PageTitle
        title={`${greet()}, Mr Mahendra`}
        subtitle="Inventory & Financial Overview � every figure is calculated from the live transaction ledger."
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {PRESETS.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                style={{
                  padding: '8px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                  border: period === p.key ? '1px solid #C8A04E' : '1px solid #3A322A',
                  background: period === p.key ? 'rgba(200,160,78,0.14)' : '#1C1710',
                  color: period === p.key ? '#E0BC6E' : '#B8B0A0',
                }}
              >
                {p.label}
              </button>
            ))}
            {period === 'custom' && (
              <>
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ background: '#1C1710', border: '1px solid #3A322A', color: '#F0EBE3', borderRadius: 8, padding: '7px 10px', fontSize: 12.5 }} />
                <span style={{ color: '#8A8072', fontSize: 12 }}>?</span>
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ background: '#1C1710', border: '1px solid #3A322A', color: '#F0EBE3', borderRadius: 8, padding: '7px 10px', fontSize: 12.5 }} />
              </>
            )}
            <button onClick={refresh} style={{ padding: '8px 13px', borderRadius: 8, border: 'none', background: '#C8A04E', color: '#171008', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>
              Refresh
            </button>
            <span style={{ width: 1, height: 24, background: '#332B21' }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B6049' }}>Pick week</span>
            <select value={weekYear} onChange={e => { setWeekYear(Number(e.target.value)); setWeekNo(1) }} style={selectStyle}>
              {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select value={weekNo} onChange={e => setWeekNo(Number(e.target.value))} style={selectStyle}>
              {weekOptions.map(w => (
                <option key={w} value={w}>Week {w}{w === currentWeekNumber() && weekYear === new Date().getFullYear() ? ' (now)' : ''}</option>
              ))}
            </select>
            <button onClick={applyWeek} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #3A322A', background: '#1C1710', color: '#E0BC6E', fontWeight: 600, fontSize: 12.5, cursor: 'pointer' }}>
              Show
            </button>
            <span style={{ width: 1, height: 24, background: '#332B21' }} />
            <Link href="/admin/operations" style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #3A322A', background: '#1C1710', color: '#B8B0A0', fontSize: 12.5, fontWeight: 600, textDecoration: 'none' }}>Go to Admin</Link>
            <Link href="/" style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #3A322A', background: '#1C1710', color: '#B8B0A0', fontSize: 12.5, fontWeight: 600, textDecoration: 'none' }}>View Website</Link>
            <button onClick={() => { window.location.href = '/api/admin/auth?action=logout&redirect=/admin/login' }} title="Sign out" style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(232,84,84,0.4)', background: 'rgba(232,84,84,0.1)', color: '#F17777', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Logout</button>
          </div>
        }
      />

      {weekApplied && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '9px 14px', borderRadius: 10, background: 'rgba(200,160,78,0.10)', border: '1px solid rgba(200,160,78,0.35)' }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#E0BC6E', letterSpacing: '0.02em' }}>
            Showing Week {weekApplied.w} of {weekApplied.y} · Mon {formatDateShort(weekApplied.start)} – Sun {formatDateShort(weekApplied.end)}
          </span>
          <button
            onClick={() => { setWeekApplied(null); setPeriod('this_week') }}
            style={{ marginLeft: 'auto', padding: '4px 10px', borderRadius: 7, border: '1px solid #3A322A', background: 'transparent', color: '#B8B0A0', fontSize: 11.5, cursor: 'pointer' }}
          >✕ Clear week</button>
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(232,84,84,0.1)', border: '1px solid rgba(232,84,84,0.4)', color: '#F17777', fontSize: 13, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {loading && !data ? (
        <Loading />
      ) : data ? (
        <>
          {/* KPI band */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14, marginBottom: 8 }}>
            {kpiCards.map(k => (
              <Kpi key={k.label} label={k.label} value={k.value} delta={k.delta} sub={k.sub} tone={k.tone} />
            ))}
          </div>
          <p style={{ fontSize: 11.5, color: '#665D50', margin: '10px 0 0', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {data.locationName} � Showing {data.range && `${formatDateShort(data.range.start)} � ${formatDateShort(data.range.end)}`}
            {lastUpdated ? ` � Updated ${lastUpdated.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}` : ' � Updating�'}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 16, marginTop: 20 }}>
            {/* This week / This month summary */}
            <Card title="Weekly & Monthly Summary" subtitle="Purchasing, usage, value and supplier position">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.textMuted, borderBottom: `1px solid ${C.borderStrong}` }}>Line</th>
                    <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.textMuted, borderBottom: `1px solid ${C.borderStrong}` }}>This week</th>
                    <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.textMuted, borderBottom: `1px solid ${C.borderStrong}` }}>This month</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryLabels.map(([label, pick]) => (
                    <tr key={label} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '9px 10px', color: C.textSoft }}>{label}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', color: C.text, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(pick(data))}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', color: C.text, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{month ? formatMoney(pick(month)) : '�'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            {/* Movement */}
            <Card title="Stock Movement" subtitle="Purchased vs used, per day in the selected period">
              <MiniBarsBlock points={data.movement} />
            </Card>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, marginTop: 16 }}>
            {/* Stock by location */}
            <Card
              title="Stock by Location"
              subtitle="Where the money is sitting"
              action={<Link href="/inv/locations" style={{ color: C.goldBright, fontSize: 13, textDecoration: 'none' }}>View all ?</Link>}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.textMuted }}>Location</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.textMuted }}>Items</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.textMuted }}>Value</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.textMuted }}>%</th>
                    <th style={{ width: 90, padding: '6px 8px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {data.locations.map(loc => (
                    <tr key={loc.locationId} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '8px', color: C.textSoft }}>{loc.name}</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: C.textMuted, fontVariantNumeric: 'tabular-nums' }}>{loc.items}</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: C.text, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(loc.value)}</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: C.textMuted, fontVariantNumeric: 'tabular-nums' }}>{loc.pct}%</td>
                      <td style={{ padding: '8px' }}>
                        <div style={{ width: 82, height: 6, borderRadius: 4, background: C.bgRaised, overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, loc.pct)}%`, height: '100%', borderRadius: 4, background: loc.pct > 50 ? '#C8A04E' : '#8C7441' }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: `2px solid ${C.borderStrong}` }}>
                    <td style={{ padding: '8px', fontWeight: 800, color: C.goldBright }}>TOTAL</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: C.goldBright, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{data.locations.reduce((s, l) => s + l.items, 0)}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: C.goldBright, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(data.locations.reduce((s, l) => s + l.value, 0))}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: C.goldBright }}>100%</td>
                    <td style={{ padding: '8px' }}>
                      <div style={{ width: 82, height: 6, borderRadius: 4, background: C.bgRaised, overflow: 'hidden' }}>
                        <div style={{ width: '100%', height: '100%', borderRadius: 4, background: '#C8A04E' }} />
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </Card>

            {/* Supplier position */}
            <Card
              title="Supplier Position"
              subtitle="Outstanding balances � invoices less payments"
              action={<Link href="/inv/payables" style={{ color: C.goldBright, fontSize: 13, textDecoration: 'none' }}>Supplier payables ?</Link>}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.textMuted }}>Supplier</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.textMuted }}>This month</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.textMuted }}>Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {data.suppliers.length === 0 && (
                    <tr><td colSpan={3} style={{ padding: '20px 8px', textAlign: 'center', color: C.textMuted, fontSize: 13 }}>No supplier invoices on record.</td></tr>
                  )}
                  {data.suppliers.map(s => (
                    <tr key={s.supplierId ?? s.supplierName} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '8px', color: C.textSoft }}>{s.supplierName}</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: C.textSoft, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(s.month)}</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: s.outstanding > 0 ? C.warningText : C.successText, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(s.outstanding)}</td>
                    </tr>
                  ))}
                  {data.suppliers.length > 0 && (
                    <tr style={{ borderTop: `2px solid ${C.borderStrong}` }}>
                      <td style={{ padding: '8px', fontWeight: 800, color: C.goldBright }}>TOTAL</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: C.goldBright, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(data.suppliers.reduce((s, x) => s + x.month, 0))}</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: C.goldBright, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(data.suppliers.reduce((s, x) => s + x.outstanding, 0))}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>
          </div>

          {/* Alerts + activity */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, marginTop: 16 }}>
            <Card title="Needs Attention" subtitle="Low stock and stock-count concerns">
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: 'rgba(232,84,84,0.14)', border: '1px solid rgba(232,84,84,0.4)', color: C.dangerText }}>
                  {data.alerts.filter(a => a.severity === 'high').length} high
                </span>
                <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: 'rgba(224,188,110,0.12)', border: '1px solid rgba(224,188,110,0.4)', color: '#E0BC6E' }}>
                  {data.alerts.filter(a => a.severity === 'medium').length} medium
                </span>
                <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: '#2A241A', border: '1px solid #3A322A', color: C.textSoft }}>
                  {data.alerts.filter(a => a.severity === 'low').length} low
                </span>
                <span style={{ marginLeft: 'auto', fontSize: 11.5, color: C.textMuted, alignSelf: 'center' }}>of {data.alerts.length} alerts</span>
              </div>
              {data.alerts.length === 0 ? (
                <p style={{ margin: 0, fontSize: 13, color: C.textMuted }}>All clear � nothing needs attention right now.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {data.alerts.slice(0, 8).map((a, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: C.bgRaised, borderRadius: 8 }}>
                      <Badge tone={a.severity === 'high' ? 'danger' : a.severity === 'medium' ? 'warning' : 'muted'}>{a.severity}</Badge>
                      <span style={{ fontSize: 13, color: C.textSoft, flex: 1 }}>
                        {a.href ? <Link href={a.href} style={{ color: C.textSoft, textDecoration: 'none' }}>{a.message}</Link> : a.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card
              title="Recent Activity"
              subtitle="Movements, payments and counts � most recent first"
              action={<Link href="/inv/activity" style={{ color: C.goldBright, fontSize: 13, textDecoration: 'none' }}>Full audit ?</Link>}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {data.activity.length === 0 && <p style={{ margin: 0, fontSize: 13, color: C.textMuted }}>No recorded activity yet.</p>}
                {data.activity.map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 6px', borderBottom: `1px solid ${C.border}` }}>
                    <Badge tone={ACTIVITY_TONES[a.kind] ?? 'muted'}>{a.kind.replace(/_/g, ' ')}</Badge>
                    <span style={{ fontSize: 13, color: C.textSoft, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.description}</span>
                    <span style={{ fontSize: 11.5, color: C.textMuted, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{formatDateTime(a.at)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      ) : (
        <p style={{ color: C.dangerText, fontSize: 14 }}>Could not load the dashboard. Check your connection and try again.</p>
      )}
    </div>
  )
}

function MiniBarsBlock({ points }: { points: Array<{ date: string; purchased: number; used: number }> }) {
  const maxVal = Math.max(1, ...points.map(p => Math.max(p.purchased, p.used)))
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 110, marginTop: 12 }}>
      {points.length === 0 && <span style={{ fontSize: 12.5, color: C.textMuted }}>No movement in this period.</span>}
      {points.map(p => (
        <div key={p.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1, minWidth: 8 }} title={`${p.date}\npurchased ${formatMoney(p.purchased)}\nused ${formatMoney(p.used)}`}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 1, height: 80 }}>
            <div style={{ width: 10, borderRadius: 3, background: '#8C7441', height: `${Math.max(2, (p.used / maxVal) * 100)}%` }} />
            <div style={{ width: 10, borderRadius: 3, background: '#C8A04E', height: `${Math.max(2, (p.purchased / maxVal) * 100)}%` }} />
          </div>
          <span style={{ fontSize: 9.5, color: C.textMuted, letterSpacing: '0.03em' }}>{formatDateShort(p.date)}</span>
        </div>
      ))}
      {points.length > 0 && (
        <div style={{ marginLeft: 10, display: 'flex', flexDirection: 'column', gap: 2, fontSize: 10.5, color: C.textMuted }}>
          <span style={{ color: '#C8A04E' }}>� Purchased</span>
          <span style={{ color: '#8C7441' }}>� Used</span>
        </div>
      )}
    </div>
  )
}
