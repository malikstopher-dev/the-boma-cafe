'use client'

import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'

// ─── Tokens ────────────────────────────────────────────────────────────────
// "Warm Gold Dark" — matches the Boma Café operations platform identity.

export const C = {
  bg: '#14100B',
  bgRaised: '#1C1710',
  bgCard: '#211B13',
  bgCardHover: '#282116',
  border: '#3A322A',
  borderStrong: '#54493A',
  gold: '#C8A04E',
  goldBright: '#E0BC6E',
  goldMuted: 'rgba(200,160,78,0.14)',
  text: '#F0EBE3',
  textSoft: '#B8B0A0',
  textMuted: '#8A8072',
  faint: '#665D50',
  success: '#6BBF59',
  successText: '#8AD47A',
  warning: '#F0B429',
  warningText: '#F5C64C',
  danger: '#E85454',
  dangerText: '#F17777',
  info: '#5AA9E6',
  infoText: '#7FC0F0',
  font: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', Menlo, monospace",
  radius: '10px',
  radiusSm: '6px',
  shadowCard: '0 1px 0 rgba(255,255,255,0.02) inset, 0 6px 24px rgba(0,0,0,0.35)',
} as const

export const num: CSSProperties = { fontVariantNumeric: 'tabular-nums', fontFamily: C.mono }
export const numGold: CSSProperties = { ...num, color: C.goldBright, fontWeight: 700 }

// ─── Formatting ────────────────────────────────────────────────────────────

