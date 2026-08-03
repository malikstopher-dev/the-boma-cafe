'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Button from '@/components/admin/design-system/Button'
import Badge from '@/components/admin/design-system/Badge'
import { SkeletonCard } from '@/components/admin/design-system/Skeleton'

type LinkData = {
  id: string
  inventory_product_id: string
  pour_size_ml: number
  inventory_products: { id: string; name: string; sku: string | null }
}

type BarItem = {
  id: string
  name: string
  is_available: boolean
  has_inventory: boolean
  category_id: string | null
  bar_categories: { name: string | null } | null
  bar_item_inventory_links: LinkData[]
}

type Product = {
  id: string
  name: string
  sku: string | null
}

type ProductConfig = {
  product_id: string
  bottle_size_ml: number
  pour_size_ml: number
  display_as: string
}

type AutoLinkResult = {
  linked: { bar_item_id: string; bar_item_name: string; product_name: string; pour_size_ml: number }[]
  unmatched: { bar_item_id: string; bar_item_name: string }[]
}

const inputStyle: React.CSSProperties = {
  background: '#2A261E',
  border: '1px solid #3A3428',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 14,
  color: '#F0EBE3',
  fontFamily: 'Inter, sans-serif',
  outline: 'none',
}

const panelStyle: React.CSSProperties = {
  background: '#1E1A14',
  border: '1px solid #3A3428',
  borderRadius: 12,
  overflow: 'hidden',
}

const panelHeaderStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderBottom: '1px solid #3A3428',
  fontSize: 13,
  fontWeight: 600,
  color: '#A09888',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  fontFamily: 'Inter, sans-serif',
}

const mutedStyle: React.CSSProperties = {
  fontSize: 14,
  color: '#6B6358',
  fontFamily: 'Inter, sans-serif',
}

