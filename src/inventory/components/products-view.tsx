'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import AdminPage from '@/components/admin/design-system/AdminPage'
import DataTable from '@/components/admin/design-system/DataTable'
import type { Column } from '@/components/admin/design-system/DataTable'
import FilterBar from '@/components/admin/design-system/FilterBar'
import Button from '@/components/admin/design-system/Button'
import Badge from '@/components/admin/design-system/Badge'
import EmptyState from '@/components/admin/design-system/EmptyState'
import ProductImportDialog from '@/inventory/components/product-import'
import styles from '@/components/admin/design-system/DesignSystem.module.css'

type Product = {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  category_id: string | null
  is_active: boolean
  deleted_at: string | null
  reorder_threshold: number | null
  current_balance?: number | null
  inventory_product_uoms?: Array<{
    is_base: boolean
    is_display: boolean
    conversion_factor: number
    inventory_uoms?: { name: string | null; symbol: string | null } | null
  }> | null
}

function displayUnit(product: Product): { factor: number; name: string | null } | null {
  const row = product.inventory_product_uoms?.find(u => u.is_display)
  if (!row || !row.conversion_factor || row.conversion_factor <= 0) return null
  return { factor: row.conversion_factor, name: row.inventory_uoms?.name ?? null }
}

const TYPE_OPTIONS = ['FOOD', 'BEVERAGE', 'CLEANING', 'PACKAGING', 'GENERAL']

