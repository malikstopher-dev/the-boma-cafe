'use client'

import { useState, useEffect, useCallback } from 'react'
import AdminPage from '@/components/admin/design-system/AdminPage'

type TrendPoint = {
  date: string
  totalQuantity: number
}

type ValueTrendPoint = {
  date: string
  stockValue: number
}

type WasteHeatmap = {
  daysAnalyzed: number
  typeTotals: Array<{ type: string; totalQuantity: number }>
  cells: Array<{ type: string; dayOfWeek: number; totalQuantity: number }>
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const TYPE_TABS = [
  { value: '', label: 'All' },
  { value: 'FOOD', label: 'Food' },
  { value: 'BEVERAGE', label: 'Beverage' },
  { value: 'CLEANING', label: 'Cleaning' },
  { value: 'PACKAGING', label: 'Packaging' },
  { value: 'GENERAL', label: 'General' },
]
const RANGES = [
  { days: 14, label: '14 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
]

function formatCurrency(value: number): string {
  return 'R' + value.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function AnalyticsPage() {
  const [typeTab, setTypeTab] = useState('')
  const [rangeDays, setRangeDays] = useState(30)
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [waste, setWaste] = useState<WasteHeatmap | null>(null)
  const [valueTrend, setValueTrend] = useState<ValueTrendPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const typeParam = typeTab ? `&inventory_type=${typeTab}` : ''
      const base = `location_id=main&days=${rangeDays}`
      const [trendRes, wasteRes, valueRes] = await Promise.all([
        fetch(`/api/inventory/analytics/consumption-trend?${base}${typeParam}`),
        fetch(`/api/inventory/analytics/waste-heatmap?${base}${typeParam}`),
        fetch(`/api/inventory/analytics/value-trend?${base}${typeParam}`),
      ])
      if (!trendRes.ok || !wasteRes.ok || !valueRes.ok) {
        setError('Failed to load analytics data')
        return
      }
      setTrend((await trendRes.json()).data ?? [])
      setWaste((await wasteRes.json()).data ?? null)
      setValueTrend((await valueRes.json()).data ?? [])
    } catch {
      setError('Failed to load analytics data')
    } finally {
      setIsLoading(false)
    }
  }, [typeTab, rangeDays])

  useEffect(() => { fetchAll() }, [fetchAll])

  const maxTrend = Math.max(...trend.map(t => t.totalQuantity), 1)
  const maxValue = Math.max(...valueTrend.map(v => v.stockValue), 1)
  const maxWasteCell = waste ? Math.max(...waste.cells.map(c => c.totalQuantity), 1) : 1
  const totalWaste = waste?.typeTotals.reduce((s, t) => s + t.totalQuantity, 0) ?? 0
  const totalConsumed = trend.reduce((s, t) => s + t.totalQuantity, 0)

  return (
    <AdminPage
      title="Analytics"
      description="Consumption trends, waste patterns, and inventory value"
      actions={
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-700/50 overflow-hidden">
            {RANGES.map(r => (
              <button
                key={r.days}
                onClick={() => setRangeDays(r.days)}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  rangeDays === r.days ? 'bg-brand-600/20 text-brand-300' : 'text-gray-400 hover:text-white'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg border border-gray-700/50 overflow-hidden">
            {TYPE_TABS.map(t => (
              <button
                key={t.value}
                onClick={() => setTypeTab(t.value)}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  typeTab === t.value ? 'bg-brand-600/20 text-brand-300' : 'text-gray-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      }
    >
      <div className="p-6">
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
            <p className="text-sm text-gray-400">Units Sold ({rangeDays}d)</p>
            <p className="text-2xl font-bold text-white mt-1">{totalConsumed.toFixed(1)}</p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
            <p className="text-sm text-gray-400">Waste ({rangeDays}d)</p>
            <p className="text-2xl font-bold text-orange-400 mt-1">{totalWaste.toFixed(1)}</p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
            <p className="text-sm text-gray-400">Current Stock Value</p>
            <p className="text-2xl font-bold text-white mt-1">
              {valueTrend.length > 0 ? formatCurrency(valueTrend[valueTrend.length - 1].stockValue) : '—'}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-gray-400 py-12 text-center">Loading analytics...</div>
        ) : (
          <div className="space-y-6">
            <div className="bg-gray-900/40 border border-gray-800/50 rounded-lg p-5">
              <h3 className="text-white font-semibold mb-1">Consumption Trend</h3>
              <p className="text-xs text-gray-500 mb-4">Daily units sold — {rangeDays} days</p>
              <div className="flex items-end gap-1 h-40">
                {trend.map(p => {
                  const height = p.totalQuantity > 0 ? (p.totalQuantity / maxTrend) * 100 : 2
                  const today = p.date === new Date().toISOString().slice(0, 10)
                  return (
                    <div key={p.date} className="flex-1 flex flex-col items-center gap-1 group" title={`${p.date}: ${p.totalQuantity.toFixed(1)}`}>
                      <div
                        className={`w-full rounded-t transition-colors ${today ? 'bg-brand-400' : 'bg-brand-700/60 group-hover:bg-brand-500'}`}
                        style={{ height: `${Math.max(height, 2)}%` }}
                      />
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                <span>{trend[0]?.date}</span>
                <span>Today</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-900/40 border border-gray-800/50 rounded-lg p-5">
                <h3 className="text-white font-semibold mb-1">Waste Heatmap</h3>
                <p className="text-xs text-gray-500 mb-4">Waste types by day of week (last {waste?.daysAnalyzed ?? rangeDays} days)</p>
                {waste && waste.cells.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-gray-500 border-b border-gray-800">
                          <th className="py-2 pr-3">Type</th>
                          {DAY_NAMES.map(d => <th key={d} className="py-2 px-2 text-center">{d}</th>)}
                          <th className="py-2 pl-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {waste.typeTotals.map(tt => {
                          const rowCells = waste.cells.filter(c => c.type === tt.type)
                          return (
                            <tr key={tt.type} className="border-b border-gray-800/40">
                              <td className="py-2 pr-3 text-white capitalize">{tt.type.replace('_', ' ')}</td>
                              {DAY_NAMES.map((_, dow) => {
                                const cell = rowCells.find(c => c.dayOfWeek === dow)
                                const opacity = cell ? 0.25 + 0.75 * (cell.totalQuantity / maxWasteCell) : 0
                                return (
                                  <td key={dow} className="py-1 px-1">
                                    <div
                                      className="h-5 rounded flex items-center justify-center text-[10px]"
                                      style={{ background: cell ? `rgba(249, 115, 22, ${opacity})` : 'rgba(255,255,255,0.04)', color: cell && opacity > 0.5 ? '#fff' : 'rgba(255,255,255,0.5)' }}
                                      title={`${tt.type} on ${DAY_NAMES[dow]}: ${cell?.totalQuantity.toFixed(1) ?? 0}`}
                                    >
                                      {cell ? cell.totalQuantity.toFixed(1) : ''}
                                    </div>
                                  </td>
                                )
                              })}
                              <td className="py-2 pl-2 text-right text-orange-300 font-medium">{tt.totalQuantity.toFixed(1)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-gray-500 py-8 text-center text-sm">No waste events in this period.</div>
                )}
              </div>

              <div className="bg-gray-900/40 border border-gray-800/50 rounded-lg p-5">
                <h3 className="text-white font-semibold mb-1">Inventory Value Trend</h3>
                <p className="text-xs text-gray-500 mb-4">Daily snapshot value (carried forward)</p>
                <div className="flex items-end gap-1 h-40">
                  {valueTrend.map(p => {
                    const height = p.stockValue > 0 ? (p.stockValue / maxValue) * 100 : 2
                    return (
                      <div key={p.date} className="flex-1 group" title={`${p.date}: ${formatCurrency(p.stockValue)}`}>
                        <div
                          className={`w-full rounded-t transition-colors ${p.stockValue > 0 ? 'bg-emerald-700/60 group-hover:bg-emerald-500' : 'bg-gray-700/40'}`}
                          style={{ height: `${Math.max(height, 2)}%` }}
                        />
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                  <span>{valueTrend[0]?.date}</span>
                  <span>{valueTrend[valueTrend.length - 1]?.date}</span>
                </div>
                {valueTrend.every(v => v.stockValue === 0) && (
                  <p className="text-xs text-gray-500 mt-3">
                    No daily snapshots yet — value appears once the daily snapshot job has run.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminPage>
  )
}
