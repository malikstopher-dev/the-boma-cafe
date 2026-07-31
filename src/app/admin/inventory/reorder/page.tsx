'use client'

import { useState, useEffect } from 'react'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Badge from '@/components/admin/design-system/Badge'

interface ReorderSuggestion {
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
  critical: { color: 'text-red-400', bg: 'bg-red-900/30 border-red-800/50', label: 'Critical' },
  high: { color: 'text-orange-400', bg: 'bg-orange-900/30 border-orange-800/50', label: 'High' },
  medium: { color: 'text-yellow-400', bg: 'bg-yellow-900/30 border-yellow-800/50', label: 'Medium' },
  low: { color: 'text-green-400', bg: 'bg-green-900/30 border-green-800/50', label: 'Low' },
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
      subtitle="Products that need restocking based on usage and par levels"
      actions={
        <button onClick={fetchSuggestions} className="text-sm text-brand-400 hover:text-brand-300">
          Refresh
        </button>
      }
    >
      <div className="p-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
            <p className="text-sm text-gray-400">Suggestions</p>
            <p className="text-2xl font-bold text-white mt-1">{suggestions.length}</p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
            <p className="text-sm text-gray-400">Critical</p>
            <p className="text-2xl font-bold text-red-400 mt-1">{criticalCount}</p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
            <p className="text-sm text-gray-400">High Priority</p>
            <p className="text-2xl font-bold text-orange-400 mt-1">{highCount}</p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
            <p className="text-sm text-gray-400">Inventory Type</p>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="mt-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
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
          <div className="text-gray-400 py-12 text-center">Calculating suggestions...</div>
        ) : filtered.length === 0 ? (
          <div className="text-gray-500 py-12 text-center">
            {suggestions.length === 0 ? 'No reorder suggestions — stock levels are healthy.' : 'No suggestions match the selected filters.'}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(s => {
              const urg = urgencyConfig[s.urgency]
              return (
                <div key={s.productId} className={`rounded-lg border p-4 ${urg.bg}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold">{s.productName}</span>
                        <Badge variant={s.urgency === 'critical' ? 'danger' : s.urgency === 'high' ? 'warning' : 'info'}>
                          {urg.label}
                        </Badge>
                        <span className="text-xs text-gray-500">{s.inventoryType}</span>
                      </div>
                      <div className="mt-2 grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Current Stock</span>
                          <p className="text-white font-medium">{s.currentStock.toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Min Level</span>
                          <p className="text-white font-medium">{s.minLevel.toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Daily Usage</span>
                          <p className="text-white font-medium">{s.dailyUsage.toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Suggest Order</span>
                          <p className="text-brand-400 font-bold text-lg">{s.suggestedQuantity}</p>
                        </div>
                      </div>
                      <div className="mt-2 flex gap-4 text-xs text-gray-500">
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
