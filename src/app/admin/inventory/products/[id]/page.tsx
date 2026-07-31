'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Button from '@/components/admin/design-system/Button'
import Badge from '@/components/admin/design-system/Badge'
import { SkeletonCard } from '@/components/admin/design-system/Skeleton'
import EmptyState from '@/components/admin/design-system/EmptyState'
import MovementTimeline from '@/inventory/components/movement-timeline'

interface ProductDetail {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  category_id: string | null
  image_url: string | null
  is_active: boolean
  deleted_at: string | null
  preferred_supplier_id: string | null
  supplier_code: string | null
  reorder_threshold: number | null
  reorder_quantity: number | null
  has_expiry: boolean
  shelf_life_days: number | null
  created_at: string
  updated_at: string
  inventory_product_uoms?: Array<{
    id: string
    uom_id: string
    is_base: boolean
    is_display: boolean
    conversion_factor: number
  }>
}

export default function ProductDetailPage() {
  const params = useParams()
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const id = params?.id as string
    if (!id) return

    fetch(`/api/inventory/products/${id}`)
      .then(r => r.json())
      .then(json => {
        if (json.error) setError(json.error.message)
        else setProduct(json.data)
      })
      .catch(() => setError('Failed to load product'))
      .finally(() => setIsLoading(false))
  }, [params?.id])

  if (isLoading) {
    return (
      <AdminPage title="Product Detail">
        <SkeletonCard />
      </AdminPage>
    )
  }

  if (error || !product) {
    return (
      <AdminPage title="Product Detail">
        <EmptyState title="Product not found" description={error || 'The product could not be loaded'} />
      </AdminPage>
    )
  }

  return (
    <AdminPage title={product.name} description={`SKU: ${product.sku || '—'}`} actions={<><Badge variant={product.is_active ? 'success' : 'info'}>{product.is_active ? 'Active' : 'Archived'}</Badge><Link href="/admin/inventory/products"><Button variant="secondary" size="sm">Back</Button></Link></>}>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold mb-3">Product Information</h3>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-gray-500">Name</dt><dd className="font-medium">{product.name}</dd></div>
              <div><dt className="text-gray-500">SKU</dt><dd className="font-medium">{product.sku || '—'}</dd></div>
              <div><dt className="text-gray-500">Barcode</dt><dd className="font-medium">{product.barcode || '—'}</dd></div>
              <div><dt className="text-gray-500">Reorder Threshold</dt><dd className="font-medium">{product.reorder_threshold ?? '—'}</dd></div>
              <div><dt className="text-gray-500">Reorder Quantity</dt><dd className="font-medium">{product.reorder_quantity ?? '—'}</dd></div>
              <div><dt className="text-gray-500">Supplier Code</dt><dd className="font-medium">{product.supplier_code || '—'}</dd></div>
              <div><dt className="text-gray-500">Has Expiry</dt><dd className="font-medium">{product.has_expiry ? 'Yes' : 'No'}</dd></div>
              <div><dt className="text-gray-500">Shelf Life</dt><dd className="font-medium">{product.shelf_life_days ? `${product.shelf_life_days} days` : '—'}</dd></div>
            </dl>
          </div>

          {product.inventory_product_uoms && product.inventory_product_uoms.length > 0 && (
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-semibold mb-3">UOM Configuration</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-2">UOM</th>
                    <th className="text-left p-2">Role</th>
                    <th className="text-left p-2">Conversion Factor</th>
                  </tr>
                </thead>
                <tbody>
                  {product.inventory_product_uoms.map(uom => (
                    <tr key={uom.id} className="border-b">
                      <td className="p-2">{uom.uom_id}</td>
                      <td className="p-2">
                        {uom.is_base && <Badge variant="info">Base</Badge>}
                        {uom.is_display && <Badge variant="success">Display</Badge>}
                      </td>
                      <td className="p-2">{uom.conversion_factor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold mb-3">Activity Timeline</h3>
            <MovementTimeline productId={product.id} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold mb-3">Actions</h3>
            <div className="space-y-2">
              <Button className="w-full" variant="primary" size="sm">Edit Product</Button>
              <Button className="w-full" variant={product.is_active ? 'danger' : 'primary'} size="sm">
                {product.is_active ? 'Archive' : 'Restore'}
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold mb-3">Stock Summary</h3>
            <p className="text-sm text-gray-500">Select a location to view stock</p>
          </div>
        </div>
      </div>
    </AdminPage>
  )
}
