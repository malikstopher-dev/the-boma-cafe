'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { CSSProperties, ReactNode } from 'react'
import { weekRange, currentWeekNumber, lastWeekOfYear } from '@/inventory/lib/weeks'

// ---------------------------------------------------------------------------
// Data contract (mirrors src/inventory/engine/owner-dashboard.ts)
// ---------------------------------------------------------------------------

type StockGroup = 'food' | 'beverage' | 'general' | 'gas'

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
  supplierTotal: number
  recentPayments: Array<{ supplierId: string | null; supplierName: string; amount: number; at: string }>
  boards: Array<{
    key: StockGroup
    label: string
    href: string
    items: number
    value: number
    purchased: number
    used: number
    wastage: number
    cylinders: number | null
  }>
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

const boardAccent: Record<StockGroup, { color: string; bg: string }> = {
  food: { color: '#F2B96B', bg: '#2A2014' },
  beverage: { color: '#7FB0EF', bg: '#14203A' },
  general: { color: '#9FC89F', bg: '#14281A' },
  gas: { color: '#F0876B', bg: '#331A14' },
}

const fmtR0 = (n: number | null | undefined): string =>
  `R${Math.round(Number(n ?? 0)).toLocaleString('en-ZA')}`

function greet(): string {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

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

const selectStyle: CSSProperties = {
  background: '#1A2434', border: `1px solid ${theme.border}`, color: '#F0EDE8',
  borderRadius: 8, padding: '7px 8px', fontSize: 12.5, outline: 'none',
}

function fmtDay(isoDate: string): string {
  return new Date(isoDate + 'T00:00:00Z').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
}

// ---------------------------------------------------------------------------
// Inventory navigation rail (same navigation + styling as /inv, no route changes)
// ---------------------------------------------------------------------------

const NAV_GROUPS: Array<{ label: string; items: Array<{ href: string; label: string }> }> = [
  {
    label: 'Overview',
    items: [{ href: '/inv', label: 'Owner Dashboard' }],
  },
  {
    label: 'Stock',
    items: [
      { href: '/inv/stock', label: 'Stock Sheets' },
      { href: '/inv/locations', label: 'Stock by Location' },
      { href: '/inv/stock-counts', label: 'Stock Counts' },
      { href: '/inv/adjustments', label: 'Adjustments' },
      { href: '/inv/waste', label: 'Waste' },
    ],
  },
  {
    label: 'Purchasing',
    items: [
      { href: '/inv/purchases', label: 'Receive Stock' },
      { href: '/inv/payables', label: 'Supplier Payables' },
    ],
  },
  {
    label: 'Catalogue',
    items: [
      { href: '/inv/products', label: 'Products' },
      { href: '/inv/suppliers', label: 'Suppliers' },
    ],
  },
  {
    label: 'Insight',
    items: [
      { href: '/inv/reports', label: 'Reports' },
      { href: '/inv/activity', label: 'Activity / Audit' },
    ],
  },
  {
    label: 'System',
    items: [{ href: '/inv/users', label: 'Users & Roles' }],
  },
]

const railLinkStyle = (active: boolean): CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '8px 12px', borderRadius: 8, fontSize: 13.5,
  textDecoration: 'none', fontWeight: active ? 700 : 500,
  color: active ? '#F0EBE3' : '#9A9080',
  background: active ? 'rgba(200,160,78,0.14)' : 'transparent',
  transition: 'background 0.12s ease, color 0.12s ease',
})

