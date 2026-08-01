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
      fetch('/api/inventory/products?page_size=500').then(r => r.json()),
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

      <div style={{display:'flex',gap:8,marginBottom:16}}>
        <input
          style={{background:'#2A261E',border:'1px solid #3A3428',borderRadius:8,padding:'8px 12px',fontSize:14,color:'#F0EBE3',flex:1,maxWidth:320,fontFamily:'Inter, sans-serif',outline:'none'}}
          placeholder="Search menu items..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2" style={{gap:24}}>
        <div style={{background:'#1E1A14',border:'1px solid #3A3428',borderRadius:12,overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid #3A3428',fontSize:13,fontWeight:600,color:'#A09888',textTransform:'uppercase',letterSpacing:'0.05em',fontFamily:'Inter, sans-serif'}}>Unlinked Items ({unlinkedCount})</div>
          {items.filter(i => !i.has_inventory).filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
            <div style={{padding:24,textAlign:'center',fontSize:14,color:'#6B6358',fontFamily:'Inter, sans-serif'}}>All items are linked</div>
          ) : (
            <div>
              {items.filter(i => !i.has_inventory).filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase())).map(item => (
                <div key={item.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',borderBottom:'1px solid #3A3428',fontFamily:'Inter, sans-serif'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontWeight:500,fontSize:14,color:'#F0EBE3'}}>{item.name}</span>
                    {!item.is_available && <Badge variant="warning" className="ml-2">Unavailable</Badge>}
                  </div>
                  <button
                    onClick={() => { setLinkModal({ barItemId: item.id, barItemName: item.name }); setProductModalOpen(true) }}
                    style={{background:'#C8A04E',color:'#1A1610',fontWeight:600,borderRadius:8,padding:'6px 14px',fontSize:13,border:'none',cursor:'pointer',fontFamily:'Inter, sans-serif'}}
                  >
                    Link to Product
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{background:'#1E1A14',border:'1px solid #3A3428',borderRadius:12,overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid #3A3428',fontSize:13,fontWeight:600,color:'#A09888',textTransform:'uppercase',letterSpacing:'0.05em',fontFamily:'Inter, sans-serif'}}>Linked Items ({linkedCount})</div>
          {items.filter(i => i.has_inventory).filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
            <div style={{padding:24,textAlign:'center',fontSize:14,color:'#6B6358',fontFamily:'Inter, sans-serif'}}>No linked items</div>
          ) : (
            <div>
              {items.filter(i => i.has_inventory).filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase())).map(item => (
                <div key={item.id} style={{padding:'12px 16px',borderBottom:'1px solid #3A3428',fontFamily:'Inter, sans-serif'}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <span style={{fontWeight:500,fontSize:14,color:'#F0EBE3'}}>{item.name}</span>
                    <Button variant="danger" size="sm" onClick={() => handleUnlink(item.id)}>Unlink</Button>
                  </div>
                  {item.bar_item_inventory_links?.map(link => (
                    <div key={link.id} style={{marginTop:4,fontSize:12,color:'#6B6358'}}>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'rgba(0,0,0,0.6)'}} onClick={() => { setProductModalOpen(false); setLinkModal(null) }}>
          <div style={{background:'#1E1A14',border:'1px solid #3A3428',borderRadius:12,padding:24,maxWidth:448,width:'100%',margin:'0 16px',fontFamily:'Inter, sans-serif'}} onClick={e => e.stopPropagation()}>
            <h3 style={{fontSize:16,fontWeight:600,color:'#F0EBE3',marginBottom:4}}>Link Product</h3>
            <p style={{fontSize:13,color:'#A09888',marginBottom:16}}>{linkModal.barItemName}</p>

            <div style={{marginBottom:12}}>
              <label style={{fontSize:13,fontWeight:600,color:'#A09888',display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.05em'}}>Search Product</label>
              <input
                style={{background:'#2A261E',border:'1px solid #3A3428',borderRadius:8,padding:'8px 12px',fontSize:14,color:'#F0EBE3',width:'100%',fontFamily:'Inter, sans-serif',outline:'none'}}
                placeholder="Type to search..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                autoFocus
              />
            </div>

            <div style={{marginBottom:12,maxHeight:160,overflowY:'auto',border:'1px solid #3A3428',borderRadius:8}}>
              {filteredProducts.length === 0 ? (
                <div style={{padding:12,fontSize:14,color:'#A09888',fontFamily:'Inter, sans-serif'}}>No products found</div>
              ) : (
                filteredProducts.slice(0, 20).map(p => (
                  <div
                    key={p.id}
                    style={{padding:'8px 12px',fontSize:14,cursor:'pointer',fontWeight:selectedProductId === p.id ? 500 : 400,color:selectedProductId === p.id ? '#C8A04E' : '#F0EBE3',background:selectedProductId === p.id ? '#2A261E' : 'transparent',fontFamily:'Inter, sans-serif'}}
                    onClick={() => setSelectedProductId(p.id)}
                  >
                    {p.name} {p.sku ? `(${p.sku})` : ''}
                  </div>
                ))
              )}
            </div>

            <div style={{marginBottom:16}}>
              <label style={{fontSize:13,fontWeight:600,color:'#A09888',display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.05em'}}>Pour Size (ml)</label>
              <input
                style={{background:'#2A261E',border:'1px solid #3A3428',borderRadius:8,padding:'8px 12px',fontSize:14,color:'#F0EBE3',width:'100%',fontFamily:'Inter, sans-serif',outline:'none'}}
                type="number"
                min="1"
                placeholder="e.g. 30"
                value={pourSize}
                onChange={e => setPourSize(e.target.value)}
              />
            </div>

            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
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