export default function ProductsView({ forcedType }: { forcedType?: string }) {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'out' | 'low'>('all')
  const [importOpen, setImportOpen] = useState(false)
  const [importIds, setImportIds] = useState<string[] | null>(null)
  const [selection, setSelection] = useState<Set<string>>(new Set())
  const [bulkCategories, setBulkCategories] = useState<{ id: string; name: string }[]>([])
  const [bulkSuppliers, setBulkSuppliers] = useState<{ id: string; name: string }[]>([])
  const [bulkCategory, setBulkCategory] = useState('')
  const [bulkSupplier, setBulkSupplier] = useState('')
  const [bulkThreshold, setBulkThreshold] = useState('')
  const [bulkCost, setBulkCost] = useState('')
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkMsg, setBulkMsg] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    sku: '',
    barcode: '',
    inventory_type: forcedType ?? 'GENERAL',
  })

  const fetchProducts = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (showArchived) params.set('show_archived', 'true')
      if (forcedType) params.set('inventory_type', forcedType)
      if (importIds && importIds.length > 0) params.set('ids', importIds.join(','))
      params.set('location_id', 'main')
      params.set('page_size', '100')

      const res = await fetch(`/api/inventory/products?${params}`)
      const json = await res.json()
      setProducts(json.data || [])
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [search, showArchived, forcedType, importIds])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  async function handleCreate() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/inventory/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          sku: form.sku.trim() || null,
          barcode: form.barcode.trim() || null,
          inventory_type: form.inventory_type,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        alert(json.error?.message || 'Failed to create product')
        return
      }
      setShowCreateForm(false)
      setForm({ name: '', sku: '', barcode: '', inventory_type: forcedType ?? 'GENERAL' })
      fetchProducts()
    } catch {
      alert('Failed to create product')
    } finally {
      setSaving(false)
    }
  }

  async function loadBulkOptions() {
    if (bulkCategories.length > 0 && bulkSuppliers.length > 0) return
    try {
      const [catRes, supRes] = await Promise.all([
        fetch('/api/inventory/categories'),
        fetch('/api/inventory/suppliers?page_size=100'),
      ])
      const catJson = await catRes.json()
      const supJson = await supRes.json()
      const flatten = (nodes: Array<{ id: string; name: string; children?: unknown[] }>, out: { id: string; name: string }[]) => {
        for (const n of nodes) {
          out.push({ id: n.id, name: n.name })
          if (Array.isArray(n.children)) flatten(n.children as Array<{ id: string; name: string; children?: unknown[] }>, out)
        }
        return out
      }
      setBulkCategories(flatten(catJson.data ?? [], []))
      setBulkSuppliers((supJson.data ?? []).map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })))
    } catch {
      // ignore
    }
  }

  function toggleSelect(id: string) {
    setSelection(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function runBulk(patch: Record<string, unknown>, deleteRows?: boolean) {
    if (selection.size === 0) return
    setBulkBusy(true)
    setBulkMsg(null)
    try {
      const res = await fetch('/api/inventory/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...selection], patch, delete: deleteRows === true }),
      })
      const json = await res.json()
      if (!res.ok) {
        setBulkMsg('Failed: ' + (json.error?.message || 'unknown error'))
        return
      }
      const d = json.data as { updated: string[]; archived: string[]; deleted: string[]; errors: { id: string; message: string }[] }
      setBulkMsg(`Done — ${d.updated.length} updated, ${d.archived.length} archived, ${d.deleted.length} deleted${d.errors.length ? `, ${d.errors.length} failed` : ''}.`)
      setSelection(new Set())
      setBulkCategory('')
      setBulkSupplier('')
      setBulkThreshold('')
      setBulkCost('')
      fetchProducts()
    } catch {
      setBulkMsg('Failed to apply bulk edit')
    } finally {
      setBulkBusy(false)
    }
  }

  function buildBulkPatch(): Record<string, unknown> | null {
    const patch: Record<string, unknown> = {}
    if (bulkCategory) patch.category_id = bulkCategory
    if (bulkSupplier) patch.preferred_supplier_id = bulkSupplier
    if (bulkThreshold !== '') {
      const n = Number(bulkThreshold)
      if (Number.isFinite(n)) patch.reorder_threshold = n
    }
    if (bulkCost !== '') {
      const n = Number(bulkCost)
      if (Number.isFinite(n)) patch.unit_cost = n
    }
    return Object.keys(patch).length > 0 ? patch : null
  }

  const columns: Column<Product>[] = [
    {
      key: 'select',
      header: ' ',
      cell: product => (
        <input
          type="checkbox"
          checked={selection.has(product.id)}
          onChange={() => toggleSelect(product.id)}
          onClick={e => e.stopPropagation()}
          style={{ accentColor: '#D4A843', cursor: 'pointer' }}
        />
      ),
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      cell: product => (
        <span style={!product.is_active ? { opacity: 0.5 } : {}}>
          {product.name}
        </span>
      ),
    },
    {
      key: 'sku',
      header: 'SKU',
      sortable: true,
      cell: product => (
        <span style={{ fontSize: 12, color: '#5A5666', fontFamily: "'JetBrains Mono', monospace" }}>{product.sku || '—'}</span>
      ),
    },
    {
      key: 'barcode',
      header: 'Barcode',
      sortable: true,
      cell: product => (
        <span style={{ fontSize: 12, color: '#5A5666', fontFamily: "'JetBrains Mono', monospace" }}>{product.barcode || '—'}</span>
      ),
    },
    {
      key: 'current_balance',
      header: 'Balance',
      sortable: true,
      cell: product => {
        const bal = product.current_balance
        if (bal === null || bal === undefined) return <span>—</span>
        const display = displayUnit(product)
        if (!display) return <span>{bal}</span>
        const portions = bal / display.factor
        return (
          <span>
            {Number.isInteger(portions) ? portions : portions.toFixed(1)}{' '}
            <span style={{ color: '#5A5666', fontSize: 12 }}>{display.name ?? 'units'}</span>
          </span>
        )
      },
    },
    {
      key: 'reorder_threshold',
      header: 'Reorder',
      sortable: true,
      cell: product => (
        <span>{product.reorder_threshold ?? '—'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: product => {
        if (!product.is_active) return <Badge variant="info">Archived</Badge>
        if (product.current_balance !== null && product.current_balance !== undefined && product.current_balance <= 0) {
          return <Badge variant="danger">Out of Stock</Badge>
        }
        if (product.reorder_threshold && product.current_balance !== null && product.current_balance !== undefined && product.current_balance <= product.reorder_threshold) {
          return <Badge variant="warning">Low</Badge>
        }
        return <Badge variant="success">In Stock</Badge>
      },
    },
  ]

  const titleLabel = forcedType
    ? `${forcedType.charAt(0) + forcedType.slice(1).toLowerCase()} Products`
    : 'Products'

  const active = products.filter(p => p.is_active)
  const outOfStock = active.filter(p => p.current_balance !== null && p.current_balance !== undefined && p.current_balance <= 0)
  const lowStock = active.filter(p =>
    p.current_balance !== null && p.current_balance !== undefined &&
    p.current_balance > 0 &&
    p.reorder_threshold !== null && p.reorder_threshold !== undefined &&
    p.current_balance <= p.reorder_threshold,
  )
  const belowParCount = outOfStock.length + lowStock.length

  const visibleProducts = statusFilter === 'out'
    ? active.filter(p => p.current_balance !== null && p.current_balance !== undefined && p.current_balance <= 0)
    : statusFilter === 'low'
      ? active.filter(p => {
          if (p.current_balance === null || p.current_balance === undefined) return false
          if (p.current_balance <= 0) return false
          if (p.reorder_threshold === null || p.reorder_threshold === undefined) return false
          return p.current_balance <= p.reorder_threshold
        })
      : products

  const descLabel = forcedType
    ? `${forcedType.charAt(0) + forcedType.slice(1).toLowerCase()} products only — see all in Products`
    : 'Manage inventory products'

  return (
    <AdminPage
      title={titleLabel}
      description={descLabel}
      filters={
        <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search name, SKU, or barcode…">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#8A8694', cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={showArchived}
              onChange={e => setShowArchived(e.target.checked)}
              style={{ accentColor: '#D4A843' }}
            />
            Show archived
          </label>
          <Button onClick={() => setShowCreateForm(v => !v)} size="sm">
            {showCreateForm ? 'Cancel' : 'Add Product'}
          </Button>
          <Button onClick={() => setImportOpen(true)} size="sm">Import Products</Button>
          <Button onClick={fetchProducts} variant="secondary" size="sm">Refresh</Button>
        </FilterBar>
      }
    >
      {importIds && importIds.length > 0 && (
        <div className={styles.card} style={{ marginBottom: 16, padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#A09888' }}>
            Viewing <b style={{ color: '#F0EBE3' }}>{products.length}</b> imported product{products.length === 1 ? '' : 's'} from the last import.
          </span>
          <Button size="sm" variant="secondary" onClick={() => setImportIds(null)}>Clear filter</Button>
        </div>
      )}

      <ProductImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        forcedType={forcedType}
        onImported={ids => { setImportIds(ids.length > 0 ? ids : null) }}
      />
      {showCreateForm && (
        <div className={styles.card} style={{ marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
            <input
              className={styles.input}
              placeholder="Product name *"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
            <input
              className={styles.input}
              placeholder="SKU"
              value={form.sku}
              onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
            />
            <input
              className={styles.input}
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
              placeholder="Barcode (scan or type)"
              value={form.barcode}
              onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))}
              autoFocus
            />
            {forcedType ? (
              <input
                className={styles.input}
                value={form.inventory_type}
                readOnly
                tabIndex={-1}
                disabled
              />
            ) : (
              <select
                className={styles.input + ' ' + styles.select}
                value={form.inventory_type}
                onChange={e => setForm(f => ({ ...f, inventory_type: e.target.value }))}
              >
                {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={handleCreate} disabled={saving || !form.name.trim()}>{saving ? 'Creating...' : 'Create Product'}</Button>
            <Button variant="secondary" onClick={() => setShowCreateForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <button
          onClick={() => setStatusFilter('all')}
          style={{
            padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600,
            background: statusFilter === 'all' ? '#3A3428' : '#1E1A14', color: statusFilter === 'all' ? '#F0EBE3' : '#A09888',
            border: '1px solid #3A3428', display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4CAF50' }} />
          All ({active.length})
        </button>
        <button
          onClick={() => setStatusFilter('low')}
          style={{
            padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600,
            background: statusFilter === 'low' ? '#3A3428' : '#1E1A14', color: statusFilter === 'low' ? '#F0EBE3' : '#A09888',
            border: '1px solid #3A3428', display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F5C444' }} />
          Below Par — {belowParCount} need ordering
        </button>
        <button
          onClick={() => setStatusFilter('out')}
          style={{
            padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600,
            background: statusFilter === 'out' ? '#2A1515' : '#1E1A14', color: statusFilter === 'out' ? '#E85454' : '#A09888',
            border: '1px solid #3A3428', display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#E85454' }} />
          Out of Stock — {outOfStock.length}
        </button>
      </div>

      {selection.size > 0 && (
        <div className={styles.card} style={{ marginBottom: 16, padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: '#F0EBE3' }}>
              <b>{selection.size}</b> selected
              <Button size="sm" variant="secondary" onClick={() => { setSelection(new Set()); setBulkMsg(null) }} style={{ marginLeft: 10 }}>
                Clear
              </Button>
              <Button size="sm" variant="secondary" onClick={() => { setSelection(new Set(visibleProducts.filter(p => p.is_active).map(p => p.id))); setBulkMsg(null) }} style={{ marginLeft: 8 }}>
                Select all {visibleProducts.filter(p => p.is_active).length}
              </Button>
            </span>
            <Button size="sm" variant="secondary" onClick={loadBulkOptions}>Load options</Button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 10 }}>
            <select
              className={styles.input + ' ' + styles.select}
              value={bulkCategory}
              onChange={e => setBulkCategory(e.target.value)}
            >
              <option value="">Category…</option>
              {bulkCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select
              className={styles.input + ' ' + styles.select}
              value={bulkSupplier}
              onChange={e => setBulkSupplier(e.target.value)}
            >
              <option value="">Supplier…</option>
              {bulkSuppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input
              className={styles.input}
              placeholder="Reorder threshold"
              value={bulkThreshold}
              onChange={e => setBulkThreshold(e.target.value)}
            />
            <input
              className={styles.input}
              placeholder="Unit cost (R)"
              value={bulkCost}
              onChange={e => setBulkCost(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button size="sm" disabled={bulkBusy || !buildBulkPatch()} onClick={() => { const p = buildBulkPatch(); if (p) runBulk(p) }}>
              Apply Changes
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={bulkBusy}
              onClick={() => {
                if (confirm(`Archive ${selection.size} selected product(s)?`)) runBulk({ is_active: false })
              }}
            >
              Archive
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={bulkBusy}
              onClick={() => {
                if (confirm(`Delete ${selection.size} selected product(s)? Products with stock history will be archived instead.`)) runBulk({ is_active: false }, true)
              }}
            >
              Delete
            </Button>
            {bulkMsg && <span style={{ fontSize: 12.5, color: bulkMsg.startsWith('Failed') ? '#E85454' : '#4CAF50' }}>{bulkMsg}</span>}
          </div>
        </div>
      )}

      <DataTable<Product>
        columns={columns}
        data={visibleProducts}
        keyField="id"
        onRowClick={product => router.push(`/admin/operations/products/${product.id}`)}
        isLoading={isLoading}
        emptyState={
          <EmptyState
            title="No products found"
            description={search ? 'Try a different search term' : 'Add your first product'}
          />
        }
      />
    </AdminPage>
  )
}