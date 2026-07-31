'use client'

import { useState, useEffect } from 'react'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Badge from '@/components/admin/design-system/Badge'

interface StockCount {
  id: string
  location_id: string
  status: string
  performed_by: string | null
  created_at: string
  notes: string | null
}

interface VarianceRow {
  productId: string
  productName: string
  expectedQuantity: number
  physicalQuantity: number
  variance: number
  variancePct: number
}

const statusBadge: Record<string, { variant: 'success' | 'warning' | 'info' | 'danger'; label: string }> = {
  approved: { variant: 'success', label: 'Approved' },
  submitted: { variant: 'warning', label: 'Submitted' },
  in_progress: { variant: 'info', label: 'In Progress' },
  cancelled: { variant: 'danger', label: 'Cancelled' },
}

export default function VarianceReportPage() {
  const [stockCounts, setStockCounts] = useState<StockCount[]>([])
  const [selectedCount, setSelectedCount] = useState<string | null>(null)
  const [varianceData, setVarianceData] = useState<VarianceRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadingVariance, setLoadingVariance] = useState(false)
  const [sortField, setSortField] = useState<'variancePct' | 'variance' | 'productName'>('variancePct')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    fetch('/api/inventory/stock-counts?limit=20')
      .then(r => r.json())
      .then(json => {
        setStockCounts(json.data ?? [])
        if (json.data?.length > 0) {
          setSelectedCount(json.data[0].id)
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedCount) return
    setLoadingVariance(true)
    fetch(`/api/inventory/reports/variance?stock_count_id=${selectedCount}`)
      .then(r => r.json())
      .then(json => setVarianceData(json.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingVariance(false))
  }, [selectedCount])

  function handleSort(field: typeof sortField) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const sorted = [...varianceData].sort((a, b) => {
    const mul = sortDir === 'asc' ? 1 : -1
    if (sortField === 'productName') return mul * a.productName.localeCompare(b.productName)
    return mul * (a[sortField] - b[sortField])
  })

  const totalVariance = varianceData.reduce((s, r) => s + Math.abs(r.variance), 0)
  const significantVariance = varianceData.filter(r => Math.abs(r.variancePct) > 5).length

  return (
    <AdminPage
      title="Variance Report"
      subtitle="Compare expected vs actual stock from stock counts"
      actions={
        <select
          value={selectedCount ?? ''}
          onChange={e => setSelectedCount(e.target.value || null)}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white"
        >
          {stockCounts.map(sc => (
            <option key={sc.id} value={sc.id}>
              {new Date(sc.created_at).toLocaleDateString('en-ZA')} — {sc.status}
            </option>
          ))}
        </select>
      }
    >
      <div className="p-6">
        {isLoading ? (
          <div className="text-gray-400">Loading stock counts...</div>
        ) : stockCounts.length === 0 ? (
          <div className="text-gray-500 text-center py-12">No stock counts found. Complete a stock count first.</div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
                <p className="text-sm text-gray-400">Total Variance</p>
                <p className="text-2xl font-bold text-yellow-400 mt-1">{totalVariance.toFixed(2)}</p>
              </div>
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
                <p className="text-sm text-gray-400">Items Counted</p>
                <p className="text-2xl font-bold text-white mt-1">{varianceData.length}</p>
              </div>
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
                <p className="text-sm text-gray-400">Significant Variances (&gt;5%)</p>
                <p className={`text-2xl font-bold mt-1 ${significantVariance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {significantVariance}
                </p>
              </div>
            </div>

            {loadingVariance ? (
              <div className="text-gray-400 py-8 text-center">Loading variance data...</div>
            ) : sorted.length === 0 ? (
              <div className="text-gray-500 text-center py-8">No variance data for this stock count</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-700">
                      <th className="text-left py-2 px-3 cursor-pointer hover:text-white" onClick={() => handleSort('productName')}>
                        Product {sortField === 'productName' && (sortDir === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="text-right py-2 px-3">Expected</th>
                      <th className="text-right py-2 px-3">Physical</th>
                      <th className="text-right py-2 px-3 cursor-pointer hover:text-white" onClick={() => handleSort('variance')}>
                        Variance {sortField === 'variance' && (sortDir === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="text-right py-2 px-3 cursor-pointer hover:text-white" onClick={() => handleSort('variancePct')}>
                        % {sortField === 'variancePct' && (sortDir === 'asc' ? '↑' : '↓')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map(row => (
                      <tr key={row.productId} className="border-b border-gray-800 hover:bg-gray-800/30">
                        <td className="py-2 px-3 text-white">{row.productName}</td>
                        <td className="py-2 px-3 text-right text-gray-300">{row.expectedQuantity.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right text-gray-300">{row.physicalQuantity.toFixed(2)}</td>
                        <td className={`py-2 px-3 text-right ${row.variance === 0 ? 'text-green-400' : Math.abs(row.variancePct) > 5 ? 'text-red-400' : 'text-yellow-400'}`}>
                          {row.variance > 0 ? '+' : ''}{row.variance.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <Badge variant={Math.abs(row.variancePct) > 5 ? 'danger' : row.variance === 0 ? 'success' : 'warning'}>
                            {row.variancePct >= 0 ? '+' : ''}{row.variancePct.toFixed(1)}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </AdminPage>
  )
}
