'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  C, PageTitle, Card, SearchBox, Select, DateInput, Button, ExportButton, Empty, Loading,
  DataTable, formatMoney, formatQty, exportCsv, type Column,
} from '../kit'

type SheetRow = {
  productId: string
  productName: string
  sku: string | null
  category: string | null
  unit: string | null
  opening: number
  received: number
  used: number
  waste: number
  adjustments: number
  closing: number
  unitCost: number
  value: number
}

interface SheetResponse {
  rows: SheetRow[]
  totals: { opening: number; received: number; used: number; waste: number; adjustments: number; closing: number; value: number }
  from: string
  to: string
  locationId: string | null
  locationName: string | null
}

type Location = { id: string; name: string; is_active: boolean }

const PRESETS = [
  { label: 'Today', days: 0 },
  { label: 'This Week', days: 6 },
  { label: 'This Month', days: 29 },
  { label: 'Last 30 Days', days: 29 },
]

function presetRange(days: number): { from: string; to: string } {
  const to = new Date()
  const from = new Date()
  from.setDate(to.getDate() - days)
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
}

const PAGE = 60

export default function StockSheetPage() {
  const [rows, setRows] = useState<SheetRow[]>([])
  const [totals, setTotals] = useState<SheetResponse['totals'] | null>(null)
  const [locationName, setLocationName] = useState('All locations')
  const [locations, setLocations] = useState<Location[]>([])
  const [locationId, setLocationId] = useState('')
  const [from, setFrom] = useState(() => presetRange(6).from)
  const [to, setTo] = useState(() => presetRange(6).to)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [sortKey, setSortKey] = useState('productName')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const loadLocations = useCallback(async () => {
    const res = await fetch('/api/inventory/locations')
    const json = await res.json()
    const active = (json.data ?? []).filter((l: Location) => l.is_active)
    setLocations(active)
  }, [])

  const load = useCallback(async (f: string, t: string, loc: string) => {
    setLoading(true)
    setError('')
    const params = new URLSearchParams({ from: f, to: t })
    if (loc) params.set('location_id', loc)
    try {
      const res = await fetch(`/api/inventory/stock-sheet?${params.toString()}`)
      const json = await res.json()
      if (json.error) throw new Error(json.error.message)
      const d = json.data as SheetResponse
      setRows(d.rows ?? [])
      setTotals(d.totals ?? null)
      setLocationName(d.locationName ?? 'All locations')
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stock sheet')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadLocations() }, [loadLocations])
  useEffect(() => {
    setPage(0)
    void load(from, to, locationId)
  }, [from, to, locationId, load])

  const categories = useMemo(() => [...new Set(rows.map(r => r.category).filter((c): c is string => !!c))].sort(), [rows])

  const filtered = useMemo(() => {
    let out = rows
    if (search) {
      const q = search.toLowerCase()
      out = out.filter(r => r.productName.toLowerCase().includes(q) || (r.sku ?? '').toLowerCase().includes(q))
    }
    if (category) out = out.filter(r => r.category === category)
    return out
  }, [rows, search, category])

  const columns: Column<SheetRow>[] = [
    { key: 'productName', header: 'Product', sortable: true, render: r => <span style={{ color: C.text, fontWeight: 600 }}>{r.productName}</span>, csv: r => r.productName },
    { key: 'sku', header: 'SKU', render: r => r.sku ?? '—', csv: r => r.sku ?? '' },
    { key: 'category', header: 'Category', render: r => r.category ?? '—', csv: r => r.category ?? '' },
    { key: 'unit', header: 'Unit', render: r => r.unit ?? '—', csv: r => r.unit ?? '' },
    { key: 'opening', header: 'Opening', align: 'right', sortable: true, render: r => <Num v={r.opening} />, csv: r => r.opening },
    { key: 'received', header: 'Received', align: 'right', sortable: true, render: r => <Num v={r.received} good />, csv: r => r.received },
    { key: 'used', header: 'Used', align: 'right', sortable: true, render: r => <Num v={r.used} warn />, csv: r => r.used },
    { key: 'waste', header: 'Waste', align: 'right', sortable: true, render: r => <Num v={r.waste} danger />, csv: r => r.waste },
    { key: 'adjustments', header: 'Adjustments', align: 'right', sortable: true, render: r => <Num v={r.adjustments} />, csv: r => r.adjustments },
    { key: 'closing', header: 'Closing', align: 'right', sortable: true, render: r => <Num v={r.closing} bold />, csv: r => r.closing },
    { key: 'unitCost', header: 'Cost/Unit', align: 'right', sortable: true, render: r => <span style={numGold}>{formatMoney(r.unitCost)}</span>, csv: r => r.unitCost },
    { key: 'value', header: 'Value', align: 'right', sortable: true, render: r => <span style={numGold}>{formatMoney(r.value)}</span>, csv: r => r.value },
  ]

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => {
      const col = columns.find(c => c.key === sortKey)
      if (!col) return 0
      const va = col.render(a)
      const vb = col.render(b)
      const na = typeof va === 'number' ? va : (va as string) ?? ''
      const nb = typeof vb === 'number' ? vb : (vb as string) ?? ''
      return (na < nb ? -1 : na > nb ? 1 : 0) * (sortDir === 'asc' ? 1 : -1)
    }),
    [filtered, sortKey, sortDir, columns],
  )

  const pageRows = sorted.slice(page * PAGE, page * PAGE + PAGE)
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE))

  const doExport = () => {
    exportCsv(
      `stock-sheet-${from}-to-${to}.csv`,
      columns.map(c => c.header),
      filtered.map(r => columns.map(c => (c.csv ? c.csv(r) : String(c.render(r) ?? '').replace(/<[^>]+>/g, '')))),
    )
  }

  return (
    <div>
      <PageTitle
        title="Stock Sheet"
        subtitle="Every product's movement — opening, received, used, waste, adjustments and closing — calculated from the ledger. Excel-style, exportable."
        right={<ExportButton onClick={doExport} disabled={filtered.length === 0} />}
      />

      {/* Filter bar */}
      <Card style={{ marginBottom: 16 }} pad={14}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => { const r = presetRange(p.days); setFrom(r.from); setTo(r.to) }} style={{
              padding: '8px 13px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
              border: '1px solid #3A322A', background: '#1C1710', color: '#B8B0A0',
            }}>{p.label}</button>
          ))}
          <DateInput value={from} onChange={setFrom} style={{ maxWidth: 150 }} />
          <span style={{ color: C.textMuted, fontSize: 12 }}>→</span>
          <DateInput value={to} onChange={setTo} style={{ maxWidth: 150 }} />
          <Select value={locationId} onChange={setLocationId} style={{ maxWidth: 190 }}>
            <option value="">All locations</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </Select>
          <Select value={category} onChange={setCategory} style={{ maxWidth: 190 }}>
            <option value="">All categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
          <SearchBox value={search} onChange={setSearch} placeholder="Search product or SKU…" style={{ flex: 1, minWidth: 200 }} />
        </div>
      </Card>

      {/* KPI strip */}
      {totals && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Opening value', v: totals.opening },
            { label: 'Received', v: totals.received },
            { label: 'Used', v: totals.used },
            { label: 'Waste', v: totals.waste },
            { label: 'Adjustments', v: totals.adjustments },
            { label: 'Closing value', v: totals.value, gold: true },
          ].map(k => (
            <div key={k.label} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 16px' }}>
              <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted }}>{k.label}</p>
              <p style={{ margin: '6px 0 0', fontSize: 18, fontWeight: 800, color: k.gold ? C.goldBright : C.text, ...numGold }}>{formatQty(k.v)}</p>
            </div>
          ))}
        </div>
      )}

      {error && <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(232,84,84,0.1)', border: '1px solid rgba(232,84,84,0.4)', color: C.dangerText, fontSize: 13, marginBottom: 16 }}>{error}</div>}

      <Card>
        {loading ? <Loading /> : rows.length === 0 ? (
          <Empty title="No movement in this period" message="Try a wider date range or another location." />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={pageRows}
              sortKey={sortKey}
              setSortKey={setSortKey}
              sortDir={sortDir}
              setSortDir={setSortDir}
              rowKey={r => r.productId}
              minWidth={1120}
            />
            {/* Pagination + totals */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 4px 0', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12.5, color: C.textMuted }}>
                {filtered.length} product{filtered.length !== 1 ? 's' : ''} · {locationName} · {from} → {to}
                {lastUpdated ? ` · updated ${lastUpdated.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}` : ''}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Button variant="ghost" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>‹ Prev</Button>
                <span style={{ fontSize: 12.5, color: C.textMuted, fontVariantNumeric: 'tabular-nums' }}>{page + 1} / {pages}</span>
                <Button variant="ghost" onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1}>Next ›</Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

function Num({ v, good, warn, danger, bold }: { v: number; good?: boolean; warn?: boolean; danger?: boolean; bold?: boolean }) {
  const color = danger ? C.dangerText : warn ? C.warningText : good ? C.successText : C.textSoft
  return <span style={{ color: bold ? C.text : color, fontWeight: bold ? 800 : 600, ...numGold }}>{formatQty(v)}</span>
}

const numGold: React.CSSProperties = { fontVariantNumeric: 'tabular-nums' }
