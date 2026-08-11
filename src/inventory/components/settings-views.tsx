'use client'

import { useState, useEffect } from 'react'
import DataTable from '@/components/admin/design-system/DataTable'
import type { Column } from '@/components/admin/design-system/DataTable'
import Button from '@/components/admin/design-system/Button'
import ReasonDialog from '@/components/admin/design-system/ReasonDialog'

type Uom = {
  id: string
  name: string
  symbol: string | null
  category: string
}

type UomConversion = {
  id: string
  from_uom_id: string
  to_uom_id: string
  factor: number
}

type Category = {
  id: string
  name: string
  parent_id: string | null
  is_active: boolean
  children?: Category[]
}

type CostCentre = {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
}

/* ── Shared dark-theme styles ── */

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
  color: '#A09888', display: 'block', marginBottom: 6, fontFamily: "'Inter', -apple-system, sans-serif",
}

const inputStyle: React.CSSProperties = {
  background: '#171208', border: '1px solid #4A4438', color: '#F0EBE3',
  borderRadius: 8, padding: '10px 12px', fontSize: 13.5, outline: 'none',
  width: '100%', boxSizing: 'border-box', fontFamily: "'Inter', -apple-system, sans-serif",
}

const formCardStyle: React.CSSProperties = {
  background: '#242018', border: '1px solid #3A3428', borderRadius: 12,
  padding: 18, marginBottom: 18, fontFamily: "'Inter', -apple-system, sans-serif",
}

const formTitleStyle: React.CSSProperties = {
  fontSize: 13, fontWeight: 700, color: '#F0EBE3', margin: '0 0 2px',
  fontFamily: "'Inter', -apple-system, sans-serif",
}

const formSubtitleStyle: React.CSSProperties = {
  fontSize: 12, color: '#A09888', margin: '0 0 14px',
  fontFamily: "'Inter', -apple-system, sans-serif",
}

const banner = (kind: 'error' | 'success'): React.CSSProperties => ({
  padding: '11px 14px', borderRadius: 10, fontSize: 13, marginBottom: 14,
  background: kind === 'error' ? 'rgba(232,84,84,0.1)' : 'rgba(87,217,163,0.10)',
  border: `1px solid ${kind === 'error' ? 'rgba(232,84,84,0.4)' : 'rgba(87,217,163,0.35)'}`,
  color: kind === 'error' ? '#F17777' : '#57D9A3',
  fontFamily: "'Inter', -apple-system, sans-serif",
})

/* ── Units of Measure ── */

