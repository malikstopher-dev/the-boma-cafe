'use client'

import { useState, useEffect, useCallback } from 'react'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Badge from '@/components/admin/design-system/Badge'

type PriceEntry = {
  id: string
  product_id: string
  supplier_id: string | null
  unit_cost: number
  quantity: number | null
  transaction_id: string | null
  effective_date: string
  notes: string | null
  recorded_by: string | null
  created_at: string
}

type Product = {
  id: string
  name: string
  supplier_name?: string
}

export default function PriceHistoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [priceHistory, setPriceHistory] = useState<PriceEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    fetch('/api/inventory/products?limit=500')
      .then(r => r.json())
      .then(json => setProducts(json.data ?? []))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const fetchHistory = useCallback(async () => {
    if (!selectedProduct) return
    setLoadingHistory(true)
    try {
      const res = await fetch(`/api/inventory/price-history?product_id=${selectedProduct}&limit=50`)
      const json = await res.json()
      setPriceHistory(json.data ?? [])
    } catch {
      // ignore
    } finally {
      setLoadingHistory(false)
    }
  }, [selectedProduct])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const selectedName = products.find(p => p.id === selectedProduct)?.name ?? ''

  const priceChanges = priceHistory.slice(1).filter((e, i) =>
    i < priceHistory.length - 1 && e.unit_cost !== priceHistory[i + 1].unit_cost
  ).length

  return (
    <AdminPage title="Price History" description="Track product cost changes over time">
      <div className="p-6">
        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-2">Select Product</label>
          <select
            value={selectedProduct}
            onChange={e => setSelectedProduct(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white w-full max-w-md"
          >
            <option value="">Choose a product...</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {selectedProduct && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-400">Current Price</p>
              <p className="text-2xl font-bold text-white mt-1">
                {priceHistory.length > 0 ? `R${priceHistory[0].unit_cost.toFixed(2)}` : '—'}
              </p>
            </div>
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-400">Price History Entries</p>
              <p className="text-2xl font-bold text-white mt-1">{priceHistory.length}</p>
            </div>
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-400">Price Changes</p>
              <p className="text-2xl font-bold text-yellow-400 mt-1">{priceChanges}</p>
            </div>
          </div>
        )}

        {loadingHistory ? (
          <div className="text-gray-400 py-8 text-center">Loading price history...</div>
        ) : selectedProduct && priceHistory.length === 0 ? (
          <div className="text-gray-500 py-8 text-center">No price history recorded for {selectedName}</div>
        ) : selectedProduct && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="text-left py-2 px-3">Date</th>
                  <th className="text-right py-2 px-3">Unit Cost</th>
                  <th className="text-right py-2 px-3">Quantity</th>
                  <th className="text-left py-2 px-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {priceHistory.map((entry, i) => {
                  const prevCost = i < priceHistory.length - 1 ? priceHistory[i + 1].unit_cost : null
                  const change = prevCost !== null ? entry.unit_cost - prevCost : null
                  return (
                    <tr key={entry.id} className="border-b border-gray-800 hover:bg-gray-800/30">
                      <td className="py-2 px-3 text-gray-300">
                        {new Date(entry.effective_date).toLocaleDateString('en-ZA')}
                      </td>
                      <td className="py-2 px-3 text-right text-white font-medium">
                        R{entry.unit_cost.toFixed(2)}
                        {change !== null && change !== 0 && (
                          <span className={`ml-2 text-xs ${change > 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {change > 0 ? '+' : ''}{change.toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right text-gray-300">
                        {entry.quantity?.toFixed(2) ?? '—'}
                      </td>
                      <td className="py-2 px-3 text-gray-500 text-xs">{entry.notes ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminPage>
  )
}
