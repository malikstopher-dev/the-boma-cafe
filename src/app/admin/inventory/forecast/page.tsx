'use client'

import { useState, useEffect } from 'react'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Badge from '@/components/admin/design-system/Badge'

interface DepletionRow {
  productId: string
  productName: string
  sku: string | null
  barcode: string | null
  inventoryType: string
  currentBalance: number
  dailyUsage: number
  daysRemaining: number | null
  projectedStockoutDate: string | null
  minLevel: number
  leadTimeDays: number
  urgency: 'out_of_stock' | 'critical' | 'warning' | 'ok'
}

interface DayPattern {
  dayOfWeek: number
  dayName: string
  totalQuantity: number
  sharePercent: number
  multiplier: number
}

interface HourPattern {
  hour: number
  totalQuantity: number
}

interface ConsumptionPattern {
  totalConsumed: number
  averagePerDay: number
  busiestDay: string
  peakHour: number
  daysAnalyzed: number
  dayOfWeek: DayPattern[]
  hourly: HourPattern[]
}

const urgencyConfig = {
  out_of_stock: { color: 'text-red-400', bg: 'bg-red-900/30 border-red-800/50', label: 'Out of stock' },
  critical: { color: 'text-orange-400', bg: 'bg-orange-900/30 border-orange-800/50', label: 'Critical' },
  warning: { color: 'text-yellow-400', bg: 'bg-yellow-900/30 border-yellow-800/50', label: 'Low' },
  ok: { color: 'text-green-400', bg: 'bg-green-900/30 border-green-800/50', label: 'Healthy' },
}

const TYPE_TABS = [
  { value: '', label: 'All' },
  { value: 'FOOD', label: 'Food' },
  { value: 'BEVERAGE', label: 'Beverage' },
  { value: 'CLEANING', label: 'Cleaning' },
  { value: 'PACKAGING', label: 'Packaging' },
  { value: 'GENERAL', label: 'General' },
]

