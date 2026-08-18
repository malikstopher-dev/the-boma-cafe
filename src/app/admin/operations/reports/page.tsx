'use client'

import { useState, useEffect } from 'react'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Button from '@/components/admin/design-system/Button'
import { SkeletonCard } from '@/components/admin/design-system/Skeleton'
import { exportRowsToXlsx, type ExportColumn } from '@/inventory/lib/export-xlsx'

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
  const [error, setError] = useState<string | null>(null)
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
    setError(null)

    const params = new URLSearchParams()
    for (const key of tab.params) {
      if (filters[key]) params.set(key, filters[key])
    }
    if (tab.params.includes('location_id') && !params.get('location_id')) {
      params.set('location_id', 'main')
    }

    try {
      const res = await fetch(`/api/inventory/reports/${tab.id}?${params}`)
      const json = await res.json()
      if (!res.ok) {
        setError(json.error?.message || 'Report failed to load')
        setData([])
        return
      }
      setData(json.data || [])
    } catch {
      setError('Failed to load report')
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

  const [exporting, setExporting] = useState(false)

  function reportColumns(): ExportColumn<any>[] | null {
    switch (activeTab) {
      case 'daily':
        return [
          { header: 'Product', value: r => r.productName, width: 28 },
          { header: 'Opening', value: r => r.openingBalance, width: 10 },
          { header: 'Purchases', value: r => r.purchases, width: 10 },
          { header: 'Sales', value: r => r.sales, width: 10 },
          { header: 'Adjustments', value: r => r.adjustments, width: 12 },
          { header: 'Closing', value: r => r.closingBalance, width: 10 },
        ]
      case 'variance':
        return [
          { header: 'Product', value: r => r.productName, width: 28 },
          { header: 'Expected', value: r => r.expectedQuantity, width: 10 },
          { header: 'Physical', value: r => r.physicalQuantity, width: 10 },
          { header: 'Variance', value: r => r.variance, width: 10 },
          { header: '%', value: r => Math.round(r.variancePct * 10) / 10, width: 8 },
        ]
      case 'waste':
        return [
          { header: 'Date', value: r => String(r.date).slice(0, 10), width: 12 },
          { header: 'Type', value: r => r.transactionType.replace('_', ' '), width: 14 },
          { header: 'Product', value: r => r.productName, width: 28 },
          { header: 'Qty', value: r => r.quantity, width: 10 },
          { header: 'Notes', value: r => r.notes ?? '', width: 32 },
        ]
      case 'fast-movers':
      case 'slow-movers':
        return [
          { header: 'Product', value: r => r.productName, width: 28 },
          { header: 'Total Sold', value: r => r.totalQuantity, width: 12 },
          { header: 'Transactions', value: r => r.transactionCount, width: 14 },
        ]
      case 'valuation':
        return [
          { header: 'Product', value: r => r.productName, width: 28 },
          { header: 'Balance', value: r => r.balance, width: 10 },
          { header: 'Unit Cost', value: r => r.unitCost ?? '', width: 12 },
          { header: 'Total Value', value: r => r.totalValue, width: 12 },
        ]
      default:
        return null
    }
  }

  async function exportReport() {
    if (!data || data.length === 0 || exporting) return
    setExporting(true)
    try {
      const columns = reportColumns()
      if (!columns) return
      const count = await exportRowsToXlsx({
        filename: `boma-report-${activeTab}-${new Date().toISOString().slice(0, 10)}.xlsx`,
        sheetName: activeTab === 'fast-movers' ? 'Fast Movers' : activeTab === 'slow-movers' ? 'Slow Movers' : REPORT_TABS.find(t => t.id === activeTab)?.label ?? activeTab,
        columns,
        rows: data,
      })
      if (typeof window !== 'undefined') {
        window.alert(`Exported ${count} rows to .XLSX`)
      }
    } finally {
      setExporting(false)
    }
  }

  function renderTable() {
    if (!data) return null
    if (data.length === 0) return <p style={{fontSize:14,color:'#6B6358',paddingTop:32,paddingBottom:32,textAlign:'center',fontFamily:'Inter, sans-serif'}}>No data for this report</p>

    if (activeTab === 'daily') {
      return (
        <table style={{width:'100%',fontSize:14}}>
          <thead>
            <tr style={{borderBottom:'1px solid #3A3428',background:'#242018'}}>
              <th style={{textAlign:'left',padding:'10px 16px',fontSize:11,fontWeight:600,color:'#6B6358',textTransform:'uppercase',letterSpacing:'0.04em'}}>Product</th>
              <th style={{textAlign:'right',padding:'10px 16px',fontSize:11,fontWeight:600,color:'#6B6358',textTransform:'uppercase',letterSpacing:'0.04em'}}>Opening</th>
              <th style={{textAlign:'right',padding:'10px 16px',fontSize:11,fontWeight:600,color:'#6B6358',textTransform:'uppercase',letterSpacing:'0.04em'}}>Purchases</th>
              <th style={{textAlign:'right',padding:'10px 16px',fontSize:11,fontWeight:600,color:'#6B6358',textTransform:'uppercase',letterSpacing:'0.04em'}}>Sales</th>
              <th style={{textAlign:'right',padding:'10px 16px',fontSize:11,fontWeight:600,color:'#6B6358',textTransform:'uppercase',letterSpacing:'0.04em'}}>Adjustments</th>
              <th style={{textAlign:'right',padding:'10px 16px',fontSize:11,fontWeight:600,color:'#6B6358',textTransform:'uppercase',letterSpacing:'0.04em'}}>Closing</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row: any) => (
              <tr key={row.productId} style={{borderBottom:'1px solid #3A3428'}}>
                <td style={{padding:'12px 16px',color:'#F0EBE3'}}>{row.productName}</td>
                <td style={{padding:'12px 16px',textAlign:'right',color:'#F0EBE3'}}>{row.openingBalance.toFixed(2)}</td>
                <td style={{padding:'12px 16px',textAlign:'right',color:'#4CAF50'}}>+{row.purchases.toFixed(2)}</td>
                <td style={{padding:'12px 16px',textAlign:'right',color:'#E85454'}}>-{row.sales.toFixed(2)}</td>
                <td style={{padding:'12px 16px',textAlign:'right',color:'#F0EBE3'}}>{row.adjustments > 0 ? '+' : ''}{row.adjustments.toFixed(2)}</td>
                <td style={{padding:'12px 16px',textAlign:'right',fontWeight:600,color:'#F0EBE3'}}>{row.closingBalance.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )
    }

    if (activeTab === 'variance') {
      return (
        <table style={{width:'100%',fontSize:14}}>
          <thead>
            <tr style={{borderBottom:'1px solid #3A3428',background:'#242018'}}>
              <th style={{textAlign:'left',padding:'10px 16px',fontSize:11,fontWeight:600,color:'#6B6358',textTransform:'uppercase',letterSpacing:'0.04em'}}>Product</th>
              <th style={{textAlign:'right',padding:'10px 16px',fontSize:11,fontWeight:600,color:'#6B6358',textTransform:'uppercase',letterSpacing:'0.04em'}}>Expected</th>
              <th style={{textAlign:'right',padding:'10px 16px',fontSize:11,fontWeight:600,color:'#6B6358',textTransform:'uppercase',letterSpacing:'0.04em'}}>Physical</th>
              <th style={{textAlign:'right',padding:'10px 16px',fontSize:11,fontWeight:600,color:'#6B6358',textTransform:'uppercase',letterSpacing:'0.04em'}}>Variance</th>
              <th style={{textAlign:'right',padding:'10px 16px',fontSize:11,fontWeight:600,color:'#6B6358',textTransform:'uppercase',letterSpacing:'0.04em'}}>%</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row: any) => (
              <tr key={row.productId} style={{borderBottom:'1px solid #3A3428'}}>
                <td style={{padding:'12px 16px',color:'#F0EBE3'}}>{row.productName}</td>
                <td style={{padding:'12px 16px',textAlign:'right',color:'#F0EBE3'}}>{row.expectedQuantity.toFixed(2)}</td>
                <td style={{padding:'12px 16px',textAlign:'right',color:'#F0EBE3'}}>{row.physicalQuantity.toFixed(2)}</td>
                <td style={{padding:'12px 16px',textAlign:'right',fontFamily:'monospace',color:row.variance === 0 ? '#F0EBE3' : row.variance > 0 ? '#4CAF50' : '#E85454'}}>
                  {row.variance > 0 ? '+' : ''}{row.variance.toFixed(2)}
                </td>
                <td style={{padding:'12px 16px',textAlign:'right',color:row.variancePct === 0 ? '#F0EBE3' : Math.abs(row.variancePct) > 10 ? '#E85454' : '#FF9800'}}>
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
        <table style={{width:'100%',fontSize:14}}>
          <thead>
            <tr style={{borderBottom:'1px solid #3A3428',background:'#242018'}}>
              <th style={{textAlign:'left',padding:'10px 16px',fontSize:11,fontWeight:600,color:'#6B6358',textTransform:'uppercase',letterSpacing:'0.04em'}}>Date</th>
              <th style={{textAlign:'left',padding:'10px 16px',fontSize:11,fontWeight:600,color:'#6B6358',textTransform:'uppercase',letterSpacing:'0.04em'}}>Type</th>
              <th style={{textAlign:'left',padding:'10px 16px',fontSize:11,fontWeight:600,color:'#6B6358',textTransform:'uppercase',letterSpacing:'0.04em'}}>Product</th>
              <th style={{textAlign:'right',padding:'10px 16px',fontSize:11,fontWeight:600,color:'#6B6358',textTransform:'uppercase',letterSpacing:'0.04em'}}>Qty</th>
              <th style={{textAlign:'left',padding:'10px 16px',fontSize:11,fontWeight:600,color:'#6B6358',textTransform:'uppercase',letterSpacing:'0.04em'}}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row: any, i: number) => (
              <tr key={i} style={{borderBottom:'1px solid #3A3428'}}>
                <td style={{padding:'12px 16px',fontSize:12,color:'#A09888'}}>{new Date(row.date).toLocaleDateString()}</td>
                <td style={{padding:'12px 16px',textTransform:'capitalize',color:'#F0EBE3'}}>{row.transactionType.replace('_', ' ')}</td>
                <td style={{padding:'12px 16px',color:'#F0EBE3'}}>{row.productName}</td>
                <td style={{padding:'12px 16px',textAlign:'right',color:'#E85454'}}>{row.quantity.toFixed(2)}</td>
                <td style={{padding:'12px 16px',fontSize:12,color:'#6B6358'}}>{row.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )
    }

    if (activeTab === 'fast-movers' || activeTab === 'slow-movers') {
      const maxQty = data.length > 0 ? Math.max(...data.map((r: any) => r.totalQuantity)) : 1
      return (
        <table style={{width:'100%',fontSize:14}}>
          <thead>
            <tr style={{borderBottom:'1px solid #3A3428',background:'#242018'}}>
              <th style={{textAlign:'left',padding:'10px 16px',fontSize:11,fontWeight:600,color:'#6B6358',textTransform:'uppercase',letterSpacing:'0.04em'}}>#</th>
              <th style={{textAlign:'left',padding:'10px 16px',fontSize:11,fontWeight:600,color:'#6B6358',textTransform:'uppercase',letterSpacing:'0.04em'}}>Product</th>
              <th style={{textAlign:'right',padding:'10px 16px',fontSize:11,fontWeight:600,color:'#6B6358',textTransform:'uppercase',letterSpacing:'0.04em'}}>Total Sold</th>
              <th style={{textAlign:'right',padding:'10px 16px',fontSize:11,fontWeight:600,color:'#6B6358',textTransform:'uppercase',letterSpacing:'0.04em'}}>Transactions</th>
              <th style={{padding:'10px 16px'}}></th>
            </tr>
          </thead>
          <tbody>
            {data.map((row: any, i: number) => (
              <tr key={row.productId} style={{borderBottom:'1px solid #3A3428'}}>
                <td style={{padding:'12px 16px',color:'#A09888'}}>{i + 1}</td>
                <td style={{padding:'12px 16px',color:'#F0EBE3'}}>{row.productName}</td>
                <td style={{padding:'12px 16px',textAlign:'right',fontFamily:'monospace',color:'#F0EBE3'}}>{row.totalQuantity.toFixed(2)}</td>
                <td style={{padding:'12px 16px',textAlign:'right',color:'#F0EBE3'}}>{row.transactionCount}</td>
                <td style={{padding:'12px 16px'}}>
                  <div style={{width:96,height:8,borderRadius:4,background:'#2A261E'}}>
                    <div style={{height:8,borderRadius:4,background:'#4CAF50',width:`${(row.totalQuantity / maxQty) * 100}%`}} />
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
          <div style={{fontSize:20,fontWeight:700,color:'#F0EBE3',marginBottom:16,padding:'0 16px',fontFamily:'Inter, sans-serif'}}>Total Value: {formatCurrency(total)}</div>
          <table style={{width:'100%',fontSize:14}}>
            <thead>
              <tr style={{borderBottom:'1px solid #3A3428',background:'#242018'}}>
                <th style={{textAlign:'left',padding:'10px 16px',fontSize:11,fontWeight:600,color:'#6B6358',textTransform:'uppercase',letterSpacing:'0.04em'}}>Product</th>
                <th style={{textAlign:'right',padding:'10px 16px',fontSize:11,fontWeight:600,color:'#6B6358',textTransform:'uppercase',letterSpacing:'0.04em'}}>Balance</th>
                <th style={{textAlign:'right',padding:'10px 16px',fontSize:11,fontWeight:600,color:'#6B6358',textTransform:'uppercase',letterSpacing:'0.04em'}}>Unit Cost</th>
                <th style={{textAlign:'right',padding:'10px 16px',fontSize:11,fontWeight:600,color:'#6B6358',textTransform:'uppercase',letterSpacing:'0.04em'}}>Total Value</th>
                <th style={{padding:'10px 16px'}}></th>
              </tr>
            </thead>
            <tbody>
              {data.map((row: any) => (
                <tr key={row.productId} style={{borderBottom:'1px solid #3A3428'}}>
                  <td style={{padding:'12px 16px',color:'#F0EBE3'}}>{row.productName}</td>
                  <td style={{padding:'12px 16px',textAlign:'right',color:'#F0EBE3'}}>{row.balance.toFixed(2)}</td>
                  <td style={{padding:'12px 16px',textAlign:'right',color:'#F0EBE3'}}>{row.unitCost ? formatCurrency(row.unitCost) : '—'}</td>
                  <td style={{padding:'12px 16px',textAlign:'right',fontWeight:600,color:'#F0EBE3'}}>{formatCurrency(row.totalValue)}</td>
                  <td style={{padding:'12px 16px',paddingRight:16}}>
                    <div style={{width:96,height:8,borderRadius:4,background:'#2A261E',marginLeft:'auto'}}>
                      <div style={{height:8,borderRadius:4,background:'#4CAF50',width:`${(row.totalValue / maxVal) * 100}%`}} />
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
    <AdminPage title="Reports" description="Inventory reports and analytics" actions={<Button variant="secondary" size="sm" onClick={() => void exportReport()} disabled={!data || data.length === 0 || exporting}>{exporting ? 'Exporting…' : 'Export .XLSX'}</Button>}>

      <div style={{display:'flex',gap:0,borderBottom:'1px solid #3A3428',marginBottom:24,overflowX:'auto',fontFamily:'Inter, sans-serif'}}>
        {REPORT_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => { setActiveTab(t.id); setData(null); setError(null) }}
            style={{
              padding:'10px 16px',fontSize:14,fontWeight:500,
              borderBottom:`2px solid ${activeTab === t.id ? '#C8A04E' : 'transparent'}`,
              color:activeTab === t.id ? '#C8A04E' : '#A09888',
              background:'none',borderTop:'none',borderLeft:'none',borderRight:'none',
              cursor:'pointer',whiteSpace:'nowrap',transition:'color 0.15s',fontFamily:'Inter, sans-serif'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{background:'#1E1A14',border:'1px solid #3A3428',borderRadius:12,padding:20,marginBottom:24,fontFamily:'Inter, sans-serif'}}>
        <div style={{display:'flex',flexWrap:'wrap',gap:12,alignItems:'flex-end'}}>
          {tab?.params.includes('location_id') && (
            <div>
              <label style={{fontSize:13,fontWeight:600,color:'#A09888',display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.05em'}}>Location</label>
              <select style={{background:'#2A261E',border:'1px solid #3A3428',borderRadius:8,padding:'8px 12px',fontSize:14,color:'#F0EBE3',fontFamily:'Inter, sans-serif',outline:'none'}} value={filters.location_id || ''} onChange={e => setFilters(f => ({ ...f, location_id: e.target.value }))}>
                <option value="">Select...</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          )}
          {tab?.params.includes('date') && (
            <div>
              <label style={{fontSize:13,fontWeight:600,color:'#A09888',display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.05em'}}>Date</label>
              <input style={{background:'#2A261E',border:'1px solid #3A3428',borderRadius:8,padding:'8px 12px',fontSize:14,color:'#F0EBE3',fontFamily:'Inter, sans-serif',outline:'none'}} type="date" value={filters.date || ''} onChange={e => setFilters(f => ({ ...f, date: e.target.value }))} />
            </div>
          )}
          {tab?.params.includes('stock_count_id') && (
            <div>
              <label style={{fontSize:13,fontWeight:600,color:'#A09888',display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.05em'}}>Stock Count</label>
              <select style={{background:'#2A261E',border:'1px solid #3A3428',borderRadius:8,padding:'8px 12px',fontSize:14,color:'#F0EBE3',fontFamily:'Inter, sans-serif',outline:'none'}} value={filters.stock_count_id || ''} onChange={e => setFilters(f => ({ ...f, stock_count_id: e.target.value }))}>
                <option value="">Select...</option>
                {stockCounts.map(sc => <option key={sc.id} value={sc.id}>{new Date(sc.created_at).toLocaleDateString()}</option>)}
              </select>
            </div>
          )}
          {(tab?.params.includes('from') || tab?.params.includes('to')) && (
            <>
              <div>
                <label style={{fontSize:13,fontWeight:600,color:'#A09888',display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.05em'}}>From</label>
                <input style={{background:'#2A261E',border:'1px solid #3A3428',borderRadius:8,padding:'8px 12px',fontSize:14,color:'#F0EBE3',fontFamily:'Inter, sans-serif',outline:'none'}} type="date" value={filters.from?.slice(0, 10) || ''} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
              </div>
              <div>
                <label style={{fontSize:13,fontWeight:600,color:'#A09888',display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.05em'}}>To</label>
                <input style={{background:'#2A261E',border:'1px solid #3A3428',borderRadius:8,padding:'8px 12px',fontSize:14,color:'#F0EBE3',fontFamily:'Inter, sans-serif',outline:'none'}} type="date" value={filters.to?.slice(0, 10) || ''} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />
              </div>
            </>
          )}
          {tab?.params.includes('days') && (
            <div>
              <label style={{fontSize:13,fontWeight:600,color:'#A09888',display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.05em'}}>Days</label>
              <input style={{background:'#2A261E',border:'1px solid #3A3428',borderRadius:8,padding:'8px 12px',fontSize:14,color:'#F0EBE3',width:80,fontFamily:'Inter, sans-serif',outline:'none'}} type="number" min="1" value={filters.days || '7'} onChange={e => setFilters(f => ({ ...f, days: e.target.value }))} />
            </div>
          )}
          <button
            onClick={runReport}
            disabled={isLoading}
            style={{background:isLoading ? '#3A3428' : '#C8A04E',color:isLoading ? '#6B6358' : '#1A1610',fontWeight:600,borderRadius:8,padding:'8px 16px',fontSize:13,border:'none',cursor:isLoading ? 'not-allowed' : 'pointer',fontFamily:'Inter, sans-serif'}}
          >
            {isLoading ? 'Loading...' : 'Run Report'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg p-3 mb-4 text-sm" style={{ background: '#3A1A1A', border: '1px solid #5A2020', color: '#E85454' }}>
          {error}
        </div>
      )}

      {isLoading ? <SkeletonCard /> : data !== null ? (
        <div style={{background:'#1E1A14',border:'1px solid #3A3428',borderRadius:12,overflow:'hidden',overflowX:'auto',fontFamily:'Inter, sans-serif'}}>{renderTable()}</div>
      ) : (
        <div style={{textAlign:'center',paddingTop:48,paddingBottom:48,color:'#6B6358',fontSize:14,fontFamily:'Inter, sans-serif'}}>Select filters and click "Run Report"</div>
      )}
    </AdminPage>
  )
}
