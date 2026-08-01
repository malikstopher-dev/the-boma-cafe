'use client'

import { useState, useEffect } from 'react'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Button from '@/components/admin/design-system/Button'
import Badge from '@/components/admin/design-system/Badge'

type Product = {
  id: string
  name: string
  inventory_type: string
  balance?: number
}

type WasteEvent = {
  id: string
  product_id: string
  transaction_type: string
  quantity: number
  reason_type: string | null
  reason_notes: string | null
  cost_centre_id: string | null
  performed_by: string | null
  created_at: string
  inventory_products?: { name: string; sku: string | null } | null
}

type WasteSummaryRow = {
  transaction_type: string
  count: number
  total_quantity: number
  estimated_value: number
}

type CostCentreOption = {
  id: string
  name: string
  is_active: boolean
}

const WASTE_TYPES: Array<{ value: string; label: string }> = [
  { value: 'waste', label: 'Waste' },
  { value: 'breakage', label: 'Breakage' },
  { value: 'spillage', label: 'Spillage' },
  { value: 'comp', label: 'Comp' },
  { value: 'expiry_loss', label: 'Expired' },
  { value: 'theft', label: 'Theft' },
  { value: 'donation', label: 'Donation' },
]

const REASONS = [
  'BREAKAGE', 'WASTE', 'SPILLAGE', 'EXPIRED', 'THEFT', 'DONATION', 'COMP', 'STAFF_MEAL', 'PROMOTION',
]

const REASON_BY_TYPE: Record<string, string> = {
  waste: 'WASTE',
  breakage: 'BREAKAGE',
  spillage: 'SPILLAGE',
  comp: 'COMP',
  expiry_loss: 'EXPIRED',
  theft: 'THEFT',
  donation: 'DONATION',
}

function formatValue(v: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(v)
}

