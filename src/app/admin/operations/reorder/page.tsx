'use client'

import { useState, useEffect } from 'react'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Badge from '@/components/admin/design-system/Badge'

type ReorderSuggestion = {
  productId: string
  productName: string
  sku: string | null
  inventoryType: string
  currentStock: number
  minLevel: number
  maxLevel: number | null
  parLevel: number | null
  leadTimeDays: number
  dailyUsage: number
  suggestedQuantity: number
  urgency: 'critical' | 'high' | 'medium' | 'low'
  preferredSupplierId: string | null
  preferredSupplierName: string | null
  estimatedDaysUntilStockout: number | null
}

const urgencyConfig = {
  critical: { color: '#EF4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', label: 'Critical' },
  high: { color: '#F97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.25)', label: 'High' },
  medium: { color: '#EAB308', bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.25)', label: 'Medium' },
  low: { color: '#22C55E', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)', label: 'Low' },
}

export default function ReorderPage() {
  const [suggestions, setSuggestions] = useState<ReorderSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [urgencyFilter, setUrgencyFilter] = useState<string>('')

  useEffect(() => {
    fetchSuggestions()
  }, [])

  async function fetchSuggestions() {
    setIsLoading(true)
    try {
      const res = await fetch('/api/inventory/reorder/suggestions?location_id=main')
      const json = await res.json()
      setSuggestions(json.data ?? [])
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }

  const filtered = suggestions.filter(s => {
    if (typeFilter && s.inventoryType !== typeFilter) return false
    if (urgencyFilter && s.urgency !== urgencyFilter) return false
    return true
  })

  const criticalCount = suggestions.filter(s => s.urgency === 'critical').length
  const highCount = suggestions.filter(s => s.urgency === 'high').length

  return (
    <AdminPage
      title="Reorder Suggestions"
      description="Products that need restocking based on usage and par levels"
      actions={
        <button onClick={fetchSuggestions} style={{ fontSize: 13, color: '#C8A04E', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
          Refresh
        </button>
      }
    >
      <div style={{ padding: 24, fontFamily: "'Inter', sans-serif" }}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div style={{ background: '#1E1A14', border: '1px solid #3A3428', borderRadius: 12, padding: 16 }}>
            <p style={{ fontSize: 13, color: '#A09888', margin: 0 }}>Suggestions</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: '#F0EBE3', marginTop: 4 }}>{suggestions.length}</p>
          </div>
          <div style={{ background: '#1E1A14', border: '1px solid #3A3428', borderRadius: 12, padding: 16 }}>
            <p style={{ fontSize: 13, color: '#A09888', margin: 0 }}>Critical</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: '#EF4444', marginTop: 4 }}>{criticalCount}</p>
          </div>
          <div style={{ background: '#1E1A14', border: '1px solid #3A3428', borderRadius: 12, padding: 16 }}>
            <p style={{ fontSize: 13, color: '#A09888', margin: 0 }}>High Priority</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: '#F97316', marginTop: 4 }}>{highCount}</p>
          </div>
          <div style={{ background: '#1E1A14', border: '1px solid #3A3428', borderRadius: 12, padding: 16 }}>
            <p style={{ fontSize: 13, color: '#A09888', margin: 0 }}>Inventory Type</p>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              style={{ marginTop: 6, background: '#2A261E', border: '1px solid #3A3428', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#F0EBE3', width: '100%', outline: 'none' }}
            >
              <option value="">All</option>
              <option value="FOOD">Food</option>
              <option value="BEVERAGE">Beverage</option>
              <option value="CLEANING">Cleaning</option>
              <option value="PACKAGING">Packaging</option>
              <option value="GENERAL">General</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div style={{ color: '#6B6358', padding: '48px 0', textAlign: 'center' }}>Calculating suggestions...</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: '#6B6358', padding: '48px 0', textAlign: 'center' }}>
            {suggestions.length === 0 ? 'No reorder suggestions — stock levels are healthy.' : 'No suggestions match the selected filters.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(s => {
              const urg = urgencyConfig[s.urgency]
              return (
                <div
                  key={s.productId}
                  style={{
                    background: '#1E1A14',
                    border: '1px solid #3A3428',
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#F0EBE3', fontWeight: 600, fontSize: 15 }}>{s.productName}</span>
                        <Badge variant={s.urgency === 'critical' ? 'danger' : s.urgency === 'high' ? 'warning' : 'info'}>
                          {urg.label}
                        </Badge>
                        <span style={{ fontSize: 11, color: '#6B6358' }}>{s.inventoryType}</span>
                      </div>
                      <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, fontSize: 13 }}>
                        <div>
                          <span style={{ color: '#6B6358', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Current Stock</span>
                          <p style={{ color: '#F0EBE3', fontWeight: 500, marginTop: 2 }}>{s.currentStock.toFixed(2)}</p>
                        </div>
                        <div>
                          <span style={{ color: '#6B6358', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Min Level</span>
                          <p style={{ color: '#F0EBE3', fontWeight: 500, marginTop: 2 }}>{s.minLevel.toFixed(2)}</p>
                        </div>
                        <div>
                          <span style={{ color: '#6B6358', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Daily Usage</span>
                          <p style={{ color: '#F0EBE3', fontWeight: 500, marginTop: 2 }}>{s.dailyUsage.toFixed(2)}</p>
                        </div>
                        <div>
                          <span style={{ color: '#6B6358', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Suggest Order</span>
                          <p style={{ color: '#C8A04E', fontWeight: 700, fontSize: 18, marginTop: 2 }}>{s.suggestedQuantity}</p>
                        </div>
                      </div>
                      <div style={{ marginTop: 10, display: 'flex', gap: 16, fontSize: 12, color: '#6B6358' }}>
                        <span>Lead time: {s.leadTimeDays}d</span>
                        {s.estimatedDaysUntilStockout !== null && (
                          <span>Est. stockout: {s.estimatedDaysUntilStockout.toFixed(1)}d</span>
                        )}
                        {s.preferredSupplierName && (
                          <span>Supplier: {s.preferredSupplierName}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AdminPage>
  )
}
