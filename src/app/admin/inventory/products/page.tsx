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

export default function InventoryProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)

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
        <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search products…">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} className="rounded" />
            Show archived
          </label>
          <Button onClick={fetchProducts} variant="secondary" size="sm">Refresh</Button>
        </FilterBar>
      }
    >
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