export default function ForecastPage() {
  const [rows, setRows] = useState<DepletionRow[]>([])
  const [pattern, setPattern] = useState<ConsumptionPattern | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [typeTab, setTypeTab] = useState('')
  const [showHealthy, setShowHealthy] = useState(false)

  useEffect(() => {
    fetchForecast()
    fetchPattern()
  }, [])

  async function fetchForecast() {
    setIsLoading(true)
    try {
      const res = await fetch('/api/inventory/forecast/depletion?location_id=main')
      const json = await res.json()
      setRows(json.data ?? [])
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchPattern() {
    try {
      const res = await fetch('/api/inventory/forecast/patterns?location_id=main&days=60')
      const json = await res.json()
      setPattern(json.data ?? null)
    } catch {
      // ignore
    }
  }

  const filtered = rows.filter(r => {
    if (typeTab && r.inventoryType !== typeTab) return false
    if (!showHealthy && r.urgency === 'ok') return false
    return true
  })

  const outOfStock = rows.filter(r => r.urgency === 'out_of_stock').length
  const critical = rows.filter(r => r.urgency === 'critical').length
  const warning = rows.filter(r => r.urgency === 'warning').length
  const maxHour = pattern ? Math.max(...pattern.hourly.map(h => h.totalQuantity), 1) : 1

  return (
    <AdminPage
      title="Forecasting"
      description="Predicted stock-out dates and consumption patterns"
      actions={
        <button onClick={() => { fetchForecast(); fetchPattern() }} className="text-sm text-brand-400 hover:text-brand-300">
          Refresh
        </button>
      }
    >
      <div className="p-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
            <p className="text-sm text-gray-400">Products Tracked</p>
            <p className="text-2xl font-bold text-white mt-1">{rows.length}</p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
            <p className="text-sm text-gray-400">Out of Stock</p>
            <p className="text-2xl font-bold text-red-400 mt-1">{outOfStock}</p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
            <p className="text-sm text-gray-400">Critical (within lead time)</p>
            <p className="text-2xl font-bold text-orange-400 mt-1">{critical}</p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
            <p className="text-sm text-gray-400">Low Stock</p>
            <p className="text-2xl font-bold text-yellow-400 mt-1">{warning}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4 flex-wrap">
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
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={showHealthy}
              onChange={e => setShowHealthy(e.target.checked)}
              className="accent-brand-500"
            />
            Show healthy stock
          </label>
        </div>

        {isLoading ? (
          <div className="text-gray-400 py-12 text-center">Calculating forecast...</div>
        ) : filtered.length === 0 ? (
          <div className="text-gray-500 py-12 text-center">No products match the current filters.</div>
        ) : (
          <div className="bg-gray-900/40 border border-gray-800/50 rounded-lg overflow-hidden mb-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-800">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3 text-right">Daily Usage</th>
                  <th className="px-4 py-3 text-right">Days Left</th>
                  <th className="px-4 py-3">Projected Stock-out</th>
                  <th className="px-4 py-3 text-right">Min Level</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const urg = urgencyConfig[r.urgency]
                  return (
                    <tr key={r.productId} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">{r.productName}</p>
                        {r.sku && <p className="text-xs text-gray-500">SKU: {r.sku}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-400">{r.inventoryType}</td>
                      <td className="px-4 py-3 text-right text-white font-medium">{r.currentBalance.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-gray-300">{r.dailyUsage.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-gray-300">
                        {r.daysRemaining !== null ? r.daysRemaining.toFixed(1) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {r.projectedStockoutDate ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400">{r.minLevel.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={r.urgency === 'ok' ? 'success' : r.urgency === 'warning' ? 'info' : 'danger'}>
                          {urg.label}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {pattern && pattern.totalConsumed > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-900/40 border border-gray-800/50 rounded-lg p-5">
              <h3 className="text-white font-semibold mb-1">Day-of-Week Consumption</h3>
              <p className="text-xs text-gray-500 mb-4">
                Last {pattern.daysAnalyzed} days — busiest: {pattern.busiestDay}, avg {pattern.averagePerDay.toFixed(1)}/day
              </p>
              <div className="space-y-2">
                {pattern.dayOfWeek.map(d => {
                  const width = Math.max((d.totalQuantity / Math.max(pattern.totalConsumed, 1)) * 100, 0.5)
                  const highlight = d.dayName === pattern.busiestDay
                  return (
                    <div key={d.dayOfWeek} className="flex items-center gap-3">
                      <span className="w-24 text-xs text-gray-400">{d.dayName}</span>
                      <div className="flex-1 bg-gray-800 rounded h-5 overflow-hidden">
                        <div
                          className={`h-full ${highlight ? 'bg-brand-500' : 'bg-brand-600/50'}`}
                          style={{ width: `${Math.min(width, 100)}%` }}
                        />
                      </div>
                      <span className="w-20 text-xs text-gray-400 text-right">{d.totalQuantity.toFixed(1)} ({d.sharePercent}%)</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="bg-gray-900/40 border border-gray-800/50 rounded-lg p-5">
              <h3 className="text-white font-semibold mb-1">Hour-of-Day Profile</h3>
              <p className="text-xs text-gray-500 mb-4">Peak consumption hour: {pattern.peakHour}:00</p>
              <div className="flex items-end gap-0.5 h-40">
                {pattern.hourly.map(h => {
                  const height = h.totalQuantity > 0 ? (h.totalQuantity / maxHour) * 100 : 2
                  const peak = h.hour === pattern.peakHour
                  return (
                    <div key={h.hour} className="flex-1 flex flex-col items-center gap-1 group">
                      <div
                        className={`w-full rounded-t ${peak ? 'bg-brand-400' : 'bg-brand-700/60'}`}
                        style={{ height: `${Math.max(height, 2)}%` }}
                        title={`${h.hour}:00 — ${h.totalQuantity.toFixed(1)}`}
                      />
                      {(h.hour % 4 === 0) && (
                        <span className="text-[10px] text-gray-600">{h.hour}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminPage>
  )
}
