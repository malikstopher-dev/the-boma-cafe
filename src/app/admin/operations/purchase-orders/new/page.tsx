'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Button from '@/components/admin/design-system/Button'
import { SkeletonCard } from '@/components/admin/design-system/Skeleton'

type LineItem = {
  product_id: string
  location_id: string
  quantity_ordered: number
  unit_cost: number | null
}

export default function NewPurchaseOrderPage() {
  const router = useRouter()
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])
  const [products, setProducts] = useState<{ id: string; name: string; sku: string | null }[]>([])
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [supplierId, setSupplierId] = useState('')
  const [quotationRef, setQuotationRef] = useState('')
  const [expectedAt, setExpectedAt] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<LineItem[]>([{ product_id: '', location_id: '', quantity_ordered: 1, unit_cost: null }])
  const [repeatInfo, setRepeatInfo] = useState<{ supplierName: string; createdAt: string | null; itemCount: number } | null>(null)
  const [repeatError, setRepeatError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/inventory/suppliers?page_size=100').then(r => r.json()),
      fetch('/api/inventory/products?page_size=100').then(r => r.json()),
      fetch('/api/inventory/locations?page_size=50').then(r => r.json()),
    ]).then(([supJson, prodJson, locJson]) => {
      setSuppliers((supJson.data || []).map((s: any) => ({ id: s.id, name: s.name })))
      setProducts((prodJson.data || []).map((p: any) => ({ id: p.id, name: p.name, sku: p.sku })))
      setLocations((locJson.data || []).map((l: any) => ({ id: l.id, name: l.name })))
      const firstLoc = locJson.data?.[0]?.id ?? ''
      if (firstLoc) setItems([{ product_id: '', location_id: firstLoc, quantity_ordered: 1, unit_cost: null }])

      const from = new URLSearchParams(window.location.search).get('from')
      if (!from) return

      fetch(`/api/inventory/purchase-orders/${from}`)
        .then(r => r.json())
        .then(json => {
          const src = json.data
          if (!src || !src.supplier_id || !Array.isArray(src.inventory_purchase_order_items)) {
            setRepeatError('Could not load the source purchase order — starting a blank order.')
            return
          }
          const srcItems = src.inventory_purchase_order_items
            .filter((i: any) => i.product_id)
            .map((i: any) => ({
              product_id: i.product_id,
              location_id: i.location_id ?? firstLoc,
              quantity_ordered: Number(i.quantity_ordered) || 1,
              unit_cost: i.unit_cost !== null && i.unit_cost !== undefined ? Number(i.unit_cost) : null,
            }))
          setSupplierId(src.supplier_id)
          if (srcItems.length > 0) setItems(srcItems)
          setRepeatInfo({
            supplierName: src.inventory_suppliers?.name ?? String(src.supplier_id).slice(0, 8),
            createdAt: src.created_at ?? null,
            itemCount: srcItems.length,
          })
        })
        .catch(() => setRepeatError('Could not load the source purchase order — starting a blank order.'))
    }).catch(() => {
      // fetch failure — leave empty dropdowns
    }).finally(() => setIsLoading(false))
  }, [])

  function addItem() {
    setItems(prev => [...prev, { product_id: '', location_id: locations[0]?.id ?? '', quantity_ordered: 1, unit_cost: null }])
  }

  function updateItem(index: number, field: string, value: any) {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  function removeItem(index: number) {
    if (items.length <= 1) return
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  function productName(id: string) {
    return products.find(p => p.id === id)?.name || id.slice(0, 8)
  }

  async function handleSubmit() {
    if (!supplierId || items.some(i => !i.product_id || !i.quantity_ordered)) return
    setSaving(true)

    try {
      const res = await fetch('/api/inventory/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_id: supplierId,
          quotation_ref: quotationRef || null,
          expected_at: expectedAt || null,
          notes: notes || null,
          items: items.map(i => ({
            product_id: i.product_id,
            location_id: i.location_id,
            quantity_ordered: Number(i.quantity_ordered),
            unit_cost: i.unit_cost ? Number(i.unit_cost) : null,
          })),
        }),
      })

      if (res.ok) {
        const json = await res.json()
        router.push(`/admin/operations/purchase-orders/${json.data.id}`)
      } else {
        const err = await res.json()
        alert(err.error?.message || 'Failed to create PO')
      }
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) return <AdminPage title="New Purchase Order"><SkeletonCard /></AdminPage>

  return (
    <AdminPage title="New Purchase Order" description="Create a new order to send to a supplier" actions={<Link href="/admin/operations/purchase-orders"><Button variant="secondary" size="sm">Back</Button></Link>}>

      <div className="max-w-3xl">
        {repeatInfo && (
          <div style={{ background: 'rgba(200,160,78,0.12)', border: '1px solid rgba(200,160,78,0.4)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#E8C87A', fontFamily: 'Inter, sans-serif' }}>
            Repeating the order from {repeatInfo.supplierName}
            {repeatInfo.createdAt ? ` (${new Date(repeatInfo.createdAt).toLocaleDateString()})` : ''} — {repeatInfo.itemCount} item(s) prefilled. Adjust quantities, then create a new order.
          </div>
        )}
        {repeatError && (
          <div style={{ background: 'rgba(232,84,84,0.12)', border: '1px solid rgba(232,84,84,0.4)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#E85454', fontFamily: 'Inter, sans-serif' }}>
            {repeatError}
          </div>
        )}
        <div style={{background:'#1E1A14',borderRadius:8,border:'1px solid #3A3428',padding:16,marginBottom:16}}>
          <h3 style={{fontWeight:600,marginBottom:12,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}>Order Details</h3>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12}}>
            <div>
              <label style={{fontSize:12,fontWeight:500,color:'#A09888',display:'block',marginBottom:4,fontFamily:'Inter, sans-serif'}}>Supplier *</label>
              <select style={{background:'#2A261E',border:'1px solid #3A3428',borderRadius:6,padding:'6px 12px',fontSize:14,width:'100%',color:'#F0EBE3',fontFamily:'Inter, sans-serif'}} value={supplierId} onChange={e => setSupplierId(e.target.value)}>
                <option value="">Select...</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:12,fontWeight:500,color:'#A09888',display:'block',marginBottom:4,fontFamily:'Inter, sans-serif'}}>Quotation Reference</label>
              <input style={{background:'#2A261E',border:'1px solid #3A3428',borderRadius:6,padding:'6px 12px',fontSize:14,width:'100%',color:'#F0EBE3',fontFamily:'Inter, sans-serif'}} placeholder="e.g. SUP-2026-0715" value={quotationRef} onChange={e => setQuotationRef(e.target.value)} />
            </div>
            <div>
              <label style={{fontSize:12,fontWeight:500,color:'#A09888',display:'block',marginBottom:4,fontFamily:'Inter, sans-serif'}}>Expected Delivery</label>
              <input style={{background:'#2A261E',border:'1px solid #3A3428',borderRadius:6,padding:'6px 12px',fontSize:14,width:'100%',color:'#F0EBE3',fontFamily:'Inter, sans-serif'}} type="date" value={expectedAt} onChange={e => setExpectedAt(e.target.value)} />
            </div>
            <div>
              <label style={{fontSize:12,fontWeight:500,color:'#A09888',display:'block',marginBottom:4,fontFamily:'Inter, sans-serif'}}>Notes</label>
              <input style={{background:'#2A261E',border:'1px solid #3A3428',borderRadius:6,padding:'6px 12px',fontSize:14,width:'100%',color:'#F0EBE3',fontFamily:'Inter, sans-serif'}} placeholder="Internal notes" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>
        </div>

        <div style={{background:'#1E1A14',borderRadius:8,border:'1px solid #3A3428',padding:16,marginBottom:16}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <h3 style={{fontWeight:600,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}>Line Items</h3>
            <Button onClick={addItem} variant="secondary" size="sm">+ Add Item</Button>
          </div>

          {items.map((item, i) => (
            <div key={i} className="flex gap-2 items-end mb-2 p-2" style={{border:'1px solid #3A3428',borderRadius:6}}>
              <div className="flex-1">
                <label style={{fontSize:12,color:'#A09888',display:'block',marginBottom:4,fontFamily:'Inter, sans-serif'}}>Product</label>
                <select style={{background:'#2A261E',border:'1px solid #3A3428',borderRadius:6,padding:'6px 12px',fontSize:14,width:'100%',color:'#F0EBE3',fontFamily:'Inter, sans-serif'}} value={item.product_id} onChange={e => updateItem(i, 'product_id', e.target.value)}>
                  <option value="">Select...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ''}</option>)}
                </select>
              </div>
              <div className="w-24">
                <label style={{fontSize:12,color:'#A09888',display:'block',marginBottom:4,fontFamily:'Inter, sans-serif'}}>Location</label>
                <select style={{background:'#2A261E',border:'1px solid #3A3428',borderRadius:6,padding:'6px 12px',fontSize:14,width:'100%',color:'#F0EBE3',fontFamily:'Inter, sans-serif'}} value={item.location_id} onChange={e => updateItem(i, 'location_id', e.target.value)}>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div className="w-20">
                <label style={{fontSize:12,color:'#A09888',display:'block',marginBottom:4,fontFamily:'Inter, sans-serif'}}>Qty</label>
                <input style={{background:'#2A261E',border:'1px solid #3A3428',borderRadius:6,padding:'6px 12px',fontSize:14,width:'100%',color:'#F0EBE3',fontFamily:'Inter, sans-serif'}} type="number" min="0.01" step="0.01" value={item.quantity_ordered} onChange={e => updateItem(i, 'quantity_ordered', parseFloat(e.target.value) || 0)} />
              </div>
              <div className="w-24">
                <label style={{fontSize:12,color:'#A09888',display:'block',marginBottom:4,fontFamily:'Inter, sans-serif'}}>Unit Cost</label>
                <input style={{background:'#2A261E',border:'1px solid #3A3428',borderRadius:6,padding:'6px 12px',fontSize:14,width:'100%',color:'#F0EBE3',fontFamily:'Inter, sans-serif'}} type="number" min="0" step="0.01" placeholder="R" value={item.unit_cost ?? ''} onChange={e => updateItem(i, 'unit_cost', e.target.value ? parseFloat(e.target.value) : null)} />
              </div>
              {items.length > 1 && (
                <button onClick={() => removeItem(i)} style={{color:'#E85454',fontSize:14,padding:'8px',background:'none',border:'none',cursor:'pointer'}}>✕</button>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSubmit} disabled={saving || !supplierId || items.some(i => !i.product_id)} size="lg">
            {saving ? 'Creating...' : 'Create Purchase Order'}
          </Button>
          <Link href="/admin/operations/purchase-orders"><Button variant="secondary">Cancel</Button></Link>
        </div>
      </div>
    </AdminPage>
  )
}
