'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { PageHeader } from '@/components/admin/design-system/PageHeader'
import Button from '@/components/admin/design-system/Button'
import Badge from '@/components/admin/design-system/Badge'
import { SkeletonCard } from '@/components/admin/design-system/Skeleton'
import { CountCard, VarianceTable } from '@/inventory/components/count-card'

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'default' | 'danger'> = {
  in_progress: 'warning',
  submitted: 'default',
  approved: 'success',
  cancelled: 'danger',
}

export default function StockCountDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [data, setData] = useState<{ stockCount: any; items: any[] } | null>(null)
  const [products, setProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [mode, setMode] = useState<'count' | 'review'>('count')
  const [approving, setApproving] = useState(false)

  useEffect(() => {
    const id = params?.id as string
    if (!id) return

    Promise.all([
      fetch(`/api/inventory/stock-counts/${id}`).then(r => r.json()),
      fetch('/api/inventory/products?page_size=200').then(r => r.json()),
    ])
      .then(([scJson, prodJson]) => {
        if (scJson.error) setError(scJson.error.message)
        else setData(scJson.data)
        setProducts(prodJson.data || [])
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setIsLoading(false))
  }, [params?.id])

  const stockCount = data?.stockCount
  const countItems = data?.items || []

  const countedProductIds = new Set(countItems.map((i: any) => i.product_id))
  const uncountedProducts = products.filter((p: any) => !countedProductIds.has(p.id))

  if (isLoading) return <div><PageHeader title="Stock Count" /><SkeletonCard /></div>
  if (error || !data || !stockCount) return <div><PageHeader title="Stock Count" /><div className="text-red-500">{error || 'Not found'}</div></div>

  const isInProgress = stockCount.status === 'in_progress'
  const isSubmitted = stockCount.status === 'submitted'
  const isApproved = stockCount.status === 'approved'

  async function handleSave(quantity: number) {
    const id = params?.id as string
    const productId = currentProduct?.id
    if (!productId) return

    const res = await fetch(`/api/inventory/stock-counts/${id}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId, physical_quantity: quantity }),
    })
    if (!res.ok) throw new Error('Save failed')
  }

  async function handleSubmit() {
    const id = params?.id as string
    const res = await fetch(`/api/inventory/stock-counts/${id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    if (res.ok) {
      const json = await res.json()
      setData(prev => prev ? { ...prev, stockCount: json.data } : prev)
      setMode('review')
    } else {
      const err = await res.json()
      alert(err.error?.message || 'Submit failed')
    }
  }

  async function handleApprove() {
    const id = params?.id as string
    setApproving(true)
    try {
      const res = await fetch(`/api/inventory/stock-counts/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved_by: 'admin' }),
      })
      if (res.ok) {
        const json = await res.json()
        setData(prev => prev ? { ...prev, stockCount: json.data } : prev)
      } else {
        const err = await res.json()
        alert(err.error?.message || 'Approve failed')
      }
    } finally {
      setApproving(false)
    }
  }

  async function handleCancel() {
    const id = params?.id as string
    if (!confirm('Cancel this stock count?')) return
    const res = await fetch(`/api/inventory/stock-counts/${id}/cancel`, { method: 'POST' })
    if (res.ok) {
      router.push('/admin/inventory/stock-counts')
    }
  }

  async function handleSkip() {
    setCurrentIndex(prev => Math.min(prev + 1, countItems.length + uncountedProducts.length - 1))
  }

  let currentProduct: any = null
  let currentItem: any = null

  if (countItems.length > 0 && currentIndex < countItems.length) {
    currentItem = countItems[currentIndex]
    currentProduct = products.find((p: any) => p.id === currentItem.product_id)
  } else if (uncountedProducts.length > 0) {
    const uncountedIndex = currentIndex - countItems.length
    if (uncountedIndex >= 0 && uncountedIndex < uncountedProducts.length) {
      currentProduct = uncountedProducts[uncountedIndex]
    }
  }

  const totalForCounting = countItems.length + uncountedProducts.length

  return (
    <div>
      <PageHeader title={`Stock Count — ${new Date(stockCount.created_at).toLocaleDateString()}`} actions={<><Badge variant={STATUS_VARIANTS[stockCount.status]}>{stockCount.status.replace('_', ' ')}</Badge>
        {(isSubmitted && !isApproved) && (
          <Button onClick={handleApprove} disabled={approving} size="sm">
            {approving ? 'Approving...' : 'Approve'}
          </Button>
        )}
        {isInProgress && (
          <>
            <Button onClick={() => setMode(mode === 'review' ? 'count' : 'review')} variant="secondary" size="sm">
              {mode === 'review' ? 'Back to Count' : 'Summary'}
            </Button>
            <Button onClick={handleCancel} variant="danger" size="sm">Cancel</Button>
          </>
        )}
        <Link href="/admin/inventory/stock-counts"><Button variant="secondary" size="sm">Back</Button></Link></>} />

      <div className="text-sm text-gray-500 mb-4">
        Counted: {countItems.length} / {totalForCounting} products
      </div>

      {isApproved && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-4 mb-4 text-sm">
          This stock count has been approved. Adjustments have been applied to inventory.
        </div>
      )}

      {isInProgress && mode === 'count' && currentProduct && (
        <div className="max-w-lg mx-auto">
          <CountCard
            productName={currentProduct.name}
            productSku={currentProduct.sku}
            expectedQuantity={currentItem?.expected_quantity ?? null}
            initialQuantity={currentItem?.physical_quantity ?? 0}
            productIndex={currentIndex}
            totalProducts={totalForCounting}
            onSave={handleSave}
            onSkip={handleSkip}
            onNext={() => {
              handleSave(currentItem?.physical_quantity ?? 0).then(() => {
                setCurrentIndex(prev => Math.min(prev + 1, totalForCounting - 1))
              })
            }}
            onPrev={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
          />

          {(countItems.length > 0 || currentIndex >= totalForCounting - 1) && (
            <div className="mt-4 text-center">
              <button onClick={handleSubmit} className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium">
                Submit Count for Review
              </button>
            </div>
          )}
        </div>
      )}

      {(isSubmitted || mode === 'review') && (
        <VarianceTable
          items={countItems}
          onApprove={handleApprove}
          onBack={() => setMode('count')}
          approving={approving}
        />
      )}
    </div>
  )
}
