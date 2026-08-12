'use client'

import { useEffect, useMemo, useState } from 'react'

export interface ProductSummary {
  id: string
  name: string
  sku: string | null
  preferred_supplier_id: string | null
}

export interface ModalTheme {
  overlay: string
  card: string
  border: string
  inputBg: string
  inputBorder: string
  inputColor: string
  text: string
  muted: string
  accent: string
  accentText: string
  rowBg: string
  rowHover: string
  danger: string
}

export const adminModalTheme: ModalTheme = {
  overlay: 'rgba(0,0,0,0.6)',
  card: '#1E1A14',
  border: '#3A3428',
  inputBg: '#2A261E',
  inputBorder: '#3A3428',
  inputColor: '#F0EBE3',
  text: '#F0EBE3',
  muted: '#A09888',
  accent: '#C8A04E',
  accentText: '#0F0A04',
  rowBg: '#262119',
  rowHover: '#2C271E',
  danger: '#E06060',
}

export const invModalTheme: ModalTheme = {
  overlay: 'rgba(0,0,0,0.6)',
  card: '#141E2B',
  border: '#2A3648',
  inputBg: '#1B2536',
  inputBorder: '#2A3648',
  inputColor: '#E8E6F0',
  text: '#E8E6F0',
  muted: '#90A0B8',
  accent: '#C4A04E',
  accentText: '#0F1520',
  rowBg: '#182336',
  rowHover: '#1D2A3F',
  danger: '#E06060',
}

interface SupplierProductsModalProps {
  supplierId: string
  supplierName: string
  products: ProductSummary[]
  onProductsChange: (updates: { id: string; preferred_supplier_id: string | null }[]) => void
  onClose: () => void
  theme?: ModalTheme
}

export default function SupplierProductsModal({
  supplierId,
  supplierName,
  products,
  onProductsChange,
  onClose,
  theme = adminModalTheme,
}: SupplierProductsModalProps) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {}
    for (const p of products) {
      if (p.preferred_supplier_id === supplierId) map[p.id] = true
    }
    return map
  })
  const [saving, setSaving] = useState(false)
  const [busyCount, setBusyCount] = useState(0)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !saving) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [saving, onClose])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter(p => p.name.toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q))
  }, [products, query])

  const checkedCount = useMemo(
    () => products.filter(p => selected[p.id] === true).length,
    [products, selected],
  )

  function toggle(id: string) {
    setSelected(prev => ({ ...prev, [id]: prev[id] !== true }))
  }

  async function handleSave() {
    const updates = products
      .filter(p => (selected[p.id] === true) !== (p.preferred_supplier_id === supplierId))
      .map(p => ({
        id: p.id,
        preferred_supplier_id: selected[p.id] === true ? supplierId : null,
      }))

    if (updates.length === 0) {
      onClose()
      return
    }

    setSaving(true)
    let failed = 0
    for (const u of updates) {
      const res = await fetch(`/api/inventory/products/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferred_supplier_id: u.preferred_supplier_id }),
      })
      if (res.ok) {
        setBusyCount(c => c + 1)
      } else {
        failed += 1
      }
    }
    if (failed > 0) {
      alert(`${failed} product${failed === 1 ? '' : 's'} could not be updated`)
    }
    setSaving(false)
    onProductsChange(updates)
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: theme.overlay,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={saving ? undefined : onClose}
    >
      <div
        style={{
          background: theme.card,
          border: `1px solid ${theme.border}`,
          borderRadius: 12,
          width: 560,
          maxWidth: '100%',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px', borderBottom: `1px solid ${theme.border}` }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: theme.text }}>Products from {supplierName}</h3>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: theme.muted }}>
              Tick every product this supplier supplies. Unticking removes the link.
            </p>
          </div>
          <button
            onClick={() => !saving && onClose()}
            style={{
              background: 'none',
              border: 'none',
              color: theme.muted,
              fontSize: 20,
              cursor: 'pointer',
              lineHeight: 1,
              padding: 4,
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '12px 18px' }}>
          <input
            placeholder="Search products…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: theme.inputBg,
              border: `1px solid ${theme.inputBorder}`,
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 13,
              color: theme.inputColor,
              outline: 'none',
            }}
          />
        </div>

        <div style={{ overflowY: 'auto', padding: '0 18px 12px', minHeight: 120, flex: 1 }}>
          {filtered.length === 0 ? (
            <p style={{ color: theme.muted, fontSize: 13 }}>No products found.</p>
          ) : (
            filtered.map(p => {
              const checked = selected[p.id] === true
              const wasLinked = p.preferred_supplier_id === supplierId
              return (
                <label
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: theme.rowBg,
                    border: `1px solid ${theme.border}`,
                    marginBottom: 6,
                    cursor: 'pointer',
                    opacity: checked ? 1 : 0.75,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(p.id)}
                    style={{ width: 16, height: 16, accentColor: theme.accent, cursor: 'pointer' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: theme.text, fontWeight: checked ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.name}
                    </div>
                    {p.sku ? <div style={{ fontSize: 11, color: theme.muted }}>{p.sku}</div> : null}
                  </div>
                  {wasLinked && (
                    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', color: theme.accent }}>
                      {checked ? 'LINKED' : 'REMOVING'}
                    </span>
                  )}
                </label>
              )
            })
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderTop: `1px solid ${theme.border}` }}>
          <span style={{ fontSize: 12, color: theme.muted }}>
            {checkedCount} of {products.length} products linked
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              disabled={saving}
              style={buttonStyle(theme, true)}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={buttonStyle(theme, false)}
            >
              {saving ? `Saving… ${busyCount}` : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function buttonStyle(theme: ModalTheme, secondary: boolean): React.CSSProperties {
  if (secondary) {
    return {
      background: 'none',
      border: `1px solid ${theme.border}`,
      color: theme.muted,
      borderRadius: 8,
      padding: '8px 14px',
      fontSize: 13,
      fontWeight: 600,
      cursor: 'pointer',
      fontFamily: 'Inter, sans-serif',
    }
  }
  return {
    background: theme.accent,
    border: 'none',
    color: theme.accentText,
    borderRadius: 8,
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
  }
}