export const formatMoney = (v: number | null | undefined): string => {
  const n = Number(v ?? 0)
  const neg = n < 0
  const s = Math.abs(n).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${neg ? '−' : 'R'}${s}`
}

export const formatMoneyR = (v: number | null | undefined): string => {
  const n = Number(v ?? 0)
  const neg = n < 0
  const s = Math.abs(n).toLocaleString('en-ZA', { maximumFractionDigits: 0 })
  return `${neg ? '−R' : 'R'}${s}`
}

export const formatQty = (v: number | null | undefined, digits = 1): string => {
  const n = Number(v ?? 0)
  const s = n.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: digits })
  return n < 0 ? `−${Math.abs(n).toLocaleString('en-ZA', { maximumFractionDigits: digits })}` : s
}

export const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}

export const formatDateShort = (iso: string | null | undefined): string => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' })
}

export const formatDateTime = (iso: string | null | undefined): string => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) + ', ' +
    d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
}

export const pctDelta = (cur: number | null | undefined, prev: number | null | undefined): number | null => {
  const c = Number(cur ?? 0)
  const p = Number(prev ?? 0)
  if (p === 0) return c === 0 ? 0 : null
  return ((c - p) / Math.abs(p)) * 100
}

export const isNegative = (cur: number, prev: number): boolean => cur - prev < 0

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

// ─── Period presets ─────────────────────────────────────────────────────────

export interface Period {
  key: 'this_week' | 'this_month' | 'last_7' | 'last_30' | 'custom'
  from: string
  to: string // inclusive display
  label: string
}

export function periodQuery(p: Period): string {
  const params = new URLSearchParams({ period: p.key, from: p.from, to: p.to })
  return params.toString()
}

export function defaultPeriod(): Period {
  return { key: 'this_week', from: mondayIso(), to: todayIso(), label: 'This week' }
}

function mondayIso(): string {
  const d = new Date()
  const dow = d.getDay() || 7
  d.setDate(d.getDate() - (dow - 1))
  return d.toISOString().slice(0, 10)
}

// ─── Components ─────────────────────────────────────────────────────────────

export function PageTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
      <div style={{ minWidth: 0 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', color: C.text }}>{title}</h1>
        {subtitle && <p style={{ margin: '6px 0 0', fontSize: 13.5, color: C.textMuted, maxWidth: 620 }}>{subtitle}</p>}
      </div>
      {right && <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>{right}</div>}
    </div>
  )
}

export function Card({ title, subtitle, action, children, style, pad = 20 }: {
  title?: string; subtitle?: string; action?: ReactNode; children: ReactNode;
  style?: CSSProperties; pad?: number
}) {
  return (
    <section style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: C.radius, boxShadow: C.shadowCard, ...style }}>
      {(title || action) && (
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '16px 20px 0' }}>
          <div>
            {title && <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: C.text, letterSpacing: '0.01em' }}>{title}</h3>}
            {subtitle && <p style={{ margin: '3px 0 0', fontSize: 12.5, color: C.textMuted }}>{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div style={{ padding: title || action ? pad : pad }}>{children}</div>
    </section>
  )
}

export function Kpi({ label, value, sub, delta, tone = 'neutral', icon }: {
  label: string
  value: string
  sub?: string
  delta?: number | null // % change vs previous period
  tone?: 'neutral' | 'gold' | 'good' | 'danger'
  icon?: string
}) {
  const deltaColor = delta === null || delta === undefined ? C.textMuted :
    delta >= 0 ? (label.toLowerCase().includes('owed') || label.toLowerCase().includes('waste') ? C.dangerText : C.successText)
    : (label.toLowerCase().includes('owed') || label.toLowerCase().includes('waste') ? C.successText : C.dangerText)
  const valueColor = tone === 'gold' ? C.goldBright : tone === 'good' ? C.successText : tone === 'danger' ? C.dangerText : C.text
  return (
    <div style={{
      background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: C.radius, boxShadow: C.shadowCard,
      padding: '18px 20px', minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: C.textMuted }}>{label}</p>
      </div>
      <p style={{ margin: '10px 0 0', fontSize: 27, fontWeight: 800, letterSpacing: '-0.02em', color: valueColor, ...num }}>{value}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, minHeight: 16 }}>
        {delta !== undefined && (
          <span style={{ fontSize: 12, fontWeight: 700, color: deltaColor, ...num }}>
            {delta === null ? 'new' : `${delta > 0.05 ? '▲' : delta < -0.05 ? '▼' : '•'} ${Math.abs(delta).toFixed(1)}%`}
          </span>
        )}
        {sub && <span style={{ fontSize: 12, color: C.textMuted }}>{sub}</span>}
      </div>
    </div>
  )
}

export type Tone = 'neutral' | 'gold' | 'good' | 'warning' | 'danger' | 'info' | 'muted'

const toneMap: Record<Tone, { fg: string; bg: string }> = {
  neutral: { fg: C.textSoft, bg: '#2A241A' },
  gold: { fg: C.goldBright, bg: C.goldMuted },
  good: { fg: C.successText, bg: 'rgba(107,188,89,0.12)' },
  warning: { fg: C.warningText, bg: 'rgba(240,180,41,0.12)' },
  danger: { fg: C.dangerText, bg: 'rgba(232,84,84,0.12)' },
  info: { fg: C.infoText, bg: 'rgba(90,158,230,0.12)' },
  muted: { fg: C.textMuted, bg: '#2B231A' },
}

export function Badge({ children, tone = 'neutral', style }: { children: ReactNode; tone?: Tone; style?: CSSProperties }) {
  const t = toneMap[tone]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999,
      fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
      color: t.fg, background: t.bg, whiteSpace: 'nowrap', ...style,
    }}>{children}</span>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted }}>{label}</span>
      {children}
    </label>
  )
}

const controlBase: CSSProperties = {
  background: '#241D14', color: C.text, border: `1px solid ${C.border}`, borderRadius: 8,
  padding: '9px 12px', fontSize: 13.5, outline: 'none', transition: 'border-color 0.15s ease',
}

export function Select({ value, onChange, children, style }: { value: string; onChange: (v: string) => void; children: ReactNode; style?: CSSProperties }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ ...controlBase, ...style }}>
      {children}
    </select>
  )
}

export function SearchBox({ value, onChange, placeholder, style }: { value: string; onChange: (v: string) => void; placeholder?: string; style?: CSSProperties }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder ?? 'Search…'}
      style={{ ...controlBase, minWidth: 200, ...style }}
    />
  )
}

export function TextInput({ value, onChange, placeholder, type = 'text', style }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; style?: CSSProperties }) {
  return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ ...controlBase, ...style }} />
}

export function DateInput({ value, onChange, style }: { value: string; onChange: (v: string) => void; style?: CSSProperties }) {
  return <input type="date" value={value} onChange={e => onChange(e.target.value)} style={{ ...controlBase, ...style }} />
}

// ─── Sortable table ─────────────────────────────────────────────────────────

export interface Column<T> {
  key: string
  header: string
  align?: 'left' | 'right' | 'center'
  sortable?: boolean
  className?: string
  render: (row: T) => ReactNode
  csv?: (row: T) => string | number
}

export function sortRows<T>(rows: T[], cols: Column<T>[], sortKey: string, dir: 'asc' | 'desc'): T[] {
  const col = cols.find(c => c.key === sortKey)
  if (!col) return rows
  return [...rows].sort((a, b) => {
    const va = col.render(a)
    const vb = col.render(b)
    const na = typeof va === 'number' ? va : (va as ReactNode) == null ? -Infinity : String(va)
    const nb = typeof vb === 'number' ? vb : (vb as ReactNode) == null ? -Infinity : String(vb)
    const cmp = na < nb ? -1 : na > nb ? 1 : 0
    return dir === 'asc' ? cmp : -cmp
  })
}

export function DataTable<T extends Record<string, unknown>>({ columns: cols, rows, sortKey, setSortKey, sortDir, setSortDir, empty, footer, minWidth, rowKey }: {
  columns: Column<T>[]
  rows: T[]
  sortKey: string
  setSortKey: (k: string) => void
  sortDir: 'asc' | 'desc'
  setSortDir: (d: 'asc' | 'desc') => void
  empty?: string
  footer?: ReactNode
  minWidth?: number
  rowKey?: (row: T) => string
}) {
  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir(key.toLowerCase().includes('value') || key.toLowerCase().includes('cost') || key.toLowerCase().includes('total') ? 'desc' : 'asc') }
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: minWidth ?? 720 }}>
        <thead>
          <tr>
            {cols.map(c => (
              <th
                key={c.key}
                onClick={c.sortable ? () => handleSort(c.key) : undefined}
                style={{
                  textAlign: c.align ?? 'left', padding: '10px 12px', whiteSpace: 'nowrap',
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
                  color: C.textMuted, borderBottom: `1px solid ${C.borderStrong}`, cursor: c.sortable ? 'pointer' : 'default',
                  userSelect: 'none',
                }}
              >
                {c.header}{c.sortable && <span style={{ marginLeft: 4, color: sortKey === c.key ? C.goldBright : C.borderStrong, fontSize: 10 }}>
                  {sortKey === c.key ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                </span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={cols.length} style={{ padding: '28px 12px', textAlign: 'center', color: C.textMuted, fontSize: 13 }}>
                {empty ?? 'No records for the selected filters.'}
              </td>
            </tr>
          )}
          {rows.map(r => (
            <tr key={rowKey ? rowKey(r) : ((r as { id?: string }).id ?? `row-${rows.indexOf(r)}`)} style={{ borderBottom: `1px solid ${C.border}`, transition: 'background 0.12s ease' }}
              onMouseEnter={e => (e.currentTarget.style.background = C.bgRaised)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {cols.map(c => (
                <td key={c.key} style={{
                  textAlign: c.align ?? 'left', padding: '11px 12px', color: C.textSoft,
                  whiteSpace: c.align === 'right' ? 'nowrap' : 'normal', verticalAlign: 'top',
                }}>
                  {c.render(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer && <tfoot>
          <tr>
            <td colSpan={cols.length} style={{ padding: '12px', borderTop: `2px solid ${C.borderStrong}`, color: C.goldBright, fontWeight: 700, fontSize: 13.5 }}>
              {footer}
            </td>
          </tr>
        </tfoot>}
      </table>
    </div>
  )
}

// ─── CSV export (client-side) ───────────────────────────────────────────────

export function exportCsv(filename: string, header: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const body = [header.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\n')
  const blob = new Blob(['\uFEFF' + body], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export function ExportButton({ onClick, label = 'Export CSV', disabled }: { onClick: () => void; label?: string; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 8,
      background: C.bgCard, border: `1px solid ${C.borderStrong}`, color: C.textSoft, fontSize: 13,
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
    }}>
      ⤓ {label}
    </button>
  )
}

export function Button({ children, onClick, variant = 'primary', disabled, style }: {
  children: ReactNode; onClick?: () => void; variant?: 'primary' | 'ghost' | 'danger' | 'success'; disabled?: boolean; style?: CSSProperties
}) {
  const v: Record<string, CSSProperties> = {
    primary: { background: C.gold, color: '#171208', fontWeight: 700, border: 'none' },
    ghost: { background: 'transparent', color: C.textSoft, border: `1px solid ${C.borderStrong}` },
    danger: { background: 'rgba(232,84,84,0.12)', color: C.dangerText, border: `1px solid rgba(232,84,84,0.4)` },
    success: { background: 'rgba(107,188,89,0.14)', color: C.successText, border: `1px solid rgba(107,188,89,0.4)` },
  }
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '9px 15px', borderRadius: 8, fontSize: 13.5, cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1, transition: 'filter 0.15s ease', ...v[variant], ...style,
    }}>
      {children}
    </button>
  )
}

export function Loading() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, color: C.textMuted, fontSize: 13 }}>
      <span style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${C.border}`, borderTopColor: C.gold, animation: 'invspin 0.8s linear infinite' }} />
      Loading…
      <style>{`@keyframes invspin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

export function Empty({ title, message }: { title: string; message?: string }) {
  return (
    <div style={{ padding: '42px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 26, opacity: 0.5 }}>◷</div>
      <p style={{ margin: '10px 0 0', fontSize: 14.5, fontWeight: 600, color: C.textSoft }}>{title}</p>
      {message && <p style={{ margin: '6px 0 0', fontSize: 12.5, color: C.textMuted }}>{message}</p>}
    </div>
  )
}

// ─── Mini pure-CSS bar chart (restrained) ───────────────────────────────────

export function MiniBars({ points, label }: { points: Array<{ date: string; purchased: number; used: number }>; label: string }) {
  const maxVal = Math.max(1, ...points.map(p => Math.max(p.purchased, p.used)))
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 92, marginTop: 8 }}>
      {points.length === 0 && <span style={{ fontSize: 12.5, color: C.textMuted, alignSelf: 'center' }}>No movement in this period.</span>}
      {points.map(p => (
        <div key={p.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1, minWidth: 8 }} title={`${formatDate(p.date)}\npurchased ${formatMoneyR(p.purchased)}\nused ${formatMoneyR(p.used)}`}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 1, height: 70 }}>
            <div style={{ width: 9, borderRadius: 3, background: C.gold, height: `${(p.used / maxVal) * 100}%` }} />
            <div style={{ width: 9, borderRadius: 3, background: '#4A4034', height: `${(p.purchased / maxVal) * 100}%` }} />
          </div>
          <span style={{ fontSize: 9.5, color: C.textMuted, letterSpacing: '0.04em' }}>{formatDateShort(p.date)}</span>
        </div>
      ))}
      {points.length > 0 && (
        <div style={{ marginLeft: 10, display: 'flex', flexDirection: 'column', gap: 2, fontSize: 10.5, color: C.textMuted }}>
          <span style={{ color: C.gold }}>■ Used</span>
          <span style={{ color: '#4A4034' }}>■ Purchased</span>
        </div>
      )}
    </div>
  )
}

// ─── Section label ──────────────────────────────────────────────────────────

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p style={{ margin: '26px 0 10px', fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.textMuted }}>{children}</p>
}

export const EMPTY_STRING = ''