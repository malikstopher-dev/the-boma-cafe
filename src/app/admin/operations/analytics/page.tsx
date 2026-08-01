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
          <div className="flex rounded-lg overflow-hidden" style={{border:'1px solid #3A3428'}}>
            {RANGES.map(r => (
              <button
                key={r.days}
                onClick={() => setRangeDays(r.days)}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  rangeDays === r.days ? 'text-white' : 'text-gray-400 hover:text-white'
                }`}
                style={rangeDays === r.days ? {background:'rgba(200,160,78,0.2)',color:'#C8A04E'} : {}}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg overflow-hidden" style={{border:'1px solid #3A3428'}}>
            {TYPE_TABS.map(t => (
              <button
                key={t.value}
                onClick={() => setTypeTab(t.value)}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  typeTab === t.value ? 'text-white' : 'text-gray-400 hover:text-white'
                }`}
                style={typeTab === t.value ? {background:'rgba(200,160,78,0.2)',color:'#C8A04E'} : {}}
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
          <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{border:'1px solid rgba(232,84,84,0.4)',background:'rgba(232,84,84,0.1)',color:'#E85454'}}>
            {error}
          </div>
        )}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div style={{background:'#1E1A14',border:'1px solid #3A3428',borderRadius:12,padding:16}}>
            <p style={{fontSize:14,color:'#A09888',fontFamily:'Inter, sans-serif'}}>Units Sold ({rangeDays}d)</p>
            <p style={{fontSize:24,fontWeight:700,color:'#F0EBE3',marginTop:4,fontFamily:'Inter, sans-serif'}}>{totalConsumed.toFixed(1)}</p>
          </div>
          <div style={{background:'#1E1A14',border:'1px solid #3A3428',borderRadius:12,padding:16}}>
            <p style={{fontSize:14,color:'#A09888',fontFamily:'Inter, sans-serif'}}>Waste ({rangeDays}d)</p>
            <p style={{fontSize:24,fontWeight:700,color:'#FF9800',marginTop:4,fontFamily:'Inter, sans-serif'}}>{totalWaste.toFixed(1)}</p>
          </div>
          <div style={{background:'#1E1A14',border:'1px solid #3A3428',borderRadius:12,padding:16}}>
            <p style={{fontSize:14,color:'#A09888',fontFamily:'Inter, sans-serif'}}>Current Stock Value</p>
            <p style={{fontSize:24,fontWeight:700,color:'#F0EBE3',marginTop:4,fontFamily:'Inter, sans-serif'}}>
              {valueTrend.length > 0 ? formatCurrency(valueTrend[valueTrend.length - 1].stockValue) : '—'}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div style={{color:'#A09888',padding:'48px 0',textAlign:'center',fontFamily:'Inter, sans-serif'}}>Loading analytics...</div>
        ) : (
          <div className="space-y-6">
            <div style={{background:'#1E1A14',border:'1px solid #3A3428',borderRadius:12,padding:20}}>
              <h3 style={{color:'#F0EBE3',fontWeight:600,marginBottom:4,fontFamily:'Inter, sans-serif'}}>Consumption Trend</h3>
              <p style={{fontSize:12,color:'#A09888',marginBottom:16,fontFamily:'Inter, sans-serif'}}>Daily units sold — {rangeDays} days</p>
              <div className="flex items-end gap-1 h-40">
                {trend.map(p => {
                  const height = p.totalQuantity > 0 ? (p.totalQuantity / maxTrend) * 100 : 2
                  const today = p.date === new Date().toISOString().slice(0, 10)
                  return (
                    <div key={p.date} className="flex-1 flex flex-col items-center gap-1 group" title={`${p.date}: ${p.totalQuantity.toFixed(1)}`}>
                      <div
                        className={`w-full rounded-t transition-colors ${today ? 'bg-amber-600' : 'bg-amber-800/60 group-hover:bg-amber-600'}`}
                        style={{ height: `${Math.max(height, 2)}%` }}
                      />
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-between text-[10px] mt-1" style={{color:'#6B6358'}}>
                <span>{trend[0]?.date}</span>
                <span>Today</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div style={{background:'#1E1A14',border:'1px solid #3A3428',borderRadius:12,padding:20}}>
                <h3 style={{color:'#F0EBE3',fontWeight:600,marginBottom:4,fontFamily:'Inter, sans-serif'}}>Waste Heatmap</h3>
                <p style={{fontSize:12,color:'#A09888',marginBottom:16,fontFamily:'Inter, sans-serif'}}>Waste types by day of week (last {waste?.daysAnalyzed ?? rangeDays} days)</p>
                {waste && waste.cells.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{textAlign:'left',color:'#A09888',borderBottom:'1px solid #3A3428'}}>
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
                              <td style={{padding:8,paddingRight:12,textTransform:'capitalize',color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}>{tt.type.replace('_', ' ')}</td>
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
                              <td style={{padding:8,paddingLeft:8,textAlign:'right',color:'#FF9800',fontWeight:500,fontFamily:'Inter, sans-serif'}}>{tt.totalQuantity.toFixed(1)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{color:'#A09888',padding:'32px 0',textAlign:'center',fontSize:14,fontFamily:'Inter, sans-serif'}}>No waste events in this period.</div>
                )}
              </div>

              <div style={{background:'#1E1A14',border:'1px solid #3A3428',borderRadius:12,padding:20}}>
                <h3 style={{color:'#F0EBE3',fontWeight:600,marginBottom:4,fontFamily:'Inter, sans-serif'}}>Inventory Value Trend</h3>
                <p style={{fontSize:12,color:'#A09888',marginBottom:16,fontFamily:'Inter, sans-serif'}}>Daily snapshot value (carried forward)</p>
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
              <div className="flex justify-between text-[10px] mt-1" style={{color:'#6B6358'}}>
                  <span>{valueTrend[0]?.date}</span>
                  <span>{valueTrend[valueTrend.length - 1]?.date}</span>
                </div>
                {valueTrend.every(v => v.stockValue === 0) && (
                  <p style={{fontSize:12,color:'#A09888',marginTop:12,fontFamily:'Inter, sans-serif'}}>
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
