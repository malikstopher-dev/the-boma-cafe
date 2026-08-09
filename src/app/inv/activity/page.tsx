'use client'

import { useCallback, useEffect, useState } from 'react'

interface Txn {
  id: string
  transaction_type: string
  quantity: number
  unit_cost: number | null
  reason_type: string | null
  reason_notes: string | null
  manager_note: string | null
  created_at: string
  product_id: string | null
  location_id: string | null
}

interface Product { id: string; name: string | null; sku: string | null }
interface Location { id: string; name: string }

export default function ActivityPage() {
  const [txns, setTxns] = useState<Txn[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const [tRes, pRes, lRes] = await Promise.all([
      fetch('/api/inventory/transactions?page_size=100'),
      fetch('/api/inventory/products?page_size=500'),
      fetch('/api/inventory/locations'),
    ])
    const [tJson, pJson, lJson] = await Promise.all([tRes.json(), pRes.json(), lRes.json()])
    setTxns(tJson.data ?? [])
    setProducts(pJson.data ?? [])
    setLocations(lJson.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const pName = (id: string | null) => products.find((p) => p.id === id)?.name ?? id?.slice(0, 8) ?? '—'
  const lName = (id: string | null) => locations.find((l) => l.id === id)?.name ?? '—'

  return (
    <div style={{ padding: 28, maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Activity Trail</h1>
      <p style={{ color: '#90A0B8', fontSize: 13, margin: '0 0 20px' }}>
        Every ledger movement, newest first. Each row is an auditable transaction.
      </p>

      {error && <p style={{ color: '#E05656', fontSize: 13 }}>{error}</p>}

      <div style={cardStyle}>
        {loading ? (
          <p style={{ color: '#90A0B8', fontSize: 13 }}>Loading…</p>
        ) : txns.length === 0 ? (
          <p style={{ color: '#90A0B8', fontSize: 13 }}>No transactions yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['When', 'Product', 'Type', 'Qty', 'Location', 'Note'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {txns.map((t) => (
                <tr key={t.id}>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap', color: '#90A0B8' }}>
                    {new Date(t.created_at).toLocaleString()}
                  </td>
                  <td style={tdStyle}><span style={{ color: '#F0EDE8' }}>{pName(t.product_id)}</span></td>
                  <td style={tdStyle}>
                    <span style={{
                      background: '#1E2A3A', color: '#B9C2D4', fontSize: 11, fontWeight: 600,
                      padding: '3px 8px', borderRadius: 6, letterSpacing: '0.04em', textTransform: 'uppercase',
                    }}>{t.transaction_type}</span>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: (t.quantity ?? 0) < 0 ? '#E05656' : '#7FB069' }}>
                    {(t.quantity ?? 0) > 0 ? `+${t.quantity}` : t.quantity}
                  </td>
                  <td style={tdStyle}>{lName(t.location_id)}</td>
                  <td style={tdStyle}>{t.reason_type ?? t.manager_note ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
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