export function UomsView() {
  const [uoms, setUoms] = useState<Uom[]>([])
  const [conversions, setConversions] = useState<UomConversion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [category, setCategory] = useState('discrete')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // conversions form
  const [convFrom, setConvFrom] = useState('')
  const [convTo, setConvTo] = useState('')
  const [convFactor, setConvFactor] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/inventory/uoms').then(r => r.json()),
      fetch('/api/inventory/uoms/conversions').then(r => r.json()),
    ])
      .then(([uomsJson, convJson]) => {
        setUoms(uomsJson.data || [])
        setConversions(convJson.data || [])
      })
      .catch(() => setError('Failed to load units'))
      .finally(() => setIsLoading(false))
  }, [])

  const uomName = (id: string) => uoms.find(u => u.id === id)?.name ?? id.slice(0, 8)

  async function handleCreate() {
    if (!name.trim()) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const res = await fetch('/api/inventory/uoms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), symbol: symbol.trim() || null, category }),
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error?.message ?? 'Create failed')
      setUoms(prev => [...prev, json.data].sort((a, b) => a.name.localeCompare(b.name)))
      setName(''); setSymbol('')
      setMessage(`Unit "${json.data.name}" added`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create unit')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(uom: Uom) {
    setDeletingId(uom.id)
    setError('')
    setMessage('')
    try {
      const res = await fetch(`/api/inventory/uoms/${uom.id}`, { method: 'DELETE' })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error?.message ?? 'Delete failed')
      setUoms(prev => prev.filter(u => u.id !== uom.id))
      setMessage(`Unit "${uom.name}" deleted`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete unit')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleAddConversion() {
    if (!convFrom || !convTo || !convFactor) { setError('Choose both units and a factor'); return }
    const factor = Number(convFactor)
    if (!Number.isFinite(factor) || factor <= 0) { setError('Factor must be a positive number'); return }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const res = await fetch('/api/inventory/uoms/conversions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_uom_id: convFrom, to_uom_id: convTo, factor }),
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error?.message ?? 'Create failed')
      setConversions(prev => [...prev, json.data])
      setConvFrom(''); setConvTo(''); setConvFactor('')
      setMessage(`Conversion added: 1 ${uomName(convFrom)} = ${factor} ${uomName(convTo)}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add conversion')
    } finally {
      setBusy(false)
    }
  }

  const columns: Column<Uom>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      cell: uom => <span style={{ fontWeight: 600, color: '#F0EBE3' }}>{uom.name}</span>,
    },
    {
      key: 'symbol',
      header: 'Symbol',
      cell: uom => <span style={{ color: '#A09888' }}>{uom.symbol || '—'}</span>,
    },
    {
      key: 'category',
      header: 'Category',
      cell: uom => <span style={{ color: '#D8D0C0' }}>{uom.category}</span>,
    },
    {
      key: 'id',
      header: 'Actions',
      cell: uom => (
        <Button variant="danger" size="sm" disabled={deletingId === uom.id} onClick={() => void handleDelete(uom)}>
          {deletingId === uom.id ? 'Deleting…' : 'Delete'}
        </Button>
      ),
    },
  ]

  const convColumns: Column<UomConversion>[] = [
    {
      key: 'from_uom_id',
      header: 'From',
      cell: c => <span style={{ color: '#F0EBE3' }}>{uomName(c.from_uom_id)}</span>,
    },
    {
      key: 'factor',
      header: 'Factor',
      sortable: true,
      cell: c => <span style={{ color: '#D8D0C0', fontVariantNumeric: 'tabular-nums' }}>{c.factor}</span>,
    },
    {
      key: 'to_uom_id',
      header: 'To',
      cell: c => <span style={{ color: '#F0EBE3' }}>{uomName(c.to_uom_id)}</span>,
    },
  ]

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {error && <div style={banner('error')}>{error}</div>}
      {message && <div style={banner('success')}>{message}</div>}

      <div style={formCardStyle}>
        <p style={formTitleStyle}>Add a unit of measure</p>
        <p style={formSubtitleStyle}>e.g. "bottle", "case", "kg" — discrete = counted whole, continuous = measured (weight/volume)</p>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={labelStyle}>Name *</span>
            <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Case" />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={labelStyle}>Symbol</span>
            <input style={inputStyle} value={symbol} onChange={e => setSymbol(e.target.value)} placeholder="e.g. cs" />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={labelStyle}>Category *</span>
            <select style={inputStyle} value={category} onChange={e => setCategory(e.target.value)}>
              <option value="discrete">Discrete</option>
              <option value="continuous">Continuous</option>
            </select>
          </label>
        </div>
        <div style={{ marginTop: 12 }}>
          <Button onClick={() => void handleCreate()} disabled={busy || !name.trim()}>
            {busy ? 'Adding…' : '+ Add Unit'}
          </Button>
        </div>
      </div>

      <DataTable<Uom>
        columns={columns}
        data={uoms}
        keyField="id"
        isLoading={isLoading}
        emptyState={<div style={{ padding: 40, textAlign: 'center', color: '#A09888' }}>No units defined yet — add one above.</div>}
      />

      <div style={{ ...formCardStyle, marginTop: 18 }}>
        <p style={formTitleStyle}>Conversions</p>
        <p style={formSubtitleStyle}>How units relate — e.g. 1 case = 12 bottles. Used so quantities always convert to a single base unit.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={labelStyle}>From *</span>
            <select style={inputStyle} value={convFrom} onChange={e => setConvFrom(e.target.value)}>
              <option value="">Select…</option>
              {uoms.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={labelStyle}>1 =</span>
            <input style={inputStyle} type="number" min="0" step="any" value={convFactor} onChange={e => setConvFactor(e.target.value)} placeholder="e.g. 12" />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={labelStyle}>To *</span>
            <select style={inputStyle} value={convTo} onChange={e => setConvTo(e.target.value)}>
              <option value="">Select…</option>
              {uoms.filter(u => u.id !== convFrom).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </label>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <Button variant="secondary" onClick={() => void handleAddConversion()} disabled={busy}>
              + Add Conversion
            </Button>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <DataTable<UomConversion>
            columns={convColumns}
            data={conversions}
            keyField="id"
            emptyState={<div style={{ padding: 24, textAlign: 'center', color: '#A09888' }}>No conversions yet.</div>}
          />
        </div>
      </div>
    </div>
  )
}

/* ── Categories ── */

export function CategoriesView() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/inventory/categories')
      .then(r => r.json())
      .then(json => {
        const tree = json.data || []
        const flat: Category[] = []
        const walk = (nodes: Category[]) => {
          for (const node of nodes) {
            flat.push(node)
            if (node.children?.length) walk(node.children)
          }
        }
        walk(tree)
        setCategories(flat)
      })
      .catch(() => setError('Failed to load categories'))
      .finally(() => setIsLoading(false))
  }, [])

  const categoryName = (id: string | null) => {
    const cat = categories.find(c => c.id === id)
    return cat ? cat.name : '—'
  }

  async function handleCreate() {
    if (!name.trim()) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const res = await fetch('/api/inventory/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), parent_id: parentId || null }),
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error?.message ?? 'Create failed')
      setCategories(prev => [...prev, json.data].sort((a, b) => a.name.localeCompare(b.name)))
      setName(''); setParentId('')
      setMessage(`Category "${json.data.name}" added`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create category')
    } finally {
      setBusy(false)
    }
  }

  async function handleRename(cat: Category) {
    const newName = window.prompt('Rename category', cat.name)
    if (!newName || newName.trim() === cat.name) return
    setRenamingId(cat.id)
    setError('')
    setMessage('')
    try {
      const res = await fetch(`/api/inventory/categories/${cat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error?.message ?? 'Rename failed')
      setCategories(prev => prev.map(c => (c.id === cat.id ? json.data : c)))
      setMessage(`Category renamed to "${json.data.name}"`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not rename category')
    } finally {
      setRenamingId(null)
    }
  }

  async function handleDelete(cat: Category) {
    if (!window.confirm(`Delete category "${cat.name}"? This only works while no products use it.`)) return
    setError('')
    setMessage('')
    try {
      const res = await fetch(`/api/inventory/categories/${cat.id}`, { method: 'DELETE' })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error?.message ?? 'Delete failed')
      setCategories(prev => prev.filter(c => c.id !== cat.id))
      setMessage(`Category "${cat.name}" deleted`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete category')
    }
  }

  const columns: Column<Category>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      cell: cat => <span style={{ fontWeight: 600, color: '#F0EBE3' }}>{cat.name}</span>,
    },
    {
      key: 'parent_id',
      header: 'Parent',
      cell: cat => <span style={{ color: '#A09888' }}>{categoryName(cat.parent_id)}</span>,
    },
    {
      key: 'is_active',
      header: 'Status',
      cell: cat => (
        <span style={{
          padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
          background: cat.is_active ? 'rgba(52,211,153,0.15)' : 'rgba(138,134,148,0.15)',
          color: cat.is_active ? '#34D399' : '#A09888',
        }}>
          {cat.is_active ? 'Active' : 'Archived'}
        </span>
      ),
    },
    {
      key: 'id',
      header: 'Actions',
      cell: cat => (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="sm" disabled={renamingId === cat.id} onClick={() => void handleRename(cat)}>
            Rename
          </Button>
          <Button variant="danger" size="sm" onClick={() => void handleDelete(cat)}>Delete</Button>
        </div>
      ),
    },
  ]

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {error && <div style={banner('error')}>{error}</div>}
      {message && <div style={banner('success')}>{message}</div>}

      <div style={formCardStyle}>
        <p style={formTitleStyle}>Add a category</p>
        <p style={formSubtitleStyle}>Groups products for filters and reports — e.g. Spirits, Beers, Meat & Poultry.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={labelStyle}>Name *</span>
            <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Coffee" />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={labelStyle}>Parent (optional)</span>
            <select style={inputStyle} value={parentId} onChange={e => setParentId(e.target.value)}>
              <option value="">— Top level —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        </div>
        <div style={{ marginTop: 12 }}>
          <Button onClick={() => void handleCreate()} disabled={busy || !name.trim()}>
            {busy ? 'Adding…' : '+ Add Category'}
          </Button>
        </div>
      </div>

      <DataTable<Category>
        columns={columns}
        data={categories}
        keyField="id"
        isLoading={isLoading}
        emptyState={<div style={{ padding: 40, textAlign: 'center', color: '#A09888' }}>No categories defined yet — add one above.</div>}
      />
    </div>
  )
}

