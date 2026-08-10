'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import AdminPage from '@/components/admin/design-system/AdminPage'
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
  const [submitting, setSubmitting] = useState(false)
  const [scanValue, setScanValue] = useState('')
  const [scanMessage, setScanMessage] = useState<string | null>(null)

  useEffect(() => {
    const id = params?.id as string
    if (!id) return

    let cancelled = false

    async function fetchAllProducts() {
      const all: any[] = []
      let cursor: string | null = null
      do {
        const url = `/api/inventory/products?page_size=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`
        const json = await (await fetch(url)).json()
        const page = json.data ?? []
        all.push(...page)
        cursor = json.meta?.hasMore ? (json.meta?.cursor ?? null) : null
      } while (cursor)
      return all
    }

    Promise.all([
      fetch(`/api/inventory/stock-counts/${id}`).then(r => r.json()),
      fetchAllProducts(),
    ])
      .then(([scJson, prodJson]) => {
        if (cancelled) return
        if (scJson.error) setError(scJson.error.message)
        else setData(scJson.data)
        setProducts(prodJson)
      })
      .catch(() => setError('Failed to load'))
      .finally(() => { if (!cancelled) setIsLoading(false) })

    return () => { cancelled = true }
  }, [params?.id])

  const stockCount = data?.stockCount
  const countItems = data?.items || []

  const countedProductIds = new Set(countItems.map((i: any) => i.product_id))
  const uncountedProducts = products.filter((p: any) => !countedProductIds.has(p.id))

  if (isLoading) return <AdminPage title="Stock Count"><SkeletonCard /></AdminPage>
  if (error || !data || !stockCount) return <AdminPage title="Stock Count"><div className="text-red-500">{error || 'Not found'}</div></AdminPage>

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
    if (submitting) return
    const id = params?.id as string
    setSubmitting(true)
    try {
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
    } finally {
      setSubmitting(false)
    }
  }

  async function handleApprove() {
    const id = params?.id as string
    setApproving(true)
    try {
      const res = await fetch(`/api/inventory/stock-counts/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
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
      router.push('/admin/operations/stock-counts')
    } else {
      const err = await res.json().catch(() => null)
      alert(err?.error?.message || 'Cancel failed')
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

  function handleScan() {
    const code = scanValue.trim()
    if (!code) return
    const product = products.find((p: any) => p.barcode && p.barcode === code)
    if (!product) {
      setScanMessage(`No product with barcode ${code}`)
      setScanValue('')
      return
    }
    const countedIdx = countItems.findIndex((i: any) => i.product_id === product.id)
    let targetIndex = -1
    if (countedIdx >= 0) {
      targetIndex = countedIdx
    } else {
      const uncountedIdx = uncountedProducts.findIndex((p: any) => p.id === product.id)
      if (uncountedIdx >= 0) targetIndex = countItems.length + uncountedIdx
    }
    if (targetIndex >= 0) {
      setCurrentIndex(targetIndex)
      setScanMessage(`Jumped to ${product.name}`)
    } else {
      setScanMessage(`Product ${product.name} is not part of this count`)
    }
    setScanValue('')
  }

  return (
    <AdminPage title={`Stock Count — ${new Date(stockCount.created_at).toLocaleDateString()}`} actions={<><Badge variant={STATUS_VARIANTS[stockCount.status]}>{stockCount.status.replace('_', ' ')}</Badge>
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
      <Link href="/admin/operations/stock-counts"><Button variant="secondary" size="sm">Back</Button></Link></>}>

      <div style={{fontSize:14,color:'#A09888',marginBottom:16,fontFamily:'Inter, sans-serif'}}>
        Counted: {countItems.length} / {totalForCounting} products
      </div>

      {isInProgress && mode === 'count' && (
        <div className="max-w-lg mx-auto mb-4">
          <div style={{display:'flex',alignItems:'center',gap:8,background:'#1E1A14',border:'1px solid #3A3428',borderRadius:8,padding:12}}>
            <span style={{color:'#6B6358'}}>🔍</span>
            <input
              style={{flex:1,fontSize:14,outline:'none',fontFamily:'monospace',background:'transparent',border:'none',color:'#F0EBE3'}}
              placeholder="Scan barcode to jump to product…"
              value={scanValue}
              onChange={e => { setScanValue(e.target.value); setScanMessage(null) }}
              onKeyDown={e => { if (e.key === 'Enter') handleScan() }}
              autoComplete="off"
            />
            <button onClick={handleScan} style={{padding:'4px 12px',fontSize:12,borderRadius:4,background:'#C8A04E',color:'#1A1610',border:'none',cursor:'pointer',fontWeight:600}}>Go</button>
          </div>
          {scanMessage && <p style={{fontSize:12,color:'#A09888',marginTop:4,textAlign:'center',fontFamily:'Inter, sans-serif'}}>{scanMessage}</p>}
        </div>
      )}

      {isApproved && (
        <div style={{background:'rgba(76,175,80,0.1)',border:'1px solid rgba(76,175,80,0.3)',color:'#4CAF50',borderRadius:8,padding:16,marginBottom:16,fontSize:14,fontFamily:'Inter, sans-serif'}}>
          This stock count has been approved. Adjustments have been applied to inventory.
        </div>
      )}

      {isInProgress && mode === 'count' && totalForCounting === 0 && (
        <div style={{maxWidth:'lg',margin:'0 auto',background:'#1E1A14',borderRadius:8,border:'1px solid #3A3428',padding:24,textAlign:'center'}}>
          <p style={{fontSize:14,color:'#A09888',fontWeight:500,marginBottom:4,fontFamily:'Inter, sans-serif'}}>Nothing to count</p>
          <p style={{fontSize:12,color:'#6B6358',fontFamily:'Inter, sans-serif'}}>No uncounted products found at this location. Cancel this count to start over.</p>
        </div>
      )}

      {isInProgress && mode === 'count' && currentProduct && (
        <div className="max-w-lg mx-auto">
          <CountCard
            key={currentProduct.id}
            productName={currentProduct.name}
            productSku={currentProduct.sku}
            productBarcode={currentProduct.barcode ?? null}
            expectedQuantity={currentItem?.expected_quantity ?? null}
            initialQuantity={currentItem?.physical_quantity ?? 0}
            productIndex={currentIndex}
            totalProducts={totalForCounting}
            onSave={handleSave}
            onSkip={handleSkip}
            onNext={() => setCurrentIndex(prev => Math.min(prev + 1, totalForCounting - 1))}
            onPrev={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
          />

          {(countItems.length > 0 || currentIndex >= totalForCounting - 1) && (
            <div className="mt-4 text-center">
              <button onClick={handleSubmit} disabled={submitting} style={{padding:'12px 24px',background:'#4CAF50',color:'white',borderRadius:8,border:'none',fontSize:14,fontWeight:500,cursor:'pointer',fontFamily:'Inter, sans-serif',opacity:submitting?0.5:1}}>
                {submitting ? 'Submitting...' : 'Submit Count for Review'}
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
    </AdminPage>
  )
}