export default function MenuItemsPage() {
  const [items, setItems] = useState<BarItem[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [configs, setConfigs] = useState<ProductConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  // Link modal state (single item)
  const [linkModal, setLinkModal] = useState<BarItem | null>(null)
  const [pourSize, setPourSize] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [isLinking, setIsLinking] = useState(false)

  // Batch modal state (whole category)
  const [batchModal, setBatchModal] = useState<{ categoryId: string; categoryName: string } | null>(null)
  const [batchPourSize, setBatchPourSize] = useState('')
  const [batchProductId, setBatchProductId] = useState('')
  const [batchProductSearch, setBatchProductSearch] = useState('')
  const [isBatchLinking, setIsBatchLinking] = useState(false)

  // Auto-link state
  const [isAutoLinking, setIsAutoLinking] = useState(false)
  const [autoResult, setAutoResult] = useState<AutoLinkResult | null>(null)
  const [autoError, setAutoError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/inventory/menu-items').then(r => r.json()),
      fetch('/api/inventory/products?page_size=500').then(r => r.json()),
      fetch('/api/inventory/menu-items/product-configs').then(r => r.json()),
    ]).then(([itemsJson, productsJson, configsJson]) => {
      setItems(itemsJson.data || [])
      setProducts(productsJson.data || [])
      setConfigs(configsJson.data || [])
    }).finally(() => setIsLoading(false))
  }, [])

  const refreshItems = useCallback(async () => {
    const json = await fetch('/api/inventory/menu-items').then(r => r.json())
    setItems(json.data || [])
  }, [])

  // ESC closes any modal
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setLinkModal(null)
        setBatchModal(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // When a product is selected in the single-link modal, inherit its configured pour size
  // (bar_product_config pour_size_ml) instead of asking the user to retype it.
  function handleSelectProduct(product: Product) {
    setSelectedProductId(product.id)
    const config = configs.find(c => c.product_id === product.id)
    if (config) {
      setPourSize(String(Number(config.pour_size_ml).toFixed(0)))
    }
  }

  function handleSelectBatchProduct(product: Product) {
    setBatchProductId(product.id)
    const config = configs.find(c => c.product_id === product.id)
    if (config) {
      setBatchPourSize(String(Number(config.pour_size_ml).toFixed(0)))
    }
  }

  async function handleLink() {
    if (!linkModal || !selectedProductId || !pourSize || isLinking) return
    setIsLinking(true)
    try {
      const res = await fetch(`/api/inventory/menu-items/${linkModal.id}/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventory_product_id: selectedProductId, pour_size_ml: Number(pourSize) }),
      })
      if (res.ok) {
        setLinkModal(null)
        setPourSize('')
        setSelectedProductId('')
        setProductSearch('')
        await refreshItems()
      } else {
        const err = await res.json()
        alert(err.error?.message || 'Link failed')
      }
    } finally {
      setIsLinking(false)
    }
  }

  async function handleBatchLink() {
    if (!batchModal || !batchProductId || !batchPourSize || isBatchLinking) return
    setIsBatchLinking(true)
    try {
      const res = await fetch('/api/inventory/menu-items/batch-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: batchModal.categoryId,
          inventory_product_id: batchProductId,
          pour_size_ml: Number(batchPourSize),
        }),
      })
      if (res.ok) {
        const json = await res.json()
        alert(`Linked ${json.data?.linked ?? 0} item(s) in "${batchModal.categoryName}"`)
        setBatchModal(null)
        setBatchPourSize('')
        setBatchProductId('')
        setBatchProductSearch('')
        await refreshItems()
      } else {
        const err = await res.json()
        alert(err.error?.message || 'Batch link failed')
      }
    } finally {
      setIsBatchLinking(false)
    }
  }

  async function handleUnlink(barItemId: string) {
    if (!confirm('Remove this link?')) return
    const res = await fetch(`/api/inventory/menu-items/${barItemId}/unlink`, { method: 'POST' })
    if (res.ok) {
      await refreshItems()
    }
  }

  async function handleAutoLink() {
    if (isAutoLinking) return
    setIsAutoLinking(true)
    setAutoResult(null)
    setAutoError(null)
    try {
      const res = await fetch('/api/inventory/menu-items/auto-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const json = await res.json()
      if (!res.ok) {
        setAutoError(json.error?.message || 'Auto-link failed')
      } else {
        setAutoResult(json.data as AutoLinkResult)
        await refreshItems()
      }
    } catch {
      setAutoError('Auto-link failed')
    } finally {
      setIsAutoLinking(false)
    }
  }

  const unlinked = useMemo(() => items.filter(i => !i.has_inventory), [items])
  const linked = useMemo(() => items.filter(i => i.has_inventory), [items])

  const filteredUnlinked = useMemo(() => {
    const q = search.toLowerCase()
    return unlinked.filter(i => !q || i.name.toLowerCase().includes(q))
  }, [unlinked, search])

  const filteredLinked = useMemo(() => {
    const q = search.toLowerCase()
    return linked.filter(i => !q || i.name.toLowerCase().includes(q))
  }, [linked, search])

  // Group unlinked items by their menu category (metadata already exists on the menu item —
  // we never re-ask for it).
  const grouped = useMemo(() => {
    const map = new Map<string, BarItem[]>()
    for (const item of filteredUnlinked) {
      const key = item.bar_categories?.name || 'Uncategorized'
      const list = map.get(key) || []
      list.push(item)
      map.set(key, list)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [filteredUnlinked])

  function toggleCategory(name: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase()
    const list = products.filter(p => !q || p.name.toLowerCase().includes(q))
    return list.slice(0, 30)
  }, [products, productSearch])

  const filteredBatchProducts = useMemo(() => {
    const q = batchProductSearch.toLowerCase()
    const list = products.filter(p => !q || p.name.toLowerCase().includes(q))
    return list.slice(0, 30)
  }, [products, batchProductSearch])

  if (isLoading) return <AdminPage title="Menu Integration"><SkeletonCard /></AdminPage>

  const linkedCount = linked.length
  const unlinkedCount = unlinked.length

  return (
    <AdminPage
      title="Menu Integration"
      description="Link bar menu items to inventory products"
      actions={
        <>
          <Badge variant="success">{linkedCount} linked</Badge>
          <Badge variant="default">{unlinkedCount} unlinked</Badge>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          style={{ ...inputStyle, flex: 1, maxWidth: 320 }}
          placeholder="Search menu items..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <Button
          onClick={handleAutoLink}
          loading={isAutoLinking}
          disabled={unlinkedCount === 0}
          title="Match unlinked items to inventory products by name"
        >
          ⚡ Auto-Link Exact Matches
        </Button>
      </div>

      {autoResult && (
        <div style={{ background: 'rgba(200,160,78,0.08)', border: '1px solid #C8A04E', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontFamily: 'Inter, sans-serif' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#F0EBE3' }}>
            ✓ {autoResult.linked.length} item(s) auto-linked
          </div>
          {autoResult.unmatched.length > 0 && (
            <div style={{ fontSize: 13, color: '#A09888', marginTop: 4 }}>
              Could not match: {autoResult.unmatched.slice(0, 8).map(u => u.bar_item_name).join(', ')}
              {autoResult.unmatched.length > 8 ? ` +${autoResult.unmatched.length - 8} more` : ''}
            </div>
          )}
        </div>
      )}
      {autoError && (
        <div style={{ background: 'rgba(232,84,84,0.1)', border: '1px solid #E85454', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 14, color: '#E85454', fontFamily: 'Inter, sans-serif' }}>
          {autoError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 24 }}>
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>Unlinked Items ({unlinkedCount})</div>
          {filteredUnlinked.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', ...mutedStyle }}>All items are linked</div>
          ) : (
            <div>
              {grouped.map(([categoryName, categoryItems]) => (
                <div key={categoryName} style={{ borderBottom: '1px solid #3A3428' }}>
                  <div
                    onClick={() => toggleCategory(categoryName)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
                      background: '#242018', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    <span style={{ fontSize: 12, color: '#6B6358', width: 12 }}>{collapsed.has(categoryName) ? '▶' : '▼'}</span>
                    <span style={{ fontWeight: 600, fontSize: 13, color: '#F0EBE3', flex: 1 }}>{categoryName}</span>
                    <Badge variant="info">{categoryItems.length}</Badge>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={e => {
                        e.stopPropagation()
                        setBatchModal({ categoryId: categoryItems[0].category_id || '', categoryName })
                      }}
                      title={`Link all ${categoryItems.length} item(s) in ${categoryName} to one product`}
                    >
                      Link All
                    </Button>
                  </div>
                  {!collapsed.has(categoryName) && (
                    <div>
                      {categoryItems.map(item => (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #3A3428', fontFamily: 'Inter, sans-serif' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 500, fontSize: 14, color: '#F0EBE3' }}>{item.name}</span>
                            {!item.is_available && <Badge variant="warning">Unavailable</Badge>}
                          </div>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setLinkModal(item)
                              setProductSearch('')
                              setSelectedProductId('')
                              setPourSize('')
                            }}
                          >
                            Link to Product
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={panelStyle}>
          <div style={panelHeaderStyle}>Linked Items ({linkedCount})</div>
          {filteredLinked.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', ...mutedStyle }}>No linked items</div>
          ) : (
            <div>
              {filteredLinked.map(item => (
                <div key={item.id} style={{ padding: '12px 16px', borderBottom: '1px solid #3A3428', fontFamily: 'Inter, sans-serif' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 500, fontSize: 14, color: '#F0EBE3' }}>{item.name}</span>
                    <Button variant="danger" size="sm" onClick={() => handleUnlink(item.id)}>Unlink</Button>
                  </div>
                  {item.bar_item_inventory_links?.map(link => (
                    <div key={link.id} style={{ marginTop: 4, fontSize: 12, color: '#6B6358' }}>
                      → {link.inventory_products?.name || link.inventory_product_id} ({Number(link.pour_size_ml).toFixed(0)}ml pour)
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Single-item link modal — centered overlay, scrollable content so it never opens "below" the viewport */}
      {linkModal && (
        <div
          className="fixed inset-0 z-50"
          style={{ background: 'rgba(0,0,0,0.65)', overflowY: 'auto' }}
          onClick={() => setLinkModal(null)}
        >
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              style={{
                background: '#1E1A14', border: '1px solid #3A3428', borderRadius: 12, padding: 24,
                maxWidth: 448, width: '100%', fontFamily: 'Inter, sans-serif',
                boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
              }}
              onClick={e => e.stopPropagation()}
            >
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#F0EBE3', marginBottom: 4 }}>Link Product</h3>
              <p style={{ fontSize: 13, color: '#A09888', marginBottom: 4 }}>{linkModal.name}</p>
              <p style={{ fontSize: 12, color: '#6B6358', marginBottom: 16 }}>
                Menu category: <span style={{ color: '#C8A04E' }}>{linkModal.bar_categories?.name || 'Uncategorized'}</span>
              </p>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#A09888', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Search Product</label>
                <input
                  style={{ ...inputStyle, width: '100%' }}
                  placeholder="Type to search..."
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: 12, maxHeight: 180, overflowY: 'auto', border: '1px solid #3A3428', borderRadius: 8 }}>
                {filteredProducts.length === 0 ? (
                  <div style={{ padding: 12, fontSize: 14, color: '#A09888', fontFamily: 'Inter, sans-serif' }}>No products found</div>
                ) : (
                  filteredProducts.map(p => {
                    const config = configs.find(c => c.product_id === p.id)
                    return (
                      <div
                        key={p.id}
                        style={{
                          padding: '8px 12px', fontSize: 14, cursor: 'pointer',
                          fontWeight: selectedProductId === p.id ? 500 : 400,
                          color: selectedProductId === p.id ? '#C8A04E' : '#F0EBE3',
                          background: selectedProductId === p.id ? '#2A261E' : 'transparent',
                          fontFamily: 'Inter, sans-serif',
                        }}
                        onClick={() => handleSelectProduct(p)}
                      >
                        {p.name} {p.sku ? `(${p.sku})` : ''}
                        {config && <span style={{ fontSize: 11, color: '#6B6358', marginLeft: 6 }}>pour {Number(config.pour_size_ml).toFixed(0)}ml</span>}
                      </div>
                    )
                  })
                )}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#A09888', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pour Size (ml)</label>
                <input
                  style={{ ...inputStyle, width: '100%' }}
                  type="number"
                  min="1"
                  placeholder="e.g. 30"
                  value={pourSize}
                  onChange={e => setPourSize(e.target.value)}
                />
                {!pourSize && selectedProductId && (
                  <div style={{ fontSize: 11, color: '#6B6358', marginTop: 4 }}>Auto-filled from product config when available</div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Button variant="secondary" onClick={() => setLinkModal(null)}>Cancel</Button>
                <Button onClick={handleLink} disabled={!selectedProductId || !pourSize || isLinking} loading={isLinking}>Link</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch-link category modal */}
      {batchModal && (
        <div
          className="fixed inset-0 z-50"
          style={{ background: 'rgba(0,0,0,0.65)', overflowY: 'auto' }}
          onClick={() => setBatchModal(null)}
        >
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              style={{
                background: '#1E1A14', border: '1px solid #3A3428', borderRadius: 12, padding: 24,
                maxWidth: 448, width: '100%', fontFamily: 'Inter, sans-serif',
                boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
              }}
              onClick={e => e.stopPropagation()}
            >
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#F0EBE3', marginBottom: 4 }}>Batch Link Category</h3>
              <p style={{ fontSize: 13, color: '#A09888', marginBottom: 16 }}>
                Link all unlinked items in <span style={{ color: '#C8A04E' }}>{batchModal.categoryName}</span> to one product
              </p>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#A09888', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Search Product</label>
                <input
                  style={{ ...inputStyle, width: '100%' }}
                  placeholder="Type to search..."
                  value={batchProductSearch}
                  onChange={e => setBatchProductSearch(e.target.value)}
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: 12, maxHeight: 180, overflowY: 'auto', border: '1px solid #3A3428', borderRadius: 8 }}>
                {filteredBatchProducts.length === 0 ? (
                  <div style={{ padding: 12, fontSize: 14, color: '#A09888', fontFamily: 'Inter, sans-serif' }}>No products found</div>
                ) : (
                  filteredBatchProducts.map(p => {
                    const config = configs.find(c => c.product_id === p.id)
                    return (
                      <div
                        key={p.id}
                        style={{
                          padding: '8px 12px', fontSize: 14, cursor: 'pointer',
                          fontWeight: batchProductId === p.id ? 500 : 400,
                          color: batchProductId === p.id ? '#C8A04E' : '#F0EBE3',
                          background: batchProductId === p.id ? '#2A261E' : 'transparent',
                          fontFamily: 'Inter, sans-serif',
                        }}
                        onClick={() => handleSelectBatchProduct(p)}
                      >
                        {p.name} {p.sku ? `(${p.sku})` : ''}
                        {config && <span style={{ fontSize: 11, color: '#6B6358', marginLeft: 6 }}>pour {Number(config.pour_size_ml).toFixed(0)}ml</span>}
                      </div>
                    )
                  })
                )}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#A09888', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pour Size (ml)</label>
                <input
                  style={{ ...inputStyle, width: '100%' }}
                  type="number"
                  min="1"
                  placeholder="e.g. 30"
                  value={batchPourSize}
                  onChange={e => setBatchPourSize(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Button variant="secondary" onClick={() => setBatchModal(null)}>Cancel</Button>
                <Button onClick={handleBatchLink} disabled={!batchProductId || !batchPourSize || isBatchLinking} loading={isBatchLinking}>Link All</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminPage>
  )
}
