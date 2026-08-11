'use client'

import { useState } from 'react'

interface CountCardProps {
  productName: string
  productSku: string | null
  productBarcode: string | null
  expectedQuantity: number | null
  initialQuantity: number
  productIndex: number
  totalProducts: number
  onSave: (quantity: number) => Promise<void>
  onSkip: () => void
  onNext: () => void
  onPrev: () => void
}

const CARD: React.CSSProperties = {
  background: '#242018',
  border: '1px solid #3A3428',
  borderRadius: 12,
  padding: 24,
  color: '#F0EBE3',
  fontFamily: "'Inter', -apple-system, sans-serif",
}

const MUTED = '#A09888'
const DIM = '#6B6358'
const GOLD = '#C8A04E'
const GREEN = '#34D399'

export function CountCard({
  productName,
  productSku,
  productBarcode,
  expectedQuantity,
  initialQuantity,
  productIndex,
  totalProducts,
  onSave,
  onSkip,
  onNext,
  onPrev,
}: CountCardProps) {
  const [quantity, setQuantity] = useState(initialQuantity)
  const [saving, setSaving] = useState(false)
  const [editingDirect, setEditingDirect] = useState(false)
  const [directValue, setDirectValue] = useState(quantity.toString())
  const [saved, setSaved] = useState(false)

  const variance = expectedQuantity !== null ? quantity - expectedQuantity : 0
  const variancePct = expectedQuantity && expectedQuantity > 0 ? (variance / expectedQuantity) * 100 : 0

  function adjust(delta: number) {
    setQuantity(prev => Math.max(0, prev + delta))
    setSaved(false)
  }

  function handleDirectChange(value: string) {
    setDirectValue(value)
    const num = parseFloat(value)
    if (!isNaN(num) && num >= 0) {
      setQuantity(num)
      setSaved(false)
    }
  }

  function startDirectEdit() {
    setEditingDirect(true)
    setDirectValue(quantity.toString())
  }

  function finishDirectEdit() {
    setEditingDirect(false)
    const num = parseFloat(directValue)
    if (!isNaN(num) && num >= 0) {
      setQuantity(num)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(quantity)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const roundBtn: React.CSSProperties = {
    width: 48, height: 48, borderRadius: '50%',
    background: '#2A261E', border: '1px solid #4A4438',
    color: '#F0EBE3', fontSize: 22, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', flexShrink: 0,
  }

  const smallBtn: React.CSSProperties = {
    padding: '6px 14px', fontSize: 12, borderRadius: 8,
    background: '#2A261E', border: '1px solid #4A4438',
    color: '#D8D0C0', cursor: 'pointer',
  }

  const primaryBtn: React.CSSProperties = {
    padding: '10px 22px', fontSize: 13.5, borderRadius: 9,
    background: '#34D399', border: 'none', color: '#0F1F18',
    fontWeight: 700, cursor: 'pointer',
  }

  const ghostBtn: React.CSSProperties = {
    padding: '10px 18px', fontSize: 13.5, borderRadius: 9,
    background: 'transparent', border: '1px solid #4A4438',
    color: '#D8D0C0', cursor: 'pointer',
  }

  return (
    <div style={CARD}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: MUTED }}>
          Product {productIndex + 1} of {totalProducts}
        </div>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: saved ? GREEN : '#4A4438',
        }} />
      </div>

      <div style={{ height: 8, borderRadius: 999, background: '#2A261E', marginBottom: 24, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 999,
          background: 'linear-gradient(90deg, #34D399, #C8A04E)',
          transition: 'width 0.3s ease',
          width: `${Math.min(100, ((productIndex + 1) / Math.max(1, totalProducts)) * 100)}%`,
        }} />
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 4px', color: '#F0EBE3' }}>{productName}</h2>
      {(productSku || productBarcode) && (
        <p style={{ fontSize: 12.5, color: DIM, margin: '0 0 16px' }}>
          {productSku && <>SKU: {productSku}</>}
          {productSku && productBarcode && ' · '}
          {productBarcode && <span style={{ fontFamily: 'monospace' }}>Barcode: {productBarcode}</span>}
        </p>
      )}

      <div style={{ background: '#1E1A12', border: '1px solid #3A3428', borderRadius: 10, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: MUTED, marginBottom: 4 }}>Expected Balance</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#F0EBE3', fontVariantNumeric: 'tabular-nums' }}>
          {expectedQuantity !== null ? expectedQuantity.toFixed(2) : '—'}
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#D8D0C0', marginBottom: 10 }}>Physical Count</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'center' }}>
          <button onClick={() => adjust(-1)} style={roundBtn} aria-label="Decrease by one">−</button>

          {editingDirect ? (
            <input
              style={{
                textAlign: 'center', fontSize: 28, fontWeight: 700, width: 128,
                background: '#171208', border: '2px solid #34D399', borderRadius: 10,
                color: '#F0EBE3', outline: 'none', padding: '6px 8px', fontVariantNumeric: 'tabular-nums',
              }}
              type="number"
              min="0"
              step="0.5"
              value={directValue}
              onChange={e => setDirectValue(e.target.value)}
              onBlur={finishDirectEdit}
              onKeyDown={e => { if (e.key === 'Enter') finishDirectEdit() }}
              autoFocus
            />
          ) : (
            <div
              style={{ textAlign: 'center', fontSize: 28, fontWeight: 700, width: 128, cursor: 'pointer', color: '#F0EBE3', fontVariantNumeric: 'tabular-nums' }}
              onClick={startDirectEdit}
            >
              {quantity.toFixed(1)}
            </div>
          )}

          <button onClick={() => adjust(1)} style={roundBtn} aria-label="Increase by one">+</button>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 10 }}>
          <button onClick={() => adjust(-10)} style={smallBtn}>−10</button>
          <button onClick={() => adjust(10)} style={smallBtn}>+10</button>
        </div>
      </div>

      {expectedQuantity !== null && quantity !== expectedQuantity && (
        <div style={{
          fontSize: 13, marginBottom: 16, padding: 10, borderRadius: 8,
          background: Math.abs(variancePct) > 10 ? 'rgba(248,113,113,0.12)' : 'rgba(251,191,36,0.12)',
          border: `1px solid ${Math.abs(variancePct) > 10 ? 'rgba(248,113,113,0.4)' : 'rgba(251,191,36,0.4)'}`,
          color: Math.abs(variancePct) > 10 ? '#F87171' : '#FBBF24',
        }}>
          Variance: {variance > 0 ? '+' : ''}{variance.toFixed(2)} ({variancePct > 0 ? '+' : ''}{variancePct.toFixed(1)}%)
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {productIndex > 0 && (
          <button onClick={onPrev} style={ghostBtn}>Previous</button>
        )}
        <button onClick={handleSave} disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save'}
        </button>
        <button onClick={onSkip} style={ghostBtn}>Skip</button>
        <button
          onClick={() => { handleSave().then(() => onNext()) }}
          style={{ ...primaryBtn, background: GOLD, color: '#171208', marginLeft: 'auto' }}
        >Next →</button>
      </div>
    </div>
  )
}

