'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import SupplierProductsModal, { invModalTheme, type ProductSummary } from '@/inventory/components/supplier-products-modal'

interface Supplier {
  id: string
  name: string | null
  contact_person?: string | null
  phone?: string | null
  email?: string | null
  is_active: boolean
  payment_term_type?: string | null
  payment_term_days?: number | null
}

const TERM_OPTIONS = [
  { value: 'CASH', label: 'Cash — due on receipt' },
  { value: 'COD', label: 'Cash on Delivery' },
  { value: 'WEEKLY', label: 'Weekly — due in 7 days' },
  { value: 'MONTHLY', label: 'Monthly — due same day next month' },
  { value: 'ACCOUNT', label: 'Account — custom days' },
]

const inputStyle: React.CSSProperties = {
  background: '#1B2536', color: '#E8E6F0', border: '1px solid #2A3648', borderRadius: 8,
  padding: '9px 12px', fontSize: 13, outline: 'none', fontFamily: 'Inter, sans-serif',
}
const fieldLabel: React.CSSProperties = {
  display: 'block', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
  color: '#90A0B8', marginBottom: 5, fontWeight: 600,
}
const smallBtn: React.CSSProperties = {
  background: 'none', border: '1px solid #2A3648', color: '#B9C2D4', borderRadius: 6,
  padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 600, fontFamily: 'Inter, sans-serif',
}
const goldBtn: React.CSSProperties = {
  background: '#C4A04E', border: 'none', color: '#0F1520', borderRadius: 8,
  padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<ProductSummary[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [flash, setFlash] = useState('')

  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', contact_person: '', phone: '', email: '' })
  const [savingAdd, setSavingAdd] = useState(false)

  const [editing, setEditing] = useState<Supplier | null>(null)
  const [editForm, setEditForm] = useState<Record<string, string>>({})
  const [savingEdit, setSavingEdit] = useState(false)

  const [productsFor, setProductsFor] = useState<Supplier | null>(null)

  const notify = useCallback((msg: string) => {
    setFlash(msg)
    window.setTimeout(() => setFlash(''), 4000)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    params.set('page_size', '100')
    try {
      const res = await fetch(`/api/inventory/suppliers?${params}`)
      const json = await res.json()
      if (json.error) setError(json.error.message)
      else setSuppliers(json.data ?? [])
    } catch { setError('Failed to load suppliers') }
    setLoading(false)
  }, [search])

  const loadProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/inventory/products?page_size=500&show_archived=false')
      const json = await res.json()
      if (!json.error) setProducts(json.data ?? [])
    } catch { /* counts stay 0 */ }
  }, [])

  useEffect(() => { void load() }, [load])
  useEffect(() => { void loadProducts() }, [loadProducts])

  const countBySupplier = useMemo(() => {
    const m: Record<string, number> = {}
    for (const p of products) {
      if (p.preferred_supplier_id) {
        m[p.preferred_supplier_id] = (m[p.preferred_supplier_id] ?? 0) + 1
      }
    }
    return m
  }, [products])

  async function handleCreate() {
    if (!addForm.name.trim()) return
    setSavingAdd(true)
    try {
      const res = await fetch('/api/inventory/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      })
      const json = await res.json()
      if (res.ok) {
        setShowAdd(false)
        setAddForm({ name: '', contact_person: '', phone: '', email: '' })
        notify(`Supplier "${json.data.name}" added`)
        await load()
      } else {
        setError(json.error?.message || 'Failed to create supplier')
      }
    } finally { setSavingAdd(false) }
  }

  function openEdit(s: Supplier) {
    setEditing(s)
    setEditForm({
      name: s.name ?? '',
      contact_person: s.contact_person ?? '',
      phone: s.phone ?? '',
      email: s.email ?? '',
      vat_number: '',
      payment_term_type: s.payment_term_type ?? 'CASH',
      payment_term_days: s.payment_term_days != null ? String(s.payment_term_days) : '30',
      lead_time_days: '',
      notes: '',
    })
  }

  async function handleSaveEdit() {
    if (!editing || !editForm.name?.trim()) return
    setSavingEdit(true)
    try {
      const body: Record<string, unknown> = {
        name: editForm.name,
        contact_person: editForm.contact_person || null,
        phone: editForm.phone || null,
        email: editForm.email || null,
        vat_number: editForm.vat_number || null,
        payment_term_type: editForm.payment_term_type || null,
        payment_term_days: editForm.payment_term_type === 'ACCOUNT' && editForm.payment_term_days ? Number(editForm.payment_term_days) : null,
        notes: editForm.notes || null,
      }
      if (editForm.lead_time_days) body.lead_time_days = Number(editForm.lead_time_days)
      const res = await fetch(`/api/inventory/suppliers/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (res.ok) {
        notify('Supplier updated')
        setEditing(null)
        await load()
      } else {
        setError(json.error?.message || 'Failed to save supplier')
      }
    } finally { setSavingEdit(false) }
  }

  async function handleArchive(s: Supplier) {
    if (!confirm(`Archive "${s.name}"? It will be hidden but kept for history.`)) return
    const res = await fetch(`/api/inventory/suppliers/${s.id}`, { method: 'DELETE' })
    if (res.status === 204) {
      notify(`Supplier "${s.name}" deleted`)
    } else if (res.status === 409) {
      notify(`"${s.name}" has linked products — archived instead. Untick its products first to fully delete.`)
    } else {
      const json = await res.json().catch(() => null)
      setError(json?.error?.message || 'Failed to delete supplier')
    }
    await load()
  }

  async function handleRestore(s: Supplier) {
    const res = await fetch(`/api/inventory/suppliers/${s.id}/restore`, { method: 'POST' })
    if (res.ok) {
      notify(`Supplier "${s.name}" restored`)
      await load()
    } else {
      const json = await res.json().catch(() => null)
      setError(json?.error?.message || 'Failed to restore supplier')
    }
  }

  function handleProductsChange(updates: { id: string; preferred_supplier_id: string | null }[]) {
    setProducts(prev => {
      const map: Record<string, string | null> = {}
      for (const u of updates) map[u.id] = u.preferred_supplier_id
      return prev.map(p => (p.id in map ? { ...p, preferred_supplier_id: map[p.id] ?? null } : p))
    })
    notify(`Product links updated for "${productsFor?.name}"`)
    setProductsFor(null)
  }

  return (
    <div style={{ padding: 28, maxWidth: 1100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Suppliers</h1>
          <p style={{ color: '#90A0B8', fontSize: 13, margin: '0' }}>
            Who you buy from. Add, edit, link products and delete suppliers — everything here.
          </p>
        </div>
        <button style={goldBtn} onClick={() => setShowAdd(v => !v)}>
          {showAdd ? 'Cancel' : '+ Add Supplier'}
        </button>
      </div>

      {showAdd && (
        <div style={{ background: '#141E2B', border: '1px solid #2A3648', borderRadius: 12, padding: 16, margin: '18px 0' }}>
          <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 14, color: '#E8E6F0' }}>New Supplier</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={fieldLabel}>Name</label>
              <input style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} placeholder="Supplier name" value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label style={fieldLabel}>Contact Person</label>
              <input style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} placeholder="e.g. John Mwangi" value={addForm.contact_person} onChange={e => setAddForm(f => ({ ...f, contact_person: e.target.value }))} />
            </div>
            <div>
              <label style={fieldLabel}>Phone</label>
              <input style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} placeholder="07xx xxx xxx" value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <label style={fieldLabel}>Email</label>
              <input style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} placeholder="orders@supplier.com" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={goldBtn} onClick={handleCreate} disabled={savingAdd || !addForm.name.trim()}>
              {savingAdd ? 'Creating…' : 'Create Supplier'}
            </button>
            <button style={smallBtn} onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '0 0 16px', flexWrap: 'wrap' }}>
        <input
          placeholder="Search suppliers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, width: 320 }}
        />
        {flash && <span style={{ color: '#7FB069', fontSize: 13 }}>{flash}</span>}
        <span style={{ color: '#90A0B8', fontSize: 12, marginLeft: 'auto' }}>
          <Link href="/admin/operations/suppliers" style={{ color: '#C4A04E' }}>Advanced admin view →</Link> (POs, price history, invoices)
        </span>
      </div>

      {error && <p style={{ color: '#E05656', fontSize: 13, margin: '0 0 12px' }}>{error}</p>}

      <div style={cardStyle}>
        {loading ? (
          <p style={{ color: '#90A0B8', fontSize: 13 }}>Loading…</p>
        ) : suppliers.length === 0 ? (
          <p style={{ color: '#90A0B8', fontSize: 13 }}>No suppliers found.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Name', 'Contact', 'Phone', 'Email', 'Products', 'Status', 'Actions'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id}>
                  <td style={{ ...tdStyle, fontWeight: 600, color: '#E8E6F0' }}>{s.name ?? '—'}</td>
                  <td style={tdStyle}>{s.contact_person ?? '—'}</td>
                  <td style={tdStyle}>{s.phone ?? '—'}</td>
                  <td style={tdStyle}>{s.email ?? '—'}</td>
                  <td style={tdStyle}>
                    <span style={{ color: '#C4A04E', fontWeight: 700 }}>{countBySupplier[s.id] ?? 0}</span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      background: s.is_active !== false ? '#12301A' : '#3A1216',
                      color: s.is_active !== false ? '#7FB069' : '#E06060',
                      fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                    }}>{s.is_active !== false ? 'ACTIVE' : 'ARCHIVED'}</span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {s.is_active !== false ? (
                        <>
                          <button style={smallBtn} onClick={() => openEdit(s)}>Edit</button>
                          <button style={smallBtn} onClick={() => setProductsFor(s)}>Products</button>
                          <button style={{ ...smallBtn, borderColor: '#5A2A2E', color: '#E06060' }} onClick={() => handleArchive(s)}>Delete</button>
                        </>
                      ) : (
                        <button style={smallBtn} onClick={() => handleRestore(s)}>Restore</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <div style={overlayStyle} onClick={() => !savingEdit && setEditing(null)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#E8E6F0' }}>Edit {editing.name}</h3>
              <button onClick={() => setEditing(null)} style={xStyle} aria-label="Close">✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                ['name', 'Name'],
                ['contact_person', 'Contact Person'],
                ['phone', 'Phone'],
                ['email', 'Email'],
                ['vat_number', 'VAT Number'],
                ['lead_time_days', 'Lead Time (days)'],
                ['notes', 'Notes'],
              ].map(([key, label]) => (
                <div key={key} style={{ gridColumn: key === 'notes' || key === 'name' ? 'span 2' : undefined }}>
                  <label style={fieldLabel}>{label}</label>
                  <input
                    style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                    value={editForm[key] ?? ''}
                    onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={fieldLabel}>Payment Terms</label>
                <select
                  style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                  value={editForm.payment_term_type ?? 'CASH'}
                  onChange={e => setEditForm(f => ({ ...f, payment_term_type: e.target.value }))}
                >
                  {TERM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              {editForm.payment_term_type === 'ACCOUNT' && (
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={fieldLabel}>Days until due (Account)</label>
                  <input
                    style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                    type="number" min={0}
                    value={editForm.payment_term_days ?? '30'}
                    onChange={e => setEditForm(f => ({ ...f, payment_term_days: e.target.value }))}
                  />
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button style={goldBtn} onClick={handleSaveEdit} disabled={savingEdit || !editForm.name?.trim()}>
                {savingEdit ? 'Saving…' : 'Save changes'}
              </button>
              <button style={smallBtn} onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {productsFor && (
        <SupplierProductsModal
          supplierId={productsFor.id}
          supplierName={productsFor.name ?? 'Supplier'}
          products={products}
          onProductsChange={handleProductsChange}
          onClose={() => setProductsFor(null)}
          theme={invModalTheme}
        />
      )}
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
const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
}
const modalStyle: React.CSSProperties = {
  background: '#141E2B', border: '1px solid #2A3648', borderRadius: 12,
  width: 560, maxWidth: '100%', maxHeight: '85vh', overflowY: 'auto', padding: 18,
}
const xStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: '#90A0B8', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 4,
}