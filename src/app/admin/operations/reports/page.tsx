'use client'

import { useState, useEffect } from 'react'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Button from '@/components/admin/design-system/Button'
import { SkeletonCard } from '@/components/admin/design-system/Skeleton'

type ReportTab = {
  id: string
  label: string
  params: string[]
}

const REPORT_TABS: ReportTab[] = [
  { id: 'daily', label: 'What did we use?', params: ['date', 'location_id'] },
  { id: 'variance', label: 'What doesn\'t balance?', params: ['stock_count_id'] },
  { id: 'waste', label: 'Where are we losing stock?', params: ['from', 'to', 'location_id'] },
  { id: 'fast-movers', label: 'What sells fastest?', params: ['days', 'limit', 'location_id'] },
  { id: 'slow-movers', label: 'What isn\'t moving?', params: ['days', 'limit', 'location_id'] },
  { id: 'valuation', label: 'What is my stock worth?', params: ['location_id'] },
]

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('daily')
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([])
  const [stockCounts, setStockCounts] = useState<{ id: string; created_at: string }[]>([])
  const [data, setData] = useState<any[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [filters, setFilters] = useState<Record<string, string>>({})

  const tab = REPORT_TABS.find(t => t.id === activeTab)

  useEffect(() => {
    Promise.all([
      fetch('/api/inventory/locations?page_size=50').then(r => r.json()),
      fetch('/api/inventory/stock-counts').then(r => r.json()),
    ]).then(([locs, scs]) => {
      setLocations((locs.data || []).map((l: any) => ({ id: l.id, name: l.name })))
      setStockCounts((scs.data || []) as { id: string; created_at: string }[])
    })
  }, [])

  async function runReport() {
    if (!tab) return
    setIsLoading(true)
    setData(null)

    const params = new URLSearchParams()
    for (const key of tab.params) {
      if (filters[key]) params.set(key, filters[key])
    }

    try {
      const res = await fetch(`/api/inventory/reports/${tab.id}?${params}`)
      const json = await res.json()
      setData(json.data || [])
    } catch {
      setData([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'daily') {
      setFilters(f => ({ ...f, date: f.date || new Date().toISOString().slice(0, 10) }))
    }
    if (activeTab === 'fast-movers') {
      setFilters(f => ({ ...f, days: f.days || '7', limit: f.limit || '10' }))
    }
    if (activeTab === 'slow-movers') {
      setFilters(f => ({ ...f, days: f.days || '30', limit: f.limit || '10' }))
    }
  }, [activeTab])

  function formatCurrency(v: number) {
    return `R${v.toFixed(2)}`
  }

  function renderTable() {
    if (!data) return null
    if (data.length === 0) return <p className="text-sm text-gray-400 py-8 text-center">No data for this report</p>

    if (activeTab === 'daily') {
      return (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left p-2">Product</th>
              <th className="text-right p-2">Opening</th>
              <th className="text-right p-2">Purchases</th>
              <th className="text-right p-2">Sales</th>
              <th className="text-right p-2">Adjustments</th>
              <th className="text-right p-2">Closing</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row: any) => (
              <tr key={row.productId} className="border-b">
                <td className="p-2">{row.productName}</td>
                <td className="p-2 text-right">{row.openingBalance.toFixed(2)}</td>
                <td className="p-2 text-right text-green-600">+{row.purchases.toFixed(2)}</td>
                <td className="p-2 text-right text-red-600">-{row.sales.toFixed(2)}</td>
                <td className="p-2 text-right">{row.adjustments > 0 ? '+' : ''}{row.adjustments.toFixed(2)}</td>
                <td className="p-2 text-right font-semibold">{row.closingBalance.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )
    }

    if (activeTab === 'variance') {
      return (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left p-2">Product</th>
              <th className="text-right p-2">Expected</th>
              <th className="text-right p-2">Physical</th>
              <th className="text-right p-2">Variance</th>
              <th className="text-right p-2">%</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row: any) => (
              <tr key={row.productId} className="border-b">
                <td className="p-2">{row.productName}</td>
                <td className="p-2 text-right">{row.expectedQuantity.toFixed(2)}</td>
                <td className="p-2 text-right">{row.physicalQuantity.toFixed(2)}</td>
                <td className={`p-2 text-right font-mono ${row.variance === 0 ? '' : row.variance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {row.variance > 0 ? '+' : ''}{row.variance.toFixed(2)}
                </td>
                <td className={`p-2 text-right ${row.variancePct === 0 ? '' : Math.abs(row.variancePct) > 10 ? 'text-red-600' : 'text-yellow-600'}`}>
                  {row.variancePct > 0 ? '+' : ''}{row.variancePct.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )
    }

    if (activeTab === 'waste') {
      return (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left p-2">Date</th>
              <th className="text-left p-2">Type</th>
              <th className="text-left p-2">Product</th>
              <th className="text-right p-2">Qty</th>
              <th className="text-left p-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row: any, i: number) => (
              <tr key={i} className="border-b">
                <td className="p-2 text-xs">{new Date(row.date).toLocaleDateString()}</td>
                <td className="p-2 capitalize">{row.transactionType.replace('_', ' ')}</td>
                <td className="p-2">{row.productName}</td>
                <td className="p-2 text-right text-red-600">{row.quantity.toFixed(2)}</td>
                <td className="p-2 text-gray-500 text-xs">{row.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )
    }

    if (activeTab === 'fast-movers' || activeTab === 'slow-movers') {
      const maxQty = data.length > 0 ? Math.max(...data.map((r: any) => r.totalQuantity)) : 1
      return (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left p-2">#</th>
              <th className="text-left p-2">Product</th>
              <th className="text-right p-2">Total Sold</th>
              <th className="text-right p-2">Transactions</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {data.map((row: any, i: number) => (
              <tr key={row.productId} className="border-b">
                <td className="p-2 text-gray-400">{i + 1}</td>
                <td className="p-2">{row.productName}</td>
                <td className="p-2 text-right font-mono">{row.totalQuantity.toFixed(2)}</td>
                <td className="p-2 text-right">{row.transactionCount}</td>
                <td className="p-2">
                  <div className="w-24 h-2 bg-gray-100 rounded-full">
                    <div className="h-2 bg-emerald-500 rounded-full" style={{ width: `${(row.totalQuantity / maxQty) * 100}%` }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )
    }

    if (activeTab === 'valuation') {
      const total = data.reduce((s: number, r: any) => s + r.totalValue, 0)
      const maxVal = data.reduce((s: number, r: any) => Math.max(s, r.totalValue), 0)
      return (
        <>
          <div className="text-2xl font-bold mb-4">Total Value: {formatCurrency(total)}</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-2">Product</th>
                <th className="text-right p-2">Balance</th>
                <th className="text-right p-2">Unit Cost</th>
                <th className="text-right p-2">Total Value</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {data.map((row: any) => (
                <tr key={row.productId} className="border-b">
                  <td className="p-2">{row.productName}</td>
                  <td className="p-2 text-right">{row.balance.toFixed(2)}</td>
                  <td className="p-2 text-right">{row.unitCost ? formatCurrency(row.unitCost) : '—'}</td>
                  <td className="p-2 text-right font-semibold">{formatCurrency(row.totalValue)}</td>
                  <td className="p-2 pr-4">
                    <div className="w-24 h-2 bg-gray-100 rounded-full ml-auto">
                      <div className="h-2 bg-emerald-500 rounded-full" style={{ width: `${(row.totalValue / maxVal) * 100}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )
    }

    return null
  }

  return (
    <AdminPage title="Reports" description="Inventory reports and analytics" actions={<Button variant="secondary" size="sm" onClick={() => {
        if (!data) return
        const csv = [Object.keys(data[0] || {})].concat(data.map((r: any) => Object.values(r).join(','))).join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `${activeTab}-report.csv`; a.click()
        URL.revokeObjectURL(url)
      }} disabled={!data}>Export CSV</Button>}>

      <div className="flex gap-2 mb-6 border-b overflow-x-auto">
        {REPORT_TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === t.id ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-end mb-6">
        {tab?.params.includes('location_id') && (
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Location</label>
            <select className="border rounded px-3 py-2 text-sm" value={filters.location_id || ''} onChange={e => setFilters(f => ({ ...f, location_id: e.target.value }))}>
              <option value="">Select...</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        )}
        {tab?.params.includes('date') && (
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Date</label>
            <input className="border rounded px-3 py-2 text-sm" type="date" value={filters.date || ''} onChange={e => setFilters(f => ({ ...f, date: e.target.value }))} />
          </div>
        )}
        {tab?.params.includes('stock_count_id') && (
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Stock Count</label>
            <select className="border rounded px-3 py-2 text-sm" value={filters.stock_count_id || ''} onChange={e => setFilters(f => ({ ...f, stock_count_id: e.target.value }))}>
              <option value="">Select...</option>
              {stockCounts.map(sc => <option key={sc.id} value={sc.id}>{new Date(sc.created_at).toLocaleDateString()}</option>)}
            </select>
          </div>
        )}
        {(tab?.params.includes('from') || tab?.params.includes('to')) && (
          <>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">From</label>
              <input className="border rounded px-3 py-2 text-sm" type="date" value={filters.from?.slice(0, 10) || ''} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">To</label>
              <input className="border rounded px-3 py-2 text-sm" type="date" value={filters.to?.slice(0, 10) || ''} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />
            </div>
          </>
        )}
        {tab?.params.includes('days') && (
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Days</label>
            <input className="border rounded px-3 py-2 text-sm w-20" type="number" min="1" value={filters.days || '7'} onChange={e => setFilters(f => ({ ...f, days: e.target.value }))} />
          </div>
        )}
        <Button onClick={runReport} disabled={isLoading} size="sm">
          {isLoading ? 'Loading...' : 'Run Report'}
        </Button>
      </div>

      {isLoading ? <SkeletonCard /> : data !== null ? (
        <div className="bg-white rounded-lg border overflow-x-auto">{renderTable()}</div>
      ) : (
        <div className="text-center py-12 text-gray-400 text-sm">Select filters and click "Run Report"</div>
      )}
    </AdminPage>
  )
}
