'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

interface StockRow {
  product_id: string
  balance: number
  refreshed_at: string
  inventory_products: { name: string | null; sku: string | null; is_active: boolean | null }
}

interface Location {
  id: string
  name: string
  is_active: boolean
}

export default function StockPage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [locationId, setLocationId] = useState('')
  const [rows, setRows] = useState<StockRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadLocations = useCallback(async () => {
    const res = await fetch('/api/inventory/locations')
    const json = await res.json()
    if (json.data) {
      const active = (json.data as Location[]).filter((l) => l.is_active !== false)
      setLocations(active)
      if (active.length > 0) setLocationId((prev) => prev || active[0].id)
    }
  }, [])

  const loadStock = useCallback(async () => {
    if (!locationId) return
    setLoading(true)
    setError('')
    const params = new URLSearchParams({ page_size: '200' })
    if (search) params.set('search', search)
    const res = await fetch(`/api/inventory/locations/${locationId}/stock?${params}`)
    const json = await res.json()
    if (json.error) setError(json.error.message)
    else setRows(json.data ?? [])
    setLoading(false)
  }, [locationId, search])

  useEffect(() => { void loadLocations() }, [loadLocations])
  useEffect(() => { void loadStock() }, [loadStock])

  const totalUnits = rows.reduce((sum, r) => sum + (r.balance || 0), 0)
  const outOfStock = rows.filter((r) => (r.balance || 0) <= 0).length
  const activeCount = rows.filter((r) => r.balance > 0).length

  return (
    <div style={{ padding: 28, maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Stock Levels</h1>
      <p style={{ color: '#90A0B8', fontSize: 13, margin: '0 0 20px' }}>Live balances from the transaction ledger, per location.</p>

      {error && <p style={{ color: '#E05656', fontSize: 13 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 18 }}>
        <select
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          style={inputStyle}
        >
          {locations.length === 0 && <option value="">No locations</option>}
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <input
          placeholder="Search product or SKU…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, flex: 1, minWidth: 220 }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 22 }}>
        {[
          { label: 'Products on stock', value: activeCount, color: '#7FB069' },
          { label: 'Out of stock', value: outOfStock, color: outOfStock > 0 ? '#E05656' : '#7FB069' },
          { label: 'Total units', value: totalUnits.toFixed(1), color: '#C4A04E' },
        ].map((kpi) => (
          <div key={kpi.label} style={cardStyle}>
            <div style={{ fontSize: 24, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize: 12, color: '#90A0B8', marginTop: 2 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      <div style={cardStyle}>
        {loading ? (
          <p style={{ color: '#90A0B8', fontSize: 13 }}>Loading…</p>
        ) : rows.length === 0 ? (
          <p style={{ color: '#90A0B8', fontSize: 13 }}>No stock records for this location.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                {['Product', 'SKU', 'Balance', 'Status'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.product_id} style={trStyle}>
                  <td style={tdStyle}>
                    <span style={{ color: '#F0EDE8' }}>{r.inventory_products?.name ?? '—'}</span>
                  </td>
                  <td style={tdStyle}>{r.inventory_products?.sku ?? '—'}</td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: (r.balance || 0) <= 0 ? '#E05656' : '#7FB069' }}>
                    {r.balance ?? 0}
                  </td>
                  <td style={tdStyle}>
                    {(r.balance || 0) <= 0
                      ? <Badge tone="bad">OUT OF STOCK</Badge>
                      : <Badge tone="good">IN STOCK</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background: '#141E2B', color: '#E8E6F0', border: '1px solid #2A3648',
  borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none',
}

const cardStyle: React.CSSProperties = {
  background: '#141E2B', border: '1px solid #232A3A', borderRadius: 12, padding: 18,
}

const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' }
const thStyle: React.CSSProperties = {
  textAlign: 'left', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
  color: '#90A0B8', padding: '8px 10px', borderBottom: '1px solid #2A3648',
}
const tdStyle: React.CSSProperties = {
  padding: '10px', fontSize: 13, color: '#B9C2D4', borderBottom: '1px solid #232A3A',
}
const trStyle: React.CSSProperties = {}

function Badge({ children, tone }: { children: React.ReactNode; tone: 'good' | 'bad' }) {
  const colors = tone === 'good'
    ? { bg: '#12301A', fg: '#7FB069' }
    : { bg: '#3A1216', fg: '#E06060' }
  return (
    <span style={{
      background: colors.bg, color: colors.fg, fontSize: 11, fontWeight: 600,
      padding: '3px 8px', borderRadius: 6, letterSpacing: '0.04em',
    }}>{children}</span>
  )
}