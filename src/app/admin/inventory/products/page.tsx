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

interface Product {
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

export default function InventoryProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', sku: '', barcode: '', inventory_type: 'GENERAL' })

  const fetchProducts = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (showArchived) params.set('show_archived', 'true')
      params.set('page_size', '100')

      const res = await fetch(`/api/inventory/products?${params}`)
      const json = await res.json()
      setProducts(json.data || [])
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [search, showArchived])

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
      setForm({ name: '', sku: '', barcode: '', inventory_type: 'GENERAL' })
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
        <span className={!product.is_active ? 'opacity-50' : ''}>
          {product.name}
        </span>
      ),
    },
    {
      key: 'sku',
      header: 'SKU',
      sortable: true,
      cell: product => (
        <span className="text-xs text-gray-500 font-mono">{product.sku || '—'}</span>
      ),
    },
    {
      key: 'barcode',
      header: 'Barcode',
      sortable: true,
      cell: product => (
        <span className="text-xs text-gray-500 font-mono">{product.barcode || '—'}</span>
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

  return (
    <AdminPage
      title="Products"
      description="Manage inventory products"
      filters={
        <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search name, SKU, or barcode…">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} className="rounded" />
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
        <div className="bg-white border rounded-lg p-4 mb-4">
          <div className="grid grid-cols-4 gap-3 mb-3">
            <input
              className="border rounded px-3 py-2 text-sm"
              placeholder="Product name *"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
            <input
              className="border rounded px-3 py-2 text-sm"
              placeholder="SKU"
              value={form.sku}
              onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
            />
            <input
              className="border rounded px-3 py-2 text-sm font-mono"
              placeholder="Barcode (scan or type)"
              value={form.barcode}
              onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))}
              autoFocus
            />
            <select
              className="border rounded px-3 py-2 text-sm"
              value={form.inventory_type}
              onChange={e => setForm(f => ({ ...f, inventory_type: e.target.value }))}
            >
              {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={saving || !form.name.trim()}>{saving ? 'Creating...' : 'Create Product'}</Button>
            <Button variant="secondary" onClick={() => setShowCreateForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <DataTable<Product>
        columns={columns}
        data={products}
        keyField="id"
        onRowClick={product => router.push(`/admin/inventory/products/${product.id}`)}
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
