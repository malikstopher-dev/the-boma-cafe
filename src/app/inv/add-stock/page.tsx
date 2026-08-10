'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { C, PageTitle, Card, Button, Select, Loading, Badge, formatMoney, formatQty } from '../kit'

interface ProductRow { id: string; name: string; sku: string | null; inventory_type: string }
interface LocationRow { id: string; name: string; is_active: boolean }
interface TxnRow {
  id: string
  product_id: string
  location_id: string
  quantity: number
  unit_cost: number | null
  reason_notes: string | null
  created_at: string
}

export default function AddStockPage() {
  const [products, setProducts] = useState<ProductRow[]>([])
  const [locations, setLocations] = useState<LocationRow[]>([])
  const [locationId, setLocationId] = useState('')
  const [productName, setProductName] = useState('')
  const [qty, setQty] = useState('')
  const [cost, setCost] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [recent, setRecent] = useState<TxnRow[]>([])
  const productInput = useRef<HTMLInputElement>(null)

  const monthStart = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  }, [])

  const loadRecent = async () => {
    try {
      const res = await fetch(`/api/inventory/transactions?type=purchase&from=${monthStart}&page_size=12`)
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error?.message ?? 'Failed to load recent additions')
      setRecent((json.data ?? []) as TxnRow[])
    } catch {
      // non-fatal
    }
  }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [prodRes, locRes] = await Promise.all([
          fetch('/api/inventory/products?page_size=500'),
          fetch('/api/inventory/locations'),
        ])
        const [prodJson, locJson] = await Promise.all([prodRes.json(), locRes.json()])
        if (!cancelled) {
          setProducts((prodJson.data ?? []) as ProductRow[])
          setLocations((locJson.data ?? []) as LocationRow[])
          const active = (locJson.data ?? []).find((l: LocationRow) => l.is_active)
          if (active && !locationId) setLocationId(active.id)
        }
        await loadRecent()
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const nameToProduct = (name: string) => {
    const n = name.trim().toLowerCase()
    return products.find(p => p.name.toLowerCase() === n || ((p.sku ?? '').toLowerCase() === n))
  }

  const submit = async () => {
    const product = nameToProduct(productName)
    if (!product) { setError('Pick a product from the list (name or SKU)'); return }
    const quantity = Number(qty)
    if (!Number.isFinite(quantity) || quantity <= 0) { setError('Enter a quantity greater than zero'); return }
    const unitCost = cost.trim() === '' ? null : Number(cost)
    if (unitCost !== null && !Number.isFinite(unitCost)) { setError('Unit cost must be a number'); return }
    if (!locationId) { setError('Choose a location'); return }

    setBusy(true)
    setError('')
    setMessage('')
    try {
      const res = await fetch('/api/inventory/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          location_id: locationId,
          transaction_type: 'purchase',
          reason_type: 'DELIVERY',
          quantity,
          unit_cost: unitCost,
          reason_notes: notes.trim() || null,
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error?.message ?? 'Add failed')
      setMessage(`+ ${formatQty(quantity)} ${product.name} added to stock`)
      setProductName(''); setQty(''); setCost(''); setNotes('')
      productInput.current?.focus()
      await loadRecent()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add stock')
    } finally {
      setBusy(false)
    }
  }

  const locationName = (id: string) => locations.find(l => l.id === id)?.name ?? id

  if (loading) return <Loading />

  return (
    <div>
      <PageTitle
        title="Add Stock"
        subtitle="Record a delivery straight into the ledger — no purchase order needed. For bulk or spreadsheet uploads use the import wizard."
        right={
          <Link href="/admin/operations/imports/new" style={{ padding: '9px 14px', borderRadius: 9, background: '#C8A04E', color: '#171008', fontWeight: 700, fontSize: 12.5, textDecoration: 'none' }}>
            Import Excel / CSV →
          </Link>
        }
      />

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(232,84,84,0.1)', border: '1px solid rgba(232,84,84,0.4)', color: '#F17777', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}
      {message && (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(87,217,163,0.10)', border: '1px solid rgba(87,217,163,0.35)', color: '#57D9A3', fontSize: 13, marginBottom: 16 }}>
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 16, alignItems: 'start' }}>
        <Card title="Record a delivery" subtitle="Creates a purchase transaction at the location's cost centre">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted }}>Stock item *</span>
              <input
                ref={productInput}
                list="inv-add-stock-products"
                value={productName}
                onChange={e => setProductName(e.target.value)}
                placeholder="Type a product name or SKU…"
                style={{ background: '#171208', border: `1px solid ${C.borderStrong}`, color: C.text, borderRadius: 8, padding: '10px 12px', fontSize: 13.5, outline: 'none' }}
              />
              <datalist id="inv-add-stock-products">
                {products.map(p => (
                  <option key={p.id} value={p.name}>{p.sku ? `${p.sku} · ` : ''}{p.inventory_type}</option>
                ))}
              </datalist>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted }}>Location *</span>
              <Select value={locationId} onChange={setLocationId} style={{ width: '100%' }}>
                {locations.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </Select>
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted }}>Quantity *</span>
                <input
                  type="number" min="0" step="any"
                  value={qty}
                  onChange={e => setQty(e.target.value)}
                  placeholder="0"
                  style={{ background: '#171208', border: `1px solid ${C.borderStrong}`, color: C.text, borderRadius: 8, padding: '10px 12px', fontSize: 13.5, outline: 'none', fontVariantNumeric: 'tabular-nums' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted }}>Unit cost (optional)</span>
                <input
                  type="number" min="0" step="any"
                  value={cost}
                  onChange={e => setCost(e.target.value)}
                  placeholder="R 0.00"
                  style={{ background: '#171208', border: `1px solid ${C.borderStrong}`, color: C.text, borderRadius: 8, padding: '10px 12px', fontSize: 13.5, outline: 'none', fontVariantNumeric: 'tabular-nums' }}
                />
              </label>
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted }}>Notes (optional)</span>
              <input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Delivery note, invoice number…"
                style={{ background: '#171208', border: `1px solid ${C.borderStrong}`, color: C.text, borderRadius: 8, padding: '10px 12px', fontSize: 13.5, outline: 'none' }}
              />
            </label>

            <Button onClick={() => void submit()} disabled={busy} style={{ alignSelf: 'flex-start' }}>
              {busy ? 'Adding…' : '+ Add to stock'}
            </Button>
          </div>
        </Card>

        <Card title="Recent additions" subtitle={`Purchases recorded this month (${monthStart})`}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.textMuted }}>Item</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.textMuted }}>Qty</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.textMuted }}>Value</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.textMuted }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 && (
                <tr><td colSpan={4} style={{ padding: '22px 8px', textAlign: 'center', color: C.textMuted }}>No deliveries recorded this month yet.</td></tr>
              )}
              {recent.map(tx => {
                const product = products.find(p => p.id === tx.product_id)
                return (
                  <tr key={tx.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '8px', color: C.textSoft }}>
                      <div>{product?.name ?? 'Unknown product'}</div>
                      <div style={{ fontSize: 11, color: C.textMuted }}>{locationName(tx.location_id)}{tx.reason_notes ? ` · ${tx.reason_notes}` : ''}</div>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', color: C.text, fontVariantNumeric: 'tabular-nums' }}>{formatQty(tx.quantity)}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: C.textSoft, fontVariantNumeric: 'tabular-nums' }}>{tx.unit_cost ? formatMoney(tx.quantity * tx.unit_cost) : '—'}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: C.textMuted, fontSize: 11.5, whiteSpace: 'nowrap' }}>
                      {new Date(tx.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} style={{ padding: '8px', textAlign: 'right' }}>
                  <Badge tone="gold">{recent.length} transaction{recent.length === 1 ? '' : 's'}</Badge>
                </td>
              </tr>
            </tfoot>
          </table>
        </Card>
      </div>
    </div>
  )
}