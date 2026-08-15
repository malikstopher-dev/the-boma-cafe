'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

interface Txn {
  id: string
  transaction_type: string
  quantity: number
  unit_cost: number | null
  reason_type: string | null
  reason_notes: string | null
  created_at: string
  product_id: string | null
  location_id: string | null
}

interface Product { id: string; name: string | null; sku: string | null }
interface Location { id: string; name: string; is_active: boolean }

export default function AdjustmentsPage() {
  const [txns, setTxns] = useState<Txn[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [productId, setProductId] = useState('')
  const [locationId, setLocationId] = useState('')
  const [qty, setQty] = useState('')
  const [reasonType, setReasonType] = useState('ADJUSTMENT')
  const [notes, setNotes] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const [tRes, pRes, lRes] = await Promise.all([
      fetch('/api/inventory/transactions?type=adjustment&page_size=50'),
      fetch('/api/inventory/products?page_size=200'),
      fetch('/api/inventory/locations'),
    ])
    const [tJson, pJson, lJson] = await Promise.all([tRes.json(), pRes.json(), lRes.json()])
    setTxns(tJson.data ?? [])
    setProducts(pJson.data ?? [])
    const active = (lJson.data ?? []).filter((l: Location) => l.is_active !== false)
    setLocations(active)
    if (active.length > 0 && !locationId) setLocationId(active[0].id)
    setLoading(false)
  }, [locationId])

  useEffect(() => { void load() }, [load])

  const submit = async () => {
    setMessage('')
    setError('')
    if (!productId || !locationId || !qty) {
      setError('Product, location and quantity are required.')
      return
    }
    const res = await fetch('/api/inventory/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: productId,
        location_id: locationId,
        transaction_type: 'adjustment',
        quantity: Number(qty),
        reason_type: reasonType,
        reason_notes: notes || undefined,
      }),
    })
    const json = await res.json()
    if (json.error) setError(json.error.message)
    else {
      setMessage('Adjustment posted to the ledger.')
      setQty('')
      setNotes('')
      void load()
    }
  }

  return (
    <div style={{ padding: 28, maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Adjustments</h1>
      <p style={{ color: '#90A0B8', fontSize: 13, margin: '0 0 20px' }}>
        Stock corrections that don&apos;t fit waste, purchase or sale categories. Positive = found surplus, negative = shortfall.
      </p>

      {message && <p style={{ color: '#7FB069', fontSize: 13, marginBottom: 10 }}>{message}</p>}
      {error && <p style={{ color: '#E05656', fontSize: 13, marginBottom: 10 }}>{error}</p>}

      <div style={{ ...cardStyle, marginBottom: 22 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#F0EDE8', marginBottom: 12 }}>Record an adjustment</div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.3fr 1.5fr auto', gap: 10, alignItems: 'center' }}>
          <select value={productId} onChange={(e) => setProductId(e.target.value)} style={inputStyle}>
            <option value="">Select product…</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name ?? p.sku ?? p.id.slice(0, 8)}</option>)}
          </select>
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)} style={inputStyle}>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <input placeholder="+10 or -4" value={qty} onChange={(e) => setQty(e.target.value)} style={inputStyle} />
          <select value={reasonType} onChange={(e) => setReasonType(e.target.value)} style={inputStyle}>
            <option value="ADJUSTMENT">Adjustment</option>
            <option value="BREAKAGE">Breakage</option>
            <option value="RETURN">Return</option>
            <option value="DAMAGED">Damaged</option>
            <option value="FOUND_STOCK">Found Stock</option>
          </select>
          <input placeholder="Notes (free text)…" value={notes} onChange={(e) => setNotes(e.target.value)} style={inputStyle} />
          <button onClick={() => void submit()} disabled={!productId || !locationId || !qty} style={{
            background: '#C4A04E', color: '#101A26', border: 'none', borderRadius: 8,
            padding: '9px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
          }}>POST LEDGER</button>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#F0EDE8', marginBottom: 12 }}>Recent adjustments</div>
        {loading ? (
          <p style={{ color: '#90A0B8', fontSize: 13 }}>Loading…</p>
        ) : txns.length === 0 ? (
          <p style={{ color: '#90A0B8', fontSize: 13 }}>No adjustments recorded yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Product', 'Location', 'Qty', 'Reason', 'Notes', 'Date'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {txns.map((t) => (
                <tr key={t.id}>
                  <td style={tdStyle}>{products.find((p) => p.id === t.product_id)?.name ?? t.product_id?.slice(0, 8) ?? '—'}</td>
                  <td style={tdStyle}>{locations.find((l) => l.id === t.location_id)?.name ?? t.location_id?.slice(0, 8) ?? '—'}</td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: (t.quantity ?? 0) < 0 ? '#E05656' : '#7FB069' }}>
                    {(t.quantity ?? 0) > 0 ? `+${t.quantity}` : t.quantity}
                  </td>
                  <td style={tdStyle}>{t.reason_type ?? '—'}</td>
                  <td style={tdStyle}>{t.reason_notes ?? '—'}</td>
                  <td style={tdStyle}>{new Date(t.created_at).toLocaleDateString()}</td>
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
  background: '#101A26', color: '#E8E6F0', border: '1px solid #2A3648',
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