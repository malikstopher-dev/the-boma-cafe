'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  C, PageTitle, Card, Loading, Empty, ExportButton, DataTable, formatMoney, exportCsv, type Column,
} from '../kit'

type LocRow = {
  locationId: string
  name: string
  items: number
  value: number
  pct: number
  movement: number
}

export default function LocationsPage() {
  const [rows, setRows] = useState<LocRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sortKey, setSortKey] = useState('value')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/inventory/owner-dashboard?period=last_30')
      const json = await res.json()
      if (json.error) throw new Error(json.error.message)
      setRows((json.data.locations ?? []) as LocRow[])
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load locations')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const filtered = rows.filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
  const total = rows.reduce((s, r) => s + r.value, 0)
  const totalItems = rows.reduce((s, r) => s + r.items, 0)

  const columns: Column<LocRow>[] = [
    {
      key: 'name', header: 'Location', sortable: true,
      render: r => (
        <Link href={`/admin/operations/locations/${r.locationId}`} style={{ color: C.goldBright, textDecoration: 'none', fontWeight: 600 }}>
          {r.name}
        </Link>
      ),
      csv: r => r.name,
    },
    { key: 'items', header: 'Items', align: 'right', sortable: true, render: r => r.items, csv: r => r.items },
    { key: 'value', header: 'Stock Value', align: 'right', sortable: true, render: r => (<span style={{ color: C.text, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(r.value)}</span>), csv: r => r.value },
    { key: 'pct', header: '% of Total', align: 'right', sortable: true, render: r => (r.pct || 0).toFixed(1) + '%', csv: r => Number((r.pct || 0).toFixed(1)) },
    { key: 'movement', header: 'Net Movement', align: 'right', sortable: true, render: r => (
      <span style={{ color: r.movement > 0 ? C.successText : r.movement < 0 ? C.dangerText : C.textMuted, fontVariantNumeric: 'tabular-nums' }}>
        {formatMoney(r.movement)}
      </span>
    ), csv: r => r.movement },
  ]

  const sorted = [...filtered].sort((a, b) => {
    const col = columns.find(c => c.key === sortKey)
    if (!col) return 0
    const va = col.render(a)
    const vb = col.render(b)
    const na = typeof va === 'number' ? va : String(va ?? '')
    const nb = typeof vb === 'number' ? vb : String(vb ?? '')
    return (na < nb ? -1 : na > nb ? 1 : 0) * (sortDir === 'asc' ? 1 : -1)
  })

  return (
    <div>
      <PageTitle
        title="Stock by Location"
        subtitle="Where the money is sitting — items, value and share per storage location."
        right={
          <>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search locations…"
              style={{ background: '#1C1710', border: '1px solid #3A322A', color: '#F0EBE3', borderRadius: 8, padding: '8px 12px', fontSize: 13, minWidth: 180 }}
            />
            <ExportButton onClick={() => exportCsv(
              'stock-by-location.csv',
              columns.map(c => c.header),
              sorted.map(r => columns.map(c => (c.csv ? c.csv(r) : String(c.render(r) ?? '').replace(/<[^>]+>/g, '')))),
            )} disabled={sorted.length === 0} />
          </>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Locations', v: String(rows.length) },
          { label: 'Products on hand', v: String(totalItems) },
          { label: 'Total stock value', v: formatMoney(total), gold: true },
        ].map(k => (
          <div key={k.label} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 18px' }}>
            <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted }}>{k.label}</p>
            <p style={{ margin: '6px 0 0', fontSize: 22, fontWeight: 800, color: (k as { gold?: boolean }).gold ? C.goldBright : C.text, fontVariantNumeric: 'tabular-nums' }}>{k.v}</p>
          </div>
        ))}
      </div>

      {error && <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(232,84,84,0.1)', border: '1px solid rgba(232,84,84,0.4)', color: C.dangerText, fontSize: 13, marginBottom: 16 }}>{error}</div>}

      <Card>
        {loading ? <Loading /> : rows.length === 0 ? (
          <Empty title="No locations found" message="Active locations appear here once they hold stock." />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={sorted}
              sortKey={sortKey}
              setSortKey={setSortKey}
              sortDir={sortDir}
              setSortDir={setSortDir}
              rowKey={r => r.locationId}
              minWidth={760}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 2px 0', fontSize: 12.5, color: C.textMuted, flexWrap: 'wrap', gap: 8 }}>
              <span>Values estimated at latest purchase cost · 30-day movement shown</span>
              <span>{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}` : ''}</span>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}