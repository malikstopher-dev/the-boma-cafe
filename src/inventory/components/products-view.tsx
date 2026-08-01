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
  }, [search, showArchived, forcedType])

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

  const columns: Column<Product>[] = [
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
      cell: product => (
        <span>{product.current_balance !== null && product.current_balance !== undefined ? product.current_balance : '—'}</span>
      ),
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
        return <Badge variant="success">Active</Badge>
      },
    },
  ]

  const titleLabel = forcedType
    ? `${forcedType.charAt(0) + forcedType.slice(1).toLowerCase()} Products`
    : 'Products'

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
          <Button onClick={fetchProducts} variant="secondary" size="sm">Refresh</Button>
        </FilterBar>
      }
    >
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

      <DataTable<Product>
        columns={columns}
        data={products}
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