export default function WastePage() {
  const [events, setEvents] = useState<WasteEvent[]>([])
  const [summary, setSummary] = useState<WasteSummaryRow[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [selProduct, setSelProduct] = useState('')
  const [type, setType] = useState('waste')
  const [reason, setReason] = useState('WASTE')
  const [qty, setQty] = useState('')
  const [notes, setNotes] = useState('')
  const [costCentres, setCostCentres] = useState<CostCentreOption[]>([])
  const [selCostCentre, setSelCostCentre] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    fetch('/api/inventory/products?page_size=100&show_archived=false')
      .then(r => r.json())
      .then(json => setProducts(json.data ?? []))
      .catch(() => {})
    fetch('/api/inventory/cost-centres')
      .then(r => r.json())
      .then(json => setCostCentres(json.data ?? []))
      .catch(() => {})
  }, [])

  async function load() {
    try {
      const [eventsRes, summaryRes] = await Promise.all([
        fetch('/api/inventory/waste?limit=100'),
        fetch('/api/inventory/waste/summary'),
      ])
      const eventsJson = await eventsRes.json()
      const summaryJson = await summaryRes.json()
      setEvents(eventsJson.data ?? [])
      setSummary(summaryJson.data ?? [])
    } catch {
      // ignore
    }
  }

  const filteredProducts = productSearch
    ? products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
    : products

  async function submit() {
    if (!selProduct || !qty || parseFloat(qty) <= 0) {
      setError('Select a product and enter a quantity')
      return
    }
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/inventory/waste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selProduct,
          location_id: 'main',
          transaction_type: type,
          quantity: parseFloat(qty),
          reason_type: reason,
          reason_notes: notes || null,
          cost_centre_id: selCostCentre || null,
        }),
      })
      const json = await res.json()
      if (json.error) {
        setError(json.error.message)
      } else {
        setSuccess('Waste recorded')
        setQty('')
        setNotes('')
        setSelProduct('')
        await load()
      }
    } catch {
      setError('Failed to record waste')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AdminPage
      title="Waste & Breakage"
      description="Single-tap registration of stock loss — each entry writes to the ledger"
    >
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div style={{background:'#1E1A14',border:'1px solid #3A3428',borderRadius:12,padding:16}}>
              <h3 style={{fontWeight:600,color:'#F0EBE3',marginBottom:12,fontFamily:'Inter, sans-serif'}}>Record Waste</h3>
              {error && <div style={{marginBottom:12,fontSize:14,color:'#E85454',fontFamily:'Inter, sans-serif'}}>{error}</div>}
              {success && <div style={{marginBottom:12,fontSize:14,color:'#4CAF50',fontFamily:'Inter, sans-serif'}}>{success}</div>}
              <div className="space-y-3">
                <div>
                  <label style={{display:'block',fontSize:12,color:'#A09888',marginBottom:4,fontFamily:'Inter, sans-serif'}}>Product</label>
                  <input
                    value={productSearch}
                    onChange={e => { setProductSearch(e.target.value); setSelProduct('') }}
                    placeholder="Search product..."
                    style={{width:'100%',background:'#2A261E',border:'1px solid #3A3428',borderRadius:6,padding:'6px 12px',fontSize:14,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}
                  />
                  <select
                    value={selProduct}
                    onChange={e => setSelProduct(e.target.value)}
                    style={{marginTop:8,width:'100%',background:'#2A261E',border:'1px solid #3A3428',borderRadius:6,padding:'6px 12px',fontSize:14,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}
                  >
                    <option value="">Select...</option>
                    {filteredProducts.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.inventory_type})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label style={{display:'block',fontSize:12,color:'#A09888',marginBottom:4,fontFamily:'Inter, sans-serif'}}>Type</label>
                    <select
                      value={type}
                      onChange={e => { setType(e.target.value); setReason(REASON_BY_TYPE[e.target.value] ?? 'WASTE') }}
                      style={{width:'100%',background:'#2A261E',border:'1px solid #3A3428',borderRadius:6,padding:'6px 12px',fontSize:14,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}
                    >
                      {WASTE_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:12,color:'#A09888',marginBottom:4,fontFamily:'Inter, sans-serif'}}>Quantity</label>
                    <input
                      type="number"
                      value={qty}
                      onChange={e => setQty(e.target.value)}
                      style={{width:'100%',background:'#2A261E',border:'1px solid #3A3428',borderRadius:6,padding:'6px 12px',fontSize:14,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}
                    />
                  </div>
                </div>
                <div>
                  <label style={{display:'block',fontSize:12,color:'#A09888',marginBottom:4,fontFamily:'Inter, sans-serif'}}>Reason</label>
                  <select
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    style={{width:'100%',background:'#2A261E',border:'1px solid #3A3428',borderRadius:6,padding:'6px 12px',fontSize:14,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}
                  >
                    {REASONS.map(r => (
                      <option key={r} value={r}>{r.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{display:'block',fontSize:12,color:'#A09888',marginBottom:4,fontFamily:'Inter, sans-serif'}}>Cost Centre</label>
                  <select
                    value={selCostCentre}
                    onChange={e => setSelCostCentre(e.target.value)}
                    style={{width:'100%',background:'#2A261E',border:'1px solid #3A3428',borderRadius:6,padding:'6px 12px',fontSize:14,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}
                  >
                    <option value="">Default</option>
                    {costCentres.map(cc => (
                      <option key={cc.id} value={cc.id}>{cc.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{display:'block',fontSize:12,color:'#A09888',marginBottom:4,fontFamily:'Inter, sans-serif'}}>Notes</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={2}
                    style={{width:'100%',background:'#2A261E',border:'1px solid #3A3428',borderRadius:6,padding:'6px 12px',fontSize:14,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}
                  />
                </div>
                <Button onClick={submit} disabled={busy} className="w-full">
                  {busy ? 'Recording...' : 'Record Waste'}
                </Button>
              </div>
            </div>

            <div style={{background:'#1E1A14',border:'1px solid #3A3428',borderRadius:12,padding:16}}>
              <h3 style={{fontWeight:600,color:'#F0EBE3',marginBottom:12,fontFamily:'Inter, sans-serif'}}>Summary (30 days)</h3>
              {summary.length === 0 ? (
                <p style={{color:'#A09888',fontSize:14,fontFamily:'Inter, sans-serif'}}>No waste recorded</p>
              ) : (
                <div className="space-y-2">
                  {summary.map(row => (
                    <div key={row.transaction_type} className="flex items-center justify-between text-sm">
                      <span style={{color:'#F0EBE3',textTransform:'capitalize',fontFamily:'Inter, sans-serif'}}>{row.transaction_type.replace('_', ' ')}</span>
                      <span style={{color:'#A09888'}}>
                        {row.count}× · {row.total_quantity} · <span style={{color:'#F0EBE3'}}>{formatValue(row.estimated_value)}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            <h3 className="font-semibold text-white mb-3">Recent Waste Events</h3>
            {events.length === 0 ? (
              <p style={{color:'#A09888',padding:'48px 0',textAlign:'center',fontFamily:'Inter, sans-serif'}}>No waste events recorded</p>
            ) : (
              <div className="space-y-2">
                {events.map(ev => (
                  <div key={ev.id} className="flex items-center gap-3 p-3 rounded-lg" style={{background:'#242018',border:'1px solid #3A3428'}}>
                    <Badge variant="danger">{ev.transaction_type.replace('_', ' ')}</Badge>
                    <span className="text-white font-medium flex-1">
                      {ev.inventory_products?.name ?? 'Unknown product'}
                    </span>
                    <span style={{color:'#E85454'}}>-{Math.abs(ev.quantity)}</span>
                    {ev.reason_type && <span style={{fontSize:12,color:'#A09888',fontFamily:'Inter, sans-serif'}}>{ev.reason_type.replace('_', ' ')}</span>}
                    {ev.reason_notes && <span style={{fontSize:12,color:'#A09888',fontStyle:'italic',fontFamily:'Inter, sans-serif'}}>"{ev.reason_notes}"</span>}
                    <span style={{fontSize:12,color:'#6B6358',fontFamily:'Inter, sans-serif'}}>
                      {new Date(ev.created_at).toLocaleString('en-ZA')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminPage>
  )
}
