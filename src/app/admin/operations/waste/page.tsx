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
    fetch('/api/inventory/products?limit=200&archived=false')
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
    : products.slice(0, 50)

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
            <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-3">Record Waste</h3>
              {error && <div className="mb-3 text-sm text-red-400">{error}</div>}
              {success && <div className="mb-3 text-sm text-green-400">{success}</div>}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Product</label>
                  <input
                    value={productSearch}
                    onChange={e => { setProductSearch(e.target.value); setSelProduct('') }}
                    placeholder="Search product..."
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
                  />
                  <select
                    value={selProduct}
                    onChange={e => setSelProduct(e.target.value)}
                    className="mt-2 w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
                  >
                    <option value="">Select...</option>
                    {filteredProducts.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.inventory_type})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Type</label>
                    <select
                      value={type}
                      onChange={e => { setType(e.target.value); setReason(e.target.value.toUpperCase()) }}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
                    >
                      {WASTE_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Quantity</label>
                    <input
                      type="number"
                      value={qty}
                      onChange={e => setQty(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Reason</label>
                  <select
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
                  >
                    {REASONS.map(r => (
                      <option key={r} value={r}>{r.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Cost Centre</label>
                  <select
                    value={selCostCentre}
                    onChange={e => setSelCostCentre(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
                  >
                    <option value="">Default</option>
                    {costCentres.map(cc => (
                      <option key={cc.id} value={cc.id}>{cc.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Notes</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={2}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
                  />
                </div>
                <Button onClick={submit} disabled={busy} className="w-full">
                  {busy ? 'Recording...' : 'Record Waste'}
                </Button>
              </div>
            </div>

            <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-3">Summary (30 days)</h3>
              {summary.length === 0 ? (
                <p className="text-gray-500 text-sm">No waste recorded</p>
              ) : (
                <div className="space-y-2">
                  {summary.map(row => (
                    <div key={row.transaction_type} className="flex items-center justify-between text-sm">
                      <span className="text-gray-300 capitalize">{row.transaction_type.replace('_', ' ')}</span>
                      <span className="text-gray-400">
                        {row.count}× · {row.total_quantity} · <span className="text-white">{formatValue(row.estimated_value)}</span>
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
              <p className="text-gray-500 py-12 text-center">No waste events recorded</p>
            ) : (
              <div className="space-y-2">
                {events.map(ev => (
                  <div key={ev.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
                    <Badge variant="danger">{ev.transaction_type.replace('_', ' ')}</Badge>
                    <span className="text-white font-medium flex-1">
                      {ev.inventory_products?.name ?? 'Unknown product'}
                    </span>
                    <span className="text-red-400">-{Math.abs(ev.quantity)}</span>
                    {ev.reason_type && <span className="text-xs text-gray-400">{ev.reason_type.replace('_', ' ')}</span>}
                    {ev.reason_notes && <span className="text-xs text-gray-500 italic">"{ev.reason_notes}"</span>}
                    <span className="text-xs text-gray-500">
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
