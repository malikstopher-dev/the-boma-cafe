'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

interface WasteEvent {
  id: string
  transaction_type: string
  quantity: number
  unit_cost: number | null
  reason_type: string | null
  reason_notes: string | null
  created_at: string
  product_id: string | null
}

interface Product { id: string; name: string | null; sku: string | null }
interface Location { id: string; name: string; is_active: boolean }

const WASTE_TYPES = ['waste', 'breakage', 'spillage', 'comp', 'expiry_loss', 'theft', 'donation']

const displayType = (t: string) => t.replace(/_/g, ' ').toUpperCase()

export default function WastePage() {
  const [events, setEvents] = useState<WasteEvent[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [productId, setProductId] = useState('')
  const [locationId, setLocationId] = useState('')
  const [type, setType] = useState('waste')
  const [qty, setQty] = useState('')
  const [notes, setNotes] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const [wRes, pRes, lRes] = await Promise.all([
      fetch('/api/inventory/waste?limit=40'),
      fetch('/api/inventory/products?page_size=200'),
      fetch('/api/inventory/locations'),
    ])
    const [wJson, pJson, lJson] = await Promise.all([wRes.json(), pRes.json(), lRes.json()])
    setEvents(wJson.data ?? [])
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
    const res = await fetch('/api/inventory/waste', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: productId,
        location_id: locationId,
        transaction_type: type,
        quantity: Number(qty),
        reason_notes: notes || undefined,
      }),
    })
    const json = await res.json()
    if (json.error) setError(json.error.message)
    else {
      setMessage(`${displayType(type)} event recorded — stock reduced.`)
      setQty('')
      setNotes('')
      void load()
    }
  }

  return (
    <div style={{ padding: 28, maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Waste &amp; Breakage</h1>
      <p style={{ color: '#90A0B8', fontSize: 13, margin: '0 0 20px' }}>
        Record stock that left the business outside of sales — spills, breakage, expiry, comps, theft or donations.
      </p>

      {message && <p style={{ color: '#7FB069', fontSize: 13, marginBottom: 10 }}>{message}</p>}
      {error && <p style={{ color: '#E05656', fontSize: 13, marginBottom: 10 }}>{error}</p>}

      <div style={{ ...cardStyle, marginBottom: 22 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#F0EDE8', marginBottom: 12 }}>Log a waste event</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1.5fr auto', gap: 10, alignItems: 'center' }}>
          <select value={productId} onChange={(e) => setProductId(e.target.value)} style={inputStyle}>
            <option value="">Select product…</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name ?? p.sku ?? p.id.slice(0, 8)}</option>)}
          </select>
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)} style={inputStyle}>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select value={type} onChange={(e) => setType(e.target.value)} style={inputStyle}>
            {WASTE_TYPES.map((t) => <option key={t} value={t}>{displayType(t)}</option>)}
          </select>
          <input placeholder="Qty" value={qty} onChange={(e) => setQty(e.target.value)} style={inputStyle} />
          <input placeholder="Notes…" value={notes} onChange={(e) => setNotes(e.target.value)} style={inputStyle} />
          <button onClick={() => void submit()} disabled={!productId || !locationId || !qty} style={{
            background: '#7A3A3A', color: '#FFF', border: 'none', borderRadius: 8,
            padding: '9px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
          }}>RECORD</button>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#F0EDE8', marginBottom: 12 }}>Recent waste events</div>
        {loading ? (
          <p style={{ color: '#90A0B8', fontSize: 13 }}>Loading…</p>
        ) : events.length === 0 ? (
          <p style={{ color: '#90A0B8', fontSize: 13 }}>No waste events recorded in the last 30 days.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Product', 'Type', 'Qty', 'Notes', 'Date'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td style={tdStyle}>{products.find((p) => p.id === e.product_id)?.name ?? e.product_id?.slice(0, 8) ?? '—'}</td>
                  <td style={tdStyle}>
                    <span style={{
                      background: '#3A1216', color: '#E06060', fontSize: 11, fontWeight: 600,
                      padding: '3px 8px', borderRadius: 6, letterSpacing: '0.04em',
                    }}>{displayType(e.transaction_type)}</span>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: '#E05656' }}>{e.quantity ?? 0}</td>
                  <td style={tdStyle}>{e.reason_notes ?? '—'}</td>
                  <td style={tdStyle}>{new Date(e.created_at).toLocaleDateString()}</td>
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