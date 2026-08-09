'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

interface ProductRow {
  id: string
  name: string | null
  sku: string | null
  barcode: string | null
  inventory_type: string | null
  reorder_threshold: number | null
  current_balance?: number
  is_active: boolean
}

const TYPES = ['FOOD', 'BEVERAGE', 'CLEANING', 'PACKAGING', 'GENERAL'] as const

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([])
  const [search, setSearch] = useState('')
  const [invType, setInvType] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const params = new URLSearchParams({ page_size: '200', show_archived: 'false' })
    if (search) params.set('search', search)
    if (invType) params.set('inventory_type', invType)
    const res = await fetch(`/api/inventory/products?${params}`)
    const json = await res.json()
    if (json.error) setError(json.error.message)
    else setProducts(json.data ?? [])
    setLoading(false)
  }, [search, invType])

  useEffect(() => { void load() }, [load])

  const lowCount = products.filter((p) => p.reorder_threshold != null && (p.current_balance ?? 0) < p.reorder_threshold).length

  return (
    <div style={{ padding: 28, maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Products</h1>
      <p style={{ color: '#90A0B8', fontSize: 13, margin: '0 0 20px' }}>
        Your product catalogue. Maintenance happens in the main admin.{' '}
        <Link href="/admin/operations/products" style={{ color: '#C4A04E' }}>Open product management →</Link>
      </p>

      {error && <p style={{ color: '#E05656', fontSize: 13 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <input
          placeholder="Search name, SKU, or barcode…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, flex: 1, minWidth: 220 }}
        />
        <select value={invType} onChange={(e) => setInvType(e.target.value)} style={inputStyle}>
          <option value="">All types</option>
          {InventoryTypes().map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 22 }}>
        {[
          { label: 'Products', value: products.length, color: '#C4A04E' },
          { label: 'Active', value: products.filter((p) => p.is_active !== false).length, color: '#7FB069' },
          { label: 'Low stock alerts', value: lowCount, color: lowCount > 0 ? '#E0A060' : '#C4A04E' },
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
        ) : products.length === 0 ? (
          <p style={{ color: '#90A0B8', fontSize: 13 }}>No products matched.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Name', 'SKU', 'Barcode', 'Type', 'Reorder threshold'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} style={{}}>
                  <td style={tdStyle}><span style={{ color: '#F0EDE8' }}>{p.name ?? '—'}</span></td>
                  <td style={tdStyle}>{p.sku ?? '—'}</td>
                  <td style={tdStyle}>{p.barcode ?? '—'}</td>
                  <td style={tdStyle}>{(p.inventory_type ?? '—').toString()}</td>
                  <td style={tdStyle}>{p.reorder_threshold ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function InventoryTypes() {
  return TYPES as readonly string[]
}

const inputStyle: React.CSSProperties = {
  background: '#141E2B', color: '#E8E6F0', border: '1px solid #2A3648',
  borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none',
}

const cardStyle: React.CSSProperties = {
  background: '#141E2B', border: '1px solid #232A3A', borderRadius: 12, padding: 18,
}

const thStyle: React.CSSProperties = {
  textAlign: 'left', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
  color: '#90A0B8', padding: '8px 10px', borderBottom: '1px solid #2A3648',
}
const tdStyle: React.CSSProperties = {
  padding: '10px', fontSize: 13, color: '#B9C2D4', borderBottom: '1px solid #232A3A',
}