export function VarianceTable({
  items,
  onApprove,
  onBack,
  approving,
}: {
  items: any[]
  onApprove: () => void
  onBack: () => void
  approving: boolean
}) {
  const totalExpected = items.reduce((s: number, i: any) => s + Number(i.expected_quantity ?? 0), 0)
  const totalPhysical = items.reduce((s: number, i: any) => s + Number(i.physical_quantity ?? 0), 0)
  const totalVariance = items.reduce((s: number, i: any) => s + Number(i.variance ?? 0), 0)
  const significant = items.filter((i: any) => Math.abs(Number(i.variance ?? 0)) > 0)

  const kpi: React.CSSProperties = {
    background: '#242018', border: '1px solid #3A3428', borderRadius: 12, padding: 16,
  }
  const kpiLabel: React.CSSProperties = { fontSize: 12, color: MUTED, marginBottom: 4 }
  const kpiValue: React.CSSProperties = { fontSize: 24, fontWeight: 700, color: '#F0EBE3', fontVariantNumeric: 'tabular-nums' }

  const ghostBtn: React.CSSProperties = {
    padding: '10px 18px', fontSize: 13.5, borderRadius: 9,
    background: 'transparent', border: '1px solid #4A4438',
    color: '#D8D0C0', cursor: 'pointer',
  }
  const primaryBtn: React.CSSProperties = {
    padding: '10px 22px', fontSize: 13.5, borderRadius: 9,
    background: '#34D399', border: 'none', color: '#0F1F18',
    fontWeight: 700, cursor: 'pointer',
  }

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={kpi}>
          <div style={kpiLabel}>Expected</div>
          <div style={kpiValue}>{totalExpected.toFixed(2)}</div>
        </div>
        <div style={kpi}>
          <div style={kpiLabel}>Physical</div>
          <div style={kpiValue}>{totalPhysical.toFixed(2)}</div>
        </div>
        <div style={kpi}>
          <div style={kpiLabel}>Variance</div>
          <div style={{ ...kpiValue, color: totalVariance === 0 ? '#F0EBE3' : totalVariance > 0 ? '#34D399' : '#F87171' }}>
            {totalVariance > 0 ? '+' : ''}{totalVariance.toFixed(2)}
          </div>
        </div>
      </div>

      <div style={{ background: '#242018', border: '1px solid #3A3428', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #3A3428', background: '#1E1A12' }}>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: MUTED }}>Product</th>
              <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: MUTED }}>Expected</th>
              <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: MUTED }}>Physical</th>
              <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: MUTED }}>Variance</th>
            </tr>
          </thead>
          <tbody>
            {significant.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: 24, textAlign: 'center', color: MUTED, fontSize: 13 }}>
                  No variances — all products match
                </td>
              </tr>
            ) : significant.map((item: any) => {
              const v = Number(item.variance ?? 0)
              return (
                <tr key={item.id} style={{ borderBottom: '1px solid #3A3428' }}>
                  <td style={{ padding: '12px 16px', color: '#F0EBE3' }}>{item.inventory_products?.name || item.product_id}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: '#D8D0C0', fontVariantNumeric: 'tabular-nums' }}>{Number(item.expected_quantity ?? 0).toFixed(2)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: '#D8D0C0', fontVariantNumeric: 'tabular-nums' }}>{Number(item.physical_quantity).toFixed(2)}</td>
                  <td style={{
                    padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace',
                    color: v === 0 ? '#D8D0C0' : v > 0 ? '#34D399' : '#F87171',
                  }}>
                    {v > 0 ? '+' : ''}{v.toFixed(2)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBack} style={ghostBtn}>Back to Count</button>
        <button onClick={onApprove} disabled={approving} style={{ ...primaryBtn, marginLeft: 'auto', opacity: approving ? 0.6 : 1 }}>
          {approving ? 'Approving...' : 'Approve Count'}
        </button>
      </div>
    </div>
  )
}
