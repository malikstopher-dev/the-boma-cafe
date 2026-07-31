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

  useEffect(() => {
    Promise.all([
      fetch('/api/inventory/suppliers?page_size=100').then(r => r.json()),
      fetch('/api/inventory/products?page_size=100').then(r => r.json()),
      fetch('/api/inventory/locations?page_size=50').then(r => r.json()),
    ]).then(([supJson, prodJson, locJson]) => {
      setSuppliers((supJson.data || []).map((s: any) => ({ id: s.id, name: s.name })))
      setProducts((prodJson.data || []).map((p: any) => ({ id: p.id, name: p.name, sku: p.sku })))
      setLocations((locJson.data || []).map((l: any) => ({ id: l.id, name: l.name })))
      if (locJson.data?.length > 0) setItems([{ product_id: '', location_id: locJson.data[0].id, quantity_ordered: 1, unit_cost: null }])
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
        <div className="bg-white rounded-lg border p-4 mb-4">
          <h3 className="font-semibold mb-3">Order Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Supplier *</label>
              <select className="border rounded px-3 py-2 text-sm w-full" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
                <option value="">Select...</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Quotation Reference</label>
              <input className="border rounded px-3 py-2 text-sm w-full" placeholder="e.g. SUP-2026-0715" value={quotationRef} onChange={e => setQuotationRef(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Expected Delivery</label>
              <input className="border rounded px-3 py-2 text-sm w-full" type="date" value={expectedAt} onChange={e => setExpectedAt(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Notes</label>
              <input className="border rounded px-3 py-2 text-sm w-full" placeholder="Internal notes" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Line Items</h3>
            <Button onClick={addItem} variant="secondary" size="sm">+ Add Item</Button>
          </div>

          {items.map((item, i) => (
            <div key={i} className="flex gap-2 items-end mb-2 p-2 border rounded">
              <div className="flex-1">
                <label className="text-xs text-gray-500 block mb-1">Product</label>
                <select className="border rounded px-3 py-2 text-sm w-full" value={item.product_id} onChange={e => updateItem(i, 'product_id', e.target.value)}>
                  <option value="">Select...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ''}</option>)}
                </select>
              </div>
              <div className="w-24">
                <label className="text-xs text-gray-500 block mb-1">Location</label>
                <select className="border rounded px-3 py-2 text-sm w-full" value={item.location_id} onChange={e => updateItem(i, 'location_id', e.target.value)}>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div className="w-20">
                <label className="text-xs text-gray-500 block mb-1">Qty</label>
                <input className="border rounded px-3 py-2 text-sm w-full" type="number" min="0.01" step="0.01" value={item.quantity_ordered} onChange={e => updateItem(i, 'quantity_ordered', parseFloat(e.target.value) || 0)} />
              </div>
              <div className="w-24">
                <label className="text-xs text-gray-500 block mb-1">Unit Cost</label>
                <input className="border rounded px-3 py-2 text-sm w-full" type="number" min="0" step="0.01" placeholder="R" value={item.unit_cost ?? ''} onChange={e => updateItem(i, 'unit_cost', e.target.value ? parseFloat(e.target.value) : null)} />
              </div>
              {items.length > 1 && (
                <button onClick={() => removeItem(i)} className="text-red-500 text-sm px-2 py-2">✕</button>
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
