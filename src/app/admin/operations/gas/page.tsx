'use client'

import { useCallback, useEffect, useState } from 'react'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Button from '@/components/admin/design-system/Button'

interface GasSize {
  productId: string
  name: string
  sku: string | null
  kg: number
  onHand: number
  deliveredWeek: number
  usedWeek: number
  deliveredMonth: number
  usedMonth: number
}

interface GasOverview {
  sizes: GasSize[]
  weekly: Array<{ week: number; deliveredQty: number; usedQty: number; deliveredValue: number }>
  monthDeliveredQty: number
  monthUsedQty: number
  monthDeliveredValue: number
  monthUsedValue: number
  recentEvents: Array<{ id: string; productName: string; transactionType: string; quantity: number; unitCost: number | null; notes?: string | null; created_at: string }>
}

const money = (n: number | null | undefined) => n === null || n === undefined || Number.isNaN(n) ? '' : `R${n.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`

const inputStyle: React.CSSProperties = {
  background: '#241D14', color: '#F0EBE3', border: '1px solid #3A3428', borderRadius: 8,
  padding: '8px 12px', fontSize: 13, outline: 'none',
}

export default function GasTracker() {
  const [data, setData] = useState<GasOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [kind, setKind] = useState<'delivery' | 'usage'>('delivery')
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unitCost, setUnitCost] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    fetch('/api/inventory/gas?location_id=main')
      .then(r => r.json())
      .then(res => { if (res.data) setData(res.data); else setError(res.error?.message ?? 'Failed to load') })
      .catch(() => setError('Failed to load gas tracker'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (data && !productId && data.sizes.length > 0) setProductId(data.sizes[0].productId)
  }, [data, productId])

  const submit = async () => {
    if (!productId) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/inventory/gas/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          kind,
          quantity: Number(quantity),
          unitCost: kind === 'delivery' && unitCost ? Number(unitCost) : null,
          notes: notes || null,
          locationId: 'main',
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Failed to record')
      setShowForm(false)
      setQuantity('1')
      setUnitCost('')
      setNotes('')
      await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to record') } finally { setSubmitting(false) }
  }

  const maxBucket = Math.max(...(data?.weekly ?? []).map(w => Math.max(w.deliveredQty, w.usedQty)), 1)

  return (
    <AdminPage
      title="Gas Tracker"
      description="LPG cylinders — 1kg / 2kg / 9kg / 19kg / 48kg · delivered vs used, weekly and monthly."
      actions={<Button variant="primary" size="md" onClick={() => setShowForm(v => !v)}>{showForm ? 'Close' : '+ Record Movement'}</Button>}
    >
      {error && <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 10, background: 'rgba(232,84,84,0.1)', border: '1px solid rgba(232,84,84,0.4)', color: '#E85454', fontSize: 13 }}>{error}</div>}

      {/* Record form */}
      {showForm && (
        <div style={{ background: '#1E1A14', border: '1px solid #3A3428', borderRadius: 12, padding: 20, marginBottom: 18 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {(['delivery', 'usage'] as const).map(k => (
              <button key={k} onClick={() => setKind(k)} style={{
                padding: '7px 16px', borderRadius: 999, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                background: kind === k ? (k === 'delivery' ? '#C8A04E' : '#5A9EE6') : '#241D14',
                color: kind === k ? '#14100B' : '#A09888', border: '1px solid #3A3428',
              }}>
                {k === 'delivery' ? '⬇ Delivery (bought)' : '⬆ Usage (used)'}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 11, fontWeight: 700, color: '#A09888' }}>
              CYLINDER SIZE
              <select value={productId} onChange={e => setProductId(e.target.value)} style={inputStyle}>
                {(data?.sizes ?? []).map(s => <option key={s.productId} value={s.productId}>{s.name}</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 11, fontWeight: 700, color: '#A09888' }}>
              QUANTITY
              <input value={quantity} onChange={e => setQuantity(e.target.value)} type="number" min="0" step="1" style={{ ...inputStyle, width: 90 }} />
            </label>
            {kind === 'delivery' && (
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 11, fontWeight: 700, color: '#A09888' }}>
                COST PER CYLINDER (R)
                <input value={unitCost} onChange={e => setUnitCost(e.target.value)} type="number" min="0" step="0.01" style={{ ...inputStyle, width: 110 }} />
              </label>
            )}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 11, fontWeight: 700, color: '#A09888' }}>
              NOTES
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" style={{ ...inputStyle, width: 200 }} />
            </label>
            <Button variant="primary" size="md" onClick={() => void submit()} disabled={submitting || !productId}>
              {submitting ? 'Recording…' : 'Save'}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#8C8275' }}>Loading…</div>
      ) : data ? (
        <>
          {/* Cylinder stock + monthly KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 18 }}>
            {data.sizes.map(s => (
              <div key={s.productId} style={{ background: '#1E1A14', border: '1px solid #3A3428', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#A09888', marginBottom: 6 }}>{s.name}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: s.onHand > 0 ? '#C8A04E' : '#E85454', fontVariantNumeric: 'tabular-nums' }}>{s.onHand}</div>
                <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11.5, color: '#8C8275' }}>
                  <span>Week <b style={{ color: '#C8A04E' }}>+{s.deliveredWeek}</b> / <b style={{ color: '#5A9EE6' }}>{s.usedWeek}</b></span>
                  <span>Month <b style={{ color: '#C8A04E' }}>+{s.deliveredMonth}</b> / <b style={{ color: '#5A9EE6' }}>{s.usedMonth}</b></span>
                </div>
              </div>
            ))}
            <div style={{ background: 'rgba(200,160,78,0.06)', border: '1px solid rgba(200,160,78,0.35)', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#C8A04E', marginBottom: 6 }}>This Month</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#F0EBE3', fontVariantNumeric: 'tabular-nums' }}>
                Delivered {data.monthDeliveredQty} · Used {data.monthUsedQty}
              </div>
              <div style={{ marginTop: 6, fontSize: 12.5, color: '#A09888' }}>Delivered value {money(data.monthDeliveredValue)} · Used value {money(data.monthUsedValue)}</div>
            </div>
          </div>

          {/* Weekly bars */}
          <div style={{ background: '#1E1A14', border: '1px solid #3A3428', borderRadius: 12, padding: 20, marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#F0EBE3' }}>Weekly — cylinders in vs out</h3>
              <span style={{ fontSize: 11.5, color: '#A09888' }}>Current year, week by week</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 110 }}>
              {data.weekly.length === 0 && <span style={{ fontSize: 12.5, color: '#8C8275' }}>No gas movements recorded yet this year — record the first delivery above.</span>}
              {data.weekly.map(w => (
                <div key={w.week} style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 2, height: '100%' }}>
                  <div title={`Week ${w.week} — delivered ${w.deliveredQty}`} style={{ flex: 1, background: '#C8A04E', borderRadius: '3px 3px 0 0', minHeight: 2, height: `${Math.max(2, (w.deliveredQty / maxBucket) * 100)}%` }} />
                  <div title={`Week ${w.week} — used ${w.usedQty}`} style={{ flex: 1, background: '#5A9EE6', borderRadius: '3px 3px 0 0', minHeight: 2, height: `${Math.max(2, (w.usedQty / maxBucket) * 100)}%` }} />
                </div>
              ))}
            </div>
          </div>

          {/* Recent events */}
          <div style={{ overflowX: 'auto', border: '1px solid #3A3428', borderRadius: 12, background: '#1E1A14' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#26211A' }}>
                  {['When', 'Cylinder', 'Kind', 'Qty', 'Cost / cyl', 'Notes'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#A09888' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.recentEvents.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#8C8275', fontSize: 13 }}>No movements recorded yet — this month is empty.</td></tr>
                )}
                {data.recentEvents.map(e => (
                  <tr key={e.id} style={{ borderBottom: '1px solid #2A261E' }}>
                    <td style={{ padding: '9px 14px', color: '#8C8275', fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>
                      {new Date(e.created_at).toLocaleString('en-ZA', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '9px 14px', fontWeight: 600, color: '#F0EBE3' }}>{e.productName}</td>
                    <td style={{ padding: '9px 14px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                        background: e.transactionType === 'purchase' ? 'rgba(200,160,78,0.15)' : 'rgba(90,158,230,0.15)',
                        color: e.transactionType === 'purchase' ? '#C8A04E' : '#5A9EE6',
                      }}>
                        {e.transactionType === 'purchase' ? 'Delivery' : 'Used'}
                      </span>
                    </td>
                    <td style={{ padding: '9px 14px', fontWeight: 700, color: e.transactionType === 'purchase' ? '#C8A04E' : '#5A9EE6', fontVariantNumeric: 'tabular-nums' }}>{e.quantity}</td>
                    <td style={{ padding: '9px 14px', color: '#A09888', fontVariantNumeric: 'tabular-nums' }}>{e.unitCost ? money(e.unitCost) : '—'}</td>
                    <td style={{ padding: '9px 14px', color: '#6B6358', fontSize: 12.5 }}>{e.notes ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div style={{ padding: 40, textAlign: 'center', color: '#8C8275' }}>Unable to load gas tracker.</div>
      )}
    </AdminPage>
  )
}