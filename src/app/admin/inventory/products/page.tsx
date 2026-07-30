'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/admin/design-system/PageHeader'
import Button from '@/components/admin/design-system/Button'
import { Select } from '@/components/admin/design-system/Input'
import Badge from '@/components/admin/design-system/Badge'
import { SkeletonCard } from '@/components/admin/design-system/Skeleton'
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

  return (
    <div>
      <PageHeader title="Products" description="Manage inventory products" actions={<Link href="/admin/inventory/products/new"><Button variant="primary" size="sm">+ Add Product</Button></Link>} />

      <div className="flex gap-3 mb-4 items-center">
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 border rounded-lg text-sm"
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} />
          Show archived
        </label>
        <Button onClick={fetchProducts} variant="secondary" size="sm">Refresh</Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : products.length === 0 ? (
        <EmptyState title="No products found" description={search ? 'Try a different search term' : 'Add your first product'} />
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">SKU</th>
                  <th className="text-left p-3 font-medium">Balance</th>
                  <th className="text-left p-3 font-medium">Reorder</th>
                  <th className="text-left p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => (
                  <tr key={product.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => window.location.href = `/admin/inventory/products/${product.id}`}>
                    <td className="p-3 font-medium">
                      <span className={!product.is_active ? 'text-gray-400' : ''}>{product.name}</span>
                    </td>
                    <td className="p-3 text-gray-500 text-xs">{product.sku || '—'}</td>
                    <td className="p-3">{product.current_balance !== null && product.current_balance !== undefined ? product.current_balance : '—'}</td>
                    <td className="p-3">{product.reorder_threshold ?? '—'}</td>
                    <td className="p-3">
                      {!product.is_active ? (
                        <Badge variant="info">Archived</Badge>
                      ) : product.current_balance !== null && product.current_balance !== undefined && product.current_balance <= 0 ? (
                        <Badge variant="danger">Out of Stock</Badge>
                      ) : product.reorder_threshold && product.current_balance !== null && product.current_balance !== undefined && product.current_balance <= product.reorder_threshold ? (
                        <Badge variant="warning">Low</Badge>
                      ) : (
                        <Badge variant="success">Active</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
