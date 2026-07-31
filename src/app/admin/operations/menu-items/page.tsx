'use client'

import { useState, useEffect } from 'react'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Button from '@/components/admin/design-system/Button'
import Badge from '@/components/admin/design-system/Badge'
import { SkeletonCard } from '@/components/admin/design-system/Skeleton'
import EmptyState from '@/components/admin/design-system/EmptyState'

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
  bar_item_inventory_links: LinkData[]
}

type Product = {
  id: string
  name: string
  sku: string | null
}

export default function MenuItemsPage() {
  const [items, setItems] = useState<BarItem[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [linkModal, setLinkModal] = useState<{ barItemId: string; barItemName: string } | null>(null)
  const [pourSize, setPourSize] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [productModalOpen, setProductModalOpen] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/inventory/menu-items').then(r => r.json()),
      fetch('/api/inventory/products?page_size=200').then(r => r.json()),
    ]).then(([itemsJson, productsJson]) => {
      setItems(itemsJson.data || [])
      setProducts(productsJson.data || [])
    }).finally(() => setIsLoading(false))
  }, [])

  async function handleLink() {
    if (!linkModal || !selectedProductId || !pourSize) return
    const res = await fetch(`/api/inventory/menu-items/${linkModal.barItemId}/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inventory_product_id: selectedProductId, pour_size_ml: Number(pourSize) }),
    })
    if (res.ok) {
      setLinkModal(null)
      setPourSize('')
      setSelectedProductId('')
      setProductModalOpen(false)
      const json = await fetch('/api/inventory/menu-items').then(r => r.json())
      setItems(json.data || [])
    } else {
      const err = await res.json()
      alert(err.error?.message || 'Link failed')
    }
  }

  async function handleUnlink(barItemId: string) {
    if (!confirm('Remove this link?')) return
    const res = await fetch(`/api/inventory/menu-items/${barItemId}/unlink`, { method: 'POST' })
    if (res.ok) {
      const json = await fetch('/api/inventory/menu-items').then(r => r.json())
      setItems(json.data || [])
    }
  }

  const filteredProducts = products.filter(p =>
    !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase())
  )

  if (isLoading) return <AdminPage title="Menu Integration"><SkeletonCard /></AdminPage>

  const linkedCount = items.filter(i => i.has_inventory).length
  const unlinkedCount = items.length - linkedCount

  return (
    <div>
      <AdminPage title="Menu Integration" description="Link bar menu items to inventory products" actions={<><Badge variant="success">{linkedCount} linked</Badge><Badge variant="default">{unlinkedCount} unlinked</Badge></>}>

      <div className="flex gap-2 mb-4">
        <input className="border rounded px-3 py-2 text-sm flex-1 max-w-xs" placeholder="Search menu items..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border">
          <div className="px-4 py-3 border-b font-semibold text-sm text-gray-500">Unlinked Items ({unlinkedCount})</div>
          {items.filter(i => !i.has_inventory).filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">All items are linked</div>
          ) : (
            <div className="divide-y">
              {items.filter(i => !i.has_inventory).filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase())).map(item => (
                <div key={item.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <span className="font-medium text-sm">{item.name}</span>
                    {!item.is_available && <Badge variant="warning" className="ml-2">Unavailable</Badge>}
                  </div>
                  <Button size="sm" onClick={() => { setLinkModal({ barItemId: item.id, barItemName: item.name }); setProductModalOpen(true) }}>Link to Product</Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border">
          <div className="px-4 py-3 border-b font-semibold text-sm text-gray-500">Linked Items ({linkedCount})</div>
          {items.filter(i => i.has_inventory).filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">No linked items</div>
          ) : (
            <div className="divide-y">
              {items.filter(i => i.has_inventory).filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase())).map(item => (
                <div key={item.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{item.name}</span>
                    <Button variant="danger" size="sm" onClick={() => handleUnlink(item.id)}>Unlink</Button>
                  </div>
                  {item.bar_item_inventory_links?.map(link => (
                    <div key={link.id} className="mt-1 text-xs text-gray-500">
                      → {link.inventory_products?.name || link.inventory_product_id} ({Number(link.pour_size_ml).toFixed(0)}ml pour)
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {linkModal && productModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => { setProductModalOpen(false); setLinkModal(null) }}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold mb-1">Link Product</h3>
            <p className="text-sm text-gray-500 mb-4">{linkModal.barItemName}</p>

            <div className="mb-3">
              <label className="text-xs font-medium text-gray-600 block mb-1">Search Product</label>
              <input className="border rounded px-3 py-2 text-sm w-full" placeholder="Type to search..." value={productSearch} onChange={e => setProductSearch(e.target.value)} autoFocus />
            </div>

            <div className="mb-3 max-h-40 overflow-y-auto border rounded">
              {filteredProducts.length === 0 ? (
                <div className="p-3 text-sm text-gray-400">No products found</div>
              ) : (
                filteredProducts.slice(0, 20).map(p => (
                  <div key={p.id} className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 ${selectedProductId === p.id ? 'bg-emerald-50 text-emerald-700 font-medium' : ''}`} onClick={() => setSelectedProductId(p.id)}>
                    {p.name} {p.sku ? `(${p.sku})` : ''}
                  </div>
                ))
              )}
            </div>

            <div className="mb-4">
              <label className="text-xs font-medium text-gray-600 block mb-1">Pour Size (ml)</label>
              <input className="border rounded px-3 py-2 text-sm w-full" type="number" min="1" placeholder="e.g. 30" value={pourSize} onChange={e => setPourSize(e.target.value)} />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => { setProductModalOpen(false); setLinkModal(null) }}>Cancel</Button>
              <Button onClick={handleLink} disabled={!selectedProductId || !pourSize}>Link</Button>
            </div>
          </div>
        </div>
      )}
    </AdminPage>
    </div>
  )
}