const railGroupStyle: CSSProperties = {
  fontSize: 10.5, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase',
  color: '#6B6049', margin: '16px 12px 6px',
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
  const [showAllSuppliers, setShowAllSuppliers] = useState(false)
  const [weekYear, setWeekYear] = useState(() => new Date().getFullYear())
  const [weekNo, setWeekNo] = useState(() => currentWeekNumber())
  const [weekApplied, setWeekApplied] = useState<{ y: number; w: number; start: string; end: string } | null>(null)
  const [managementActivity, setManagementActivity] = useState<Array<{ id: string; admin_name: string | null; admin_role: string | null; action: string; target_type: string | null; created_at: string }>>([])
  const pathname = usePathname()
  const [navOpen, setNavOpen] = useState(false)

  const isActive = (href: string) => (href === '/inv' ? pathname === '/inv' || pathname === '/dashboard' : pathname.startsWith(href))

  // Management activity (Mission E8): who did what in the admin system
  const loadActivity = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/audit/recent?limit=10', { cache: 'no-store' })
      if (!res.ok) return
      const json = await res.json()
      if (Array.isArray(json?.data)) setManagementActivity(json.data)
    } catch { /* non-critical */ }
  }, [])

  useEffect(() => {
    void loadActivity()
    const timer = setInterval(() => { void loadActivity() }, 60000)
    return () => clearInterval(timer)
  }, [loadActivity])

  const load = useCallback(async (p: string, from?: string, to?: string, opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setIsLoading(true)
      setError('')
    }
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
      if (!opts?.silent) setError(e instanceof Error ? e.message : 'Failed to load dashboard')
    } finally {
      if (!opts?.silent) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(period, customFrom, customTo)
  }, [load, period, customFrom, customTo])

  // Auto-refresh every 60s — silent background revalidation (no flash, scroll preserved)
  useEffect(() => {
    const timer = setInterval(() => { void load(period, customFrom, customTo, { silent: true }) }, 60000)
    return () => clearInterval(timer)
  }, [load, period, customFrom, customTo])

  const pickPeriod = (p: string) => setPeriod(p)
  const refresh = () => void load(period, customFrom, customTo, { silent: true })

  const weekOptions = useMemo(() => Array.from({ length: lastWeekOfYear(weekYear) }, (_, i) => i + 1), [weekYear])

  const applyWeek = () => {
    const { start, end } = weekRange(weekYear, weekNo)
    setCustomFrom(start)
    setCustomTo(end)
    setWeekApplied({ y: weekYear, w: weekNo, start, end })
    setPeriod('custom')
  }

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
          sub: owedSummary(data),
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

  const owedSuppliers = data?.suppliers.filter(s => s.outstanding > 0.004) ?? []
  const visibleSuppliers = showAllSuppliers ? (data?.suppliers ?? []) : owedSuppliers

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', minHeight: '100vh', background: theme.bg, color: theme.ink }}>
      {/* Desktop navigation rail (same navigation + styling as /inv) */}
      <aside className="dash-rail" style={{
        width: 222, flexShrink: 0, background: '#1C1710', borderRight: '1px solid #332B21',
        padding: '14px 10px 24px', position: 'sticky', top: 0, alignSelf: 'flex-start',
        maxHeight: '100vh', overflowY: 'auto',
      }}>
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <p style={railGroupStyle}>{group.label}</p>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {group.items.map(item => (
                <Link key={item.href} href={item.href} style={railLinkStyle(isActive(item.href))}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        ))}
        <p style={railGroupStyle}>Quick Links</p>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Link href="/admin/operations/checklist" style={railLinkStyle(false)}>Morning Checklist</Link>
          <Link href="/admin/operations/purchase-orders" style={railLinkStyle(false)}>Purchase Orders</Link>
          <Link href="/admin/operations/reports" style={railLinkStyle(false)}>Operations Reports</Link>
        </nav>
      </aside>

      <div style={{ flex: 1, minWidth: 0 }}>
      {/* Top header */}
      <div style={{ background: '#101A26', borderBottom: '1px solid #1E2A3A' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: '20px 24px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
            <button
              onClick={() => setNavOpen(!navOpen)}
              aria-label="Open menu"
              className="dash-hamburger"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 38, height: 38, borderRadius: 9, border: '1px solid #3A322A',
                background: '#1C1710', color: '#F0EBE3', cursor: 'pointer', fontSize: 17, flexShrink: 0,
              }}
            >
              ☰
            </button>
            <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: '0.02em' }}>{greet()}, Mr Mahendra</span>
            <span style={{ fontSize: 12, color: theme.gold, fontWeight: 600, padding: '3px 10px', border: `1px solid ${theme.gold}55`, borderRadius: 999 }}>Boma Cafe</span>
          </div>
          <p style={{ margin: 0, fontSize: 13.5, color: theme.textDim }}>Inventory &amp; Financial Overview — every figure is calculated from the live transaction ledger.</p>

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
            <span style={{ width: 1, height: 24, background: theme.border }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: theme.textDim }}>Pick week</span>
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
            <button
              onClick={applyWeek}
              style={{
                padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                border: `1px solid ${theme.border}`, background: theme.panel, color: theme.gold,
              }}
            >
              Show
            </button>
            <button
              onClick={refresh}
              style={{
                padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                border: `1px solid ${theme.gold}66`, background: theme.panel, color: theme.gold,
              }}
              title="Reload figures from the ledger"
            >
              ↻ Refresh
            </button>
            <span style={{ fontSize: 11, color: theme.textDim }}>auto-refreshes every 60s</span>
            <span style={{ width: 1, height: 24, background: theme.border }} />
            <Link href="/admin/operations" style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.panel, color: theme.gold, fontSize: 12.5, fontWeight: 600, textDecoration: 'none' }}>Go to Admin</Link>
            <Link href="/" style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.panel, color: theme.gold, fontSize: 12.5, fontWeight: 600, textDecoration: 'none' }}>View Website</Link>
            <button
              onClick={() => { window.location.href = '/api/admin/auth?action=logout&redirect=/admin/login' }}
              title="Sign out"
              style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(232,84,84,0.4)', background: 'rgba(232,84,84,0.1)', color: '#F17777', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {weekApplied && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, maxWidth: 1240, margin: '0 auto', padding: '12px 24px 0' }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: theme.gold, letterSpacing: '0.02em' }}>
            Showing Week {weekApplied.w} of {weekApplied.y} · Mon {fmtDay(weekApplied.start)} – Sun {fmtDay(weekApplied.end)}
          </span>
          <button
            onClick={() => { setWeekApplied(null); setPeriod('this_week') }}
            style={{ marginLeft: 'auto', padding: '5px 10px', borderRadius: 7, border: `1px solid ${theme.border}`, background: 'transparent', color: theme.textDim, fontSize: 11.5, cursor: 'pointer' }}
          >
            ✕ Clear week
          </button>
        </div>
      )}

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

            {/* ── Stock used boards: Kitchen / Bar / General / Gas ── */}
            <div style={{ marginBottom: 26 }}>
              <SectionHeadingTitle title="STOCK USED - WHERE IT SITS" subtitle="What you bought and used in this period, split by section. Click a board to open it." />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginTop: 14 }}>
                {data.boards.map(board => (
                  <StockBoardCard key={board.key} board={board} theme={theme} accent={boardAccent[board.key]} />
                ))}
              </div>
              <p style={{ marginTop: 10, fontSize: 11, color: theme.textDim }}>
                Values at last known cost per unit, from the live ledger. Gas cylinders are counted on hand, not costed.
              </p>
            </div>

            {/* ── Suppliers: what you owe + recently paid ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 16, marginBottom: 22 }}>
              <ExcelCard
                title="WHAT YOU OWE SUPPLIERS"
                subtitle={data.supplierPaymentsEnabled ? 'Open invoices, net of payments' : 'Invoicing not yet enabled (migration 064)'}
                top={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 22, fontWeight: 800, color: owedSuppliers.length > 0 ? theme.red : theme.green, fontVariantNumeric: 'tabular-nums' }}>
                      {fmtR0(data.kpi.supplierOutstanding)}
                    </span>
                    <span style={{ fontSize: 11.5, color: theme.textDim }}>
                      {owedSuppliers.length === 0 ? 'Nothing owed' : `${owedSuppliers.length} supplier${owedSuppliers.length > 1 ? 's' : ''} owed`}
                    </span>
                  </div>
                }
              >
                {visibleSuppliers.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 13, color: theme.textDim }}>
                    No suppliers on file, or no open balances.
                  </p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={table}>
                      <thead>
                        <tr>
                          <th style={thStyle}>Supplier</th>
                          <th style={thRight}>Invoiced This Week</th>
                          <th style={thRight}>Invoiced This Month</th>
                          <th style={thRight}>Outstanding</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleSuppliers.map(s => {
                          const owed = s.outstanding > 0.004
                          return (
                            <tr key={s.supplierId ?? s.supplierName} style={{ opacity: owed ? 1 : 0.55 }}>
                              <td style={tdStyle}>
                                <Link href={s.supplierId ? `/admin/operations/suppliers/${s.supplierId}` : '#'} style={{ color: theme.ink, textDecoration: 'none' }}>
                                  {s.supplierName}
                                </Link>
                                {owed && <span style={{ marginLeft: 8, fontSize: 10, color: theme.red, fontWeight: 700 }}>●&nbsp;OWED</span>}
                              </td>
                              <td style={tdRight}>{fmtR0(s.week)}</td>
                              <td style={tdRight}>{fmtR0(s.month)}</td>
                              <td style={{ ...tdRight, fontWeight: 600, color: owed ? theme.red : theme.textDim }}>
                                {fmtR0(s.outstanding)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{ fontWeight: 700 }}>
                          <td style={{ padding: '9px 12px', borderTop: '2px solid #2A3A58', fontWeight: 700, color: theme.gold, fontSize: 12 }}>
                            {showAllSuppliers ? `TOTAL (all ${data.supplierTotal} suppliers)` : 'TOTAL OUTSTANDING'}
                          </td>
                          <td style={{ padding: '9px 12px', borderTop: '2px solid #2A3A58' }}></td>
                          <td style={{ padding: '9px 12px', borderTop: '2px solid #2A3A58' }}></td>
                          <td style={{ padding: '9px 12px', borderTop: '2px solid #2A3A58', fontWeight: 700, color: theme.gold }}>
                            {fmtR0(showAllSuppliers ? data.suppliers.reduce((a, s) => a + s.outstanding, 0) : data.kpi.supplierOutstanding)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
                <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setShowAllSuppliers(v => !v)}
                    style={{
                      background: 'none', border: `1px solid ${theme.border}`, color: theme.gold,
                      borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    {showAllSuppliers ? '▲ Show only what is owed' : `▼ Show all ${data.supplierTotal} suppliers & full history`}
                  </button>
                  <Link href="/inv/suppliers" style={{ fontSize: 12, color: theme.gold, fontWeight: 600 }}>Manage suppliers →</Link>
                </div>
              </ExcelCard>

              <ExcelCard
                title="RECENTLY PAID"
                subtitle={`Payments recorded in ${data.range.label.toLowerCase()}`}
              >
                {data.recentPayments.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 13, color: theme.textDim }}>
                    No supplier payments recorded in this period.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {data.recentPayments.map((p, i) => (
                      <div key={`${p.supplierId}-${p.at}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', borderRadius: 8, background: '#101A26', border: `1px solid ${theme.border}55` }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: theme.green }}>✓</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 13, color: theme.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.supplierName}</p>
                          <p style={{ margin: '1px 0 0', fontSize: 11, color: theme.textDim }}>
                            {new Date(p.at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: theme.green, fontVariantNumeric: 'tabular-nums' }}>{fmtR0(p.amount)}</span>
                      </div>
                    ))}
                    {data.kpi.supplierPayments > 0 && (
                      <p style={{ marginTop: 8, fontSize: 12, color: theme.textDim }}>
                        Total paid this period:{' '}
                        <span style={{ color: theme.green, fontWeight: 700 }}>{fmtR0(data.kpi.supplierPayments)}</span>
                      </p>
                    )}
                  </div>
                )}
                <div style={{ marginTop: 12 }}>
                  <Link href="/admin/operations/purchase-orders" style={{ fontSize: 12, color: theme.gold, fontWeight: 600 }}>Purchase orders &amp; payments →</Link>
                </div>
              </ExcelCard>
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
                          <Link href={`/admin/operations/locations/${loc.locationId}`} style={{ color: theme.ink, textDecoration: 'none' }}>
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

              {/* Management activity (Mission E8) */}
              <ExcelCard title="MANAGEMENT ACTIVITY" subtitle="Latest admin actions, attributed to the manager who did them">
                {managementActivity.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 13, color: theme.textDim }}>No management activity recorded yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {managementActivity.map(a => (
                      <div key={a.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <span style={{ fontSize: 15, width: 20, color: theme.gold }}>◆</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 13, color: theme.ink }}>
                            <span style={{ color: theme.gold, fontWeight: 700 }}>{a.admin_name || 'Legacy admin'}</span>{' '}
                            {adminActionLabel(a.action)} {a.target_type || ''}
                          </p>
                          <p style={{ margin: '1px 0 0', fontSize: 11, color: theme.textDim }}>
                            {a.admin_role ? rolePretty(a.admin_role) : ''} · {new Date(a.created_at).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
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

      {/* Mobile nav drawer (same as /inv) */}
      {navOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 70, display: 'flex', justifyContent: 'flex-end' }}
          onClick={() => setNavOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: 280, height: '100%', background: '#1C1710', padding: '18px 14px', overflowY: 'auto' }}
          >
            {NAV_GROUPS.map(group => (
              <div key={group.label}>
                <p style={railGroupStyle}>{group.label}</p>
                <nav style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {group.items.map(item => (
                    <Link key={item.href} href={item.href} style={railLinkStyle(isActive(item.href))}>
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          aside.dash-rail { display: none; }
        }
        @media (min-width: 901px) {
          .dash-hamburger { display: none !important; }
        }
      `}</style>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section heading
// ---------------------------------------------------------------------------

function SectionHeadingTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
      <h2 style={{ margin: 0, fontSize: 13.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: theme.ink }}>{title}</h2>
      {subtitle && <span style={{ fontSize: 11, color: theme.textDim }}>{subtitle}</span>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stock used board (Kitchen / Bar / General / Gas)
// ---------------------------------------------------------------------------

function StockBoardCard({ board, theme, accent }: { board: OwnerDashboardData['boards'][number]; theme: any; accent: { color: string; bg: string } }) {
  const maxV = Math.max(board.purchased, board.used, 1)
  const net = board.purchased - board.used
  const initial = board.label.replace(' Stock', '').replace(' Tracker', '').slice(0, 3).toUpperCase()

  return (
    <Link
      href={board.href}
      style={{
        display: 'block', textDecoration: 'none',
        background: theme.panel, border: `1px solid ${theme.panelBorder}`, borderRadius: 12,
        padding: '16px 18px 14px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ width: 34, height: 34, borderRadius: 9, background: accent.bg, color: accent.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, letterSpacing: '0.04em' }}>
          {board.key === 'gas' ? 'FLAME' : initial}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: theme.ink }}>{board.label}</p>
          <p style={{ margin: '1px 0 0', fontSize: 11, color: theme.textDim }}>
            {board.key === 'gas' && board.cylinders != null
              ? `${board.cylinders} cylinder${board.cylinders === 1 ? '' : 's'} on hand`
              : `${board.items} item${board.items === 1 ? '' : 's'} on hand`}
          </p>
        </div>
        <span style={{ fontSize: 15, color: theme.textDim }}>→</span>
      </div>

      <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: theme.ink, fontVariantNumeric: 'tabular-nums' }}>
        {fmtR0(board.value)}
      </p>
      <p style={{ margin: '0 0 10px', fontSize: 10.5, color: theme.textDim, fontWeight: 600 }}>STOCK VALUE AT COST</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 42, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', color: theme.gold }}>BOUGHT</span>
          <div style={{ flex: 1, height: 8, background: '#1A2434', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${Math.max(2, (board.purchased / maxV) * 100)}%`, height: '100%', background: theme.gold, borderRadius: 4 }} />
          </div>
          <span style={{ width: 74, textAlign: 'right', fontSize: 12, fontWeight: 700, color: theme.gold, fontVariantNumeric: 'tabular-nums' }}>{fmtR0(board.purchased)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 42, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', color: theme.blue }}>USED</span>
          <div style={{ flex: 1, height: 8, background: '#1A2434', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${Math.max(2, (board.used / maxV) * 100)}%`, height: '100%', background: theme.blue, borderRadius: 4 }} />
          </div>
          <span style={{ width: 74, textAlign: 'right', fontSize: 12, fontWeight: 700, color: theme.blue, fontVariantNumeric: 'tabular-nums' }}>{fmtR0(board.used)}</span>
        </div>
      </div>

      <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${theme.border}` }}>
        <span style={{ fontSize: 11.5, color: net > 0 ? theme.green : theme.textDim, fontWeight: 600 }}>
          Net: {net > 0 ? '+' : ''}{fmtR0(net)} {net > 0 ? 'stocked up' : net < 0 ? 'drawn down' : 'even'}
        </span>
        {board.wastage > 0.004 && (
          <span style={{ marginLeft: 12, fontSize: 11.5, color: theme.red, fontWeight: 600 }}>
            Wastage {fmtR0(board.wastage)}
          </span>
        )}
      </div>
    </Link>
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

function owedSummary(data: OwnerDashboardData): ReactNode {
  const owed = data.suppliers.filter(s => s.outstanding > 0.004).length
  if (owed === 0) return <span style={{ color: theme.green }}>Nothing owed right now</span>
  return (
    <span>
      {owed} supplier{owed > 1 ? 's' : ''} owed · {data.recentPayments.length} payment{data.recentPayments.length === 1 ? '' : 's'} this period
    </span>
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

function adminActionLabel(action: string): string {
  const map: Record<string, string> = {
    'auth.login': 'signed in',
    'auth.logout': 'signed out',
    'admin_accounts.create': 'created admin account',
    'admin_accounts.update': 'updated admin account',
    'admin_accounts.delete': 'deactivated admin account',
    'admin_accounts.force_logout': 'force-logged-out',
    'waiters.create': 'created waiter',
    'waiters.update': 'updated waiter',
    'waiters.delete': 'deleted waiter',
    'staff.pin_reset': 'reset staff PIN',
    'bookings.status_change': 'changed booking status',
  }
  return map[action] ?? action
}

function rolePretty(role: string): string {
  const map: Record<string, string> = {
    owner: 'Owner',
    full_manager: 'Main Manager',
    manager: 'Manager',
    assistant_manager: 'Assistant Manager',
  }
  return map[role] ?? role
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