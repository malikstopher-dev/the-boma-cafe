'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Button from '@/components/admin/design-system/Button'
import Badge from '@/components/admin/design-system/Badge'
import { SkeletonCard } from '@/components/admin/design-system/Skeleton'
import EmptyState from '@/components/admin/design-system/EmptyState'
import ReasonDialog from '@/components/admin/design-system/ReasonDialog'
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
  current_balance?: number | null
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
  const [busy, setBusy] = useState(false)
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)

  function load() {
    const id = params?.id as string
    if (!id) return

    fetch(`/api/inventory/products/${id}?location_id=main`)
      .then(r => r.json())
      .then(json => {
        if (json.error) setError(json.error.message)
        else setProduct(json.data)
      })
      .catch(() => setError('Failed to load product'))
      .finally(() => setIsLoading(false))
  }

  useEffect(load, [params?.id])

  async function handleArchive(reason: string) {
    const id = params?.id as string
    setBusy(true)
    setShowArchiveConfirm(false)
    try {
      const res = await fetch(`/api/inventory/products/${id}`, { method: 'DELETE' })
      if (res.ok || res.status === 409) {
        setProduct(prev => prev ? { ...prev, is_active: false } : prev)
      } else {
        const err = await res.json().catch(() => null)
        alert(err?.error?.message || 'Archive failed')
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleRestore() {
    const id = params?.id as string
    setBusy(true)
    try {
      const res = await fetch(`/api/inventory/products/${id}/restore`, { method: 'POST' })
      if (res.ok) {
        const json = await res.json()
        setProduct(json.data)
      } else {
        const err = await res.json().catch(() => null)
        alert(err?.error?.message || 'Restore failed')
      }
    } finally {
      setBusy(false)
    }
  }

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
    <AdminPage title={product.name} description={`SKU: ${product.sku || '—'}`} actions={<><Badge variant={product.is_active ? 'success' : 'info'}>{product.is_active ? 'Active' : 'Archived'}</Badge><Link href="/admin/operations/products"><Button variant="secondary" size="sm">Back</Button></Link></>}>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border p-4" style={{ background: '#1E1A14', borderColor: '#3A3428' }}>
            <h3 className="mb-3" style={{ fontSize: 16, fontWeight: 600, color: '#F0EBE3', fontFamily: "'Inter', sans-serif" }}>Product Information</h3>
            <dl className="grid grid-cols-2 gap-3 text-sm" style={{ fontFamily: "'Inter', sans-serif" }}>
              <div><dt style={{ color: '#A09888', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</dt><dd style={{ color: '#F0EBE3', fontWeight: 500, marginTop: 2 }}>{product.name}</dd></div>
              <div><dt style={{ color: '#A09888', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>SKU</dt><dd style={{ color: '#F0EBE3', fontWeight: 500, marginTop: 2 }}>{product.sku || '—'}</dd></div>
              <div><dt style={{ color: '#A09888', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Barcode</dt><dd style={{ color: '#F0EBE3', fontWeight: 500, marginTop: 2 }}>{product.barcode || '—'}</dd></div>
              <div><dt style={{ color: '#A09888', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reorder Threshold</dt><dd style={{ color: '#F0EBE3', fontWeight: 500, marginTop: 2 }}>{product.reorder_threshold ?? '—'}</dd></div>
              <div><dt style={{ color: '#A09888', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reorder Quantity</dt><dd style={{ color: '#F0EBE3', fontWeight: 500, marginTop: 2 }}>{product.reorder_quantity ?? '—'}</dd></div>
              <div><dt style={{ color: '#A09888', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Supplier Code</dt><dd style={{ color: '#F0EBE3', fontWeight: 500, marginTop: 2 }}>{product.supplier_code || '—'}</dd></div>
              <div><dt style={{ color: '#A09888', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Has Expiry</dt><dd style={{ color: '#F0EBE3', fontWeight: 500, marginTop: 2 }}>{product.has_expiry ? 'Yes' : 'No'}</dd></div>
              <div><dt style={{ color: '#A09888', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Shelf Life</dt><dd style={{ color: '#F0EBE3', fontWeight: 500, marginTop: 2 }}>{product.shelf_life_days ? `${product.shelf_life_days} days` : '—'}</dd></div>
            </dl>
          </div>

          {product.inventory_product_uoms && product.inventory_product_uoms.length > 0 && (
          <div className="rounded-lg border p-4" style={{ background: '#1E1A14', borderColor: '#3A3428' }}>
              <h3 className="mb-3" style={{ fontSize: 16, fontWeight: 600, color: '#F0EBE3', fontFamily: "'Inter', sans-serif" }}>UOM Configuration</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#242018' }}>
                    <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 600, color: '#6B6358', textTransform: 'uppercase', letterSpacing: '0.04em' }}>UOM</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 600, color: '#6B6358', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Role</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 600, color: '#6B6358', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Conversion Factor</th>
                  </tr>
                </thead>
                <tbody>
                  {product.inventory_product_uoms.map(uom => (
                    <tr key={uom.id} style={{ borderBottom: '1px solid #3A3428' }}>
                      <td style={{ padding: '12px 16px', color: '#F0EBE3' }}>{uom.uom_id}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {uom.is_base && <Badge variant="info">Base</Badge>}
                        {uom.is_display && <Badge variant="success">Display</Badge>}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#F0EBE3' }}>{uom.conversion_factor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="rounded-lg border p-4" style={{ background: '#1E1A14', borderColor: '#3A3428' }}>
            <h3 className="mb-3" style={{ fontSize: 16, fontWeight: 600, color: '#F0EBE3', fontFamily: "'Inter', sans-serif" }}>Activity Timeline</h3>
            <MovementTimeline productId={product.id} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border p-4" style={{ background: '#1E1A14', borderColor: '#3A3428' }}>
            <h3 className="mb-3" style={{ fontSize: 16, fontWeight: 600, color: '#F0EBE3', fontFamily: "'Inter', sans-serif" }}>Actions</h3>
            <div className="space-y-2">
              {product.is_active ? (
                <Button className="w-full" variant="danger" size="sm" onClick={() => setShowArchiveConfirm(true)} disabled={busy}>
                  {busy ? 'Working...' : 'Archive'}
                </Button>
              ) : (
                <Button className="w-full" variant="primary" size="sm" onClick={handleRestore} disabled={busy}>
                  {busy ? 'Working...' : 'Restore'}
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-lg border p-4" style={{ background: '#1E1A14', borderColor: '#3A3428' }}>
            <h3 className="mb-3" style={{ fontSize: 16, fontWeight: 600, color: '#F0EBE3', fontFamily: "'Inter', sans-serif" }}>Stock Summary</h3>
            <div className="text-sm">
              <div className="flex justify-between py-1">
                <span style={{ color: '#A09888' }}>Current Balance</span>
                <span style={{ color: '#F0EBE3', fontWeight: 500 }}>
                  {product.current_balance !== null && product.current_balance !== undefined
                    ? product.current_balance.toFixed(2)
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span style={{ color: '#A09888' }}>Reorder Threshold</span>
                <span style={{ color: '#F0EBE3', fontWeight: 500 }}>{product.reorder_threshold ?? '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ReasonDialog
        open={showArchiveConfirm}
        title={`Archive "${product.name}"?`}
        message="The product will no longer appear in active lists. Historical transactions are kept."
        confirmLabel="Archive"
        onConfirm={handleArchive}
        onCancel={() => setShowArchiveConfirm(false)}
      />
    </AdminPage>
  )
}