/* ── Cost Centres ── */

export function CostCentresView() {
  const [costCentres, setCostCentres] = useState<CostCentre[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [archiveTarget, setArchiveTarget] = useState<CostCentre | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/inventory/cost-centres?show_archived=true')
      .then(r => r.json())
      .then(json => setCostCentres(json.data || []))
      .catch(() => setError('Failed to load cost centres'))
      .finally(() => setIsLoading(false))
  }, [])

  async function handleCreate() {
    if (!newName.trim()) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const res = await fetch('/api/inventory/cost-centres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), description: newDescription.trim() || null }),
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error?.message ?? 'Create failed')
      setCostCentres(prev => [...prev, json.data].sort((a, b) => a.name.localeCompare(b.name)))
      setNewName(''); setNewDescription('')
      setMessage(`Cost centre "${json.data.name}" added`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create cost centre')
    } finally {
      setBusy(false)
    }
  }

  async function handleEdit(cc: CostCentre) {
    setEditingId(cc.id)
    setError('')
    setMessage('')
    try {
      const newName = window.prompt('Cost centre name', cc.name)
      if (!newName || newName.trim() === cc.name) {
        setEditingId(null)
        return
      }
      const res = await fetch(`/api/inventory/cost-centres/${cc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error?.message ?? 'Rename failed')
      setCostCentres(prev => prev.map(c => (c.id === cc.id ? json.data : c)))
      setMessage(`Cost centre renamed to "${json.data.name}"`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not rename cost centre')
    } finally {
      setEditingId(null)
    }
  }

  async function toggle(cc: CostCentre, reason?: string) {
    if (cc.is_active && !reason) {
      setArchiveTarget(cc)
      return
    }
    setArchiveTarget(null)
    setError('')
    setMessage('')
    const res = await fetch(`/api/inventory/cost-centres/${cc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !cc.is_active, reason: reason ?? null }),
    })
    const json = await res.json()
    if (res.ok && json.data) {
      setCostCentres(prev => prev.map(c => (c.id === cc.id ? json.data : c)))
      setMessage(`Cost centre "${json.data.name}" ${json.data.is_active ? 'restored' : 'archived'}`)
    } else {
      setError(json?.error?.message ?? 'Update failed')
    }
  }

  const columns: Column<CostCentre>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      cell: cc => <span style={{ fontWeight: 600, color: '#F0EBE3' }}>{cc.name}</span>,
    },
    {
      key: 'description',
      header: 'Description',
      cell: cc => <span style={{ color: '#A09888' }}>{cc.description || '—'}</span>,
    },
    {
      key: 'is_active',
      header: 'Status',
      cell: cc => (
        <span style={{
          padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
          background: cc.is_active ? 'rgba(52,211,153,0.15)' : 'rgba(138,134,148,0.15)',
          color: cc.is_active ? '#34D399' : '#A09888',
        }}>
          {cc.is_active ? 'Active' : 'Archived'}
        </span>
      ),
    },
    {
      key: 'id',
      header: 'Actions',
      cell: cc => (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="sm" disabled={editingId === cc.id} onClick={() => void handleEdit(cc)}>
            Rename
          </Button>
          <Button variant="secondary" size="sm" onClick={() => toggle(cc)}>
            {cc.is_active ? 'Archive' : 'Restore'}
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {error && <div style={banner('error')}>{error}</div>}
      {message && <div style={banner('success')}>{message}</div>}

      <div style={formCardStyle}>
        <p style={formTitleStyle}>Add a cost centre</p>
        <p style={formSubtitleStyle}>A department every stock movement is tagged to — e.g. Restaurant, Bar, Kitchen, Events.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={labelStyle}>Name *</span>
            <input style={inputStyle} value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Takeaway" />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={labelStyle}>Description</span>
            <input style={inputStyle} value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Optional" />
          </label>
        </div>
        <div style={{ marginTop: 12 }}>
          <Button onClick={() => void handleCreate()} disabled={busy || !newName.trim()}>
            {busy ? 'Adding…' : '+ Add Cost Centre'}
          </Button>
        </div>
      </div>

      <DataTable<CostCentre>
        columns={columns}
        data={costCentres}
        keyField="id"
        isLoading={isLoading}
        emptyState={<div style={{ padding: 40, textAlign: 'center', color: '#A09888' }}>No cost centres defined yet — add one above.</div>}
      />

      <ReasonDialog
        open={archiveTarget !== null}
        title={archiveTarget ? `Archive "${archiveTarget.name}"?` : ''}
        message="The cost centre will be hidden from movement dropdowns. Historical transactions keep it."
        confirmLabel="Archive"
        confirmVariant="danger"
        onConfirm={reason => archiveTarget && toggle(archiveTarget, reason)}
        onCancel={() => setArchiveTarget(null)}
      />
    </div>
  )
}