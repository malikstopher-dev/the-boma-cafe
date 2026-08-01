'use client'

import { useState, useEffect } from 'react'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Badge from '@/components/admin/design-system/Badge'

type SupplierPerformance = {
  supplier_id: string
  supplier_name: string
  total_pos: number
  received_count: number
  cancelled_count: number
  on_time_count: number
  on_time_rate: number
  avg_lead_time_days: number | null
  open_pos: number
}

export default function SupplierPerformancePage() {
  const [suppliers, setSuppliers] = useState<SupplierPerformance[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/inventory/reports/supplier-performance')
      .then(r => r.json())
      .then(json => setSuppliers(json.data ?? []))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const avgOnTime = suppliers.length > 0
    ? Math.round(suppliers.reduce((s, sp) => s + sp.on_time_rate, 0) / suppliers.length)
    : 0
  const totalOpen = suppliers.reduce((s, sp) => s + sp.open_pos, 0)

  return (
    <AdminPage title="Supplier Performance" description="On-time delivery rates, lead times, and PO history">
      <div style={{padding:24,fontFamily:'Inter, sans-serif'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))',gap:16,marginBottom:24}}>
          <div style={{background:'#1E1A14',border:'1px solid #3A3428',borderRadius:12,padding:16}}>
            <p style={{fontSize:13,fontWeight:600,color:'#A09888',textTransform:'uppercase',letterSpacing:'0.05em',margin:0}}>Avg On-Time Rate</p>
            <p style={{fontSize:28,fontWeight:700,marginTop:8,color:avgOnTime >= 90 ? '#4ADE80' : avgOnTime >= 70 ? '#FBBF24' : '#F87171',margin:0}}>
              {avgOnTime}%
            </p>
          </div>
          <div style={{background:'#1E1A14',border:'1px solid #3A3428',borderRadius:12,padding:16}}>
            <p style={{fontSize:13,fontWeight:600,color:'#A09888',textTransform:'uppercase',letterSpacing:'0.05em',margin:0}}>Active Suppliers</p>
            <p style={{fontSize:28,fontWeight:700,color:'#F0EBE3',marginTop:8,margin:0}}>{suppliers.length}</p>
          </div>
          <div style={{background:'#1E1A14',border:'1px solid #3A3428',borderRadius:12,padding:16}}>
            <p style={{fontSize:13,fontWeight:600,color:'#A09888',textTransform:'uppercase',letterSpacing:'0.05em',margin:0}}>Open POs</p>
            <p style={{fontSize:28,fontWeight:700,color:'#FBBF24',marginTop:8,margin:0}}>{totalOpen}</p>
          </div>
        </div>

        {isLoading ? (
          <div style={{color:'#A09888',padding:'48px 0',textAlign:'center'}}>Loading...</div>
        ) : suppliers.length === 0 ? (
          <div style={{color:'#6B6358',padding:'48px 0',textAlign:'center'}}>No supplier data available</div>
        ) : (
          <div style={{overflowX:'auto',background:'#1E1A14',border:'1px solid #3A3428',borderRadius:12}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:14}}>
              <thead>
                <tr style={{background:'#242018',borderBottom:'1px solid #3A3428'}}>
                  <th style={{textAlign:'left',padding:'12px 16px',fontSize:11,fontWeight:600,color:'#6B6358',textTransform:'uppercase',letterSpacing:'0.04em'}}>Supplier</th>
                  <th style={{textAlign:'right',padding:'12px 16px',fontSize:11,fontWeight:600,color:'#6B6358',textTransform:'uppercase',letterSpacing:'0.04em'}}>Total POs</th>
                  <th style={{textAlign:'right',padding:'12px 16px',fontSize:11,fontWeight:600,color:'#6B6358',textTransform:'uppercase',letterSpacing:'0.04em'}}>Received</th>
                  <th style={{textAlign:'right',padding:'12px 16px',fontSize:11,fontWeight:600,color:'#6B6358',textTransform:'uppercase',letterSpacing:'0.04em'}}>On-Time</th>
                  <th style={{textAlign:'right',padding:'12px 16px',fontSize:11,fontWeight:600,color:'#6B6358',textTransform:'uppercase',letterSpacing:'0.04em'}}>Rate</th>
                  <th style={{textAlign:'right',padding:'12px 16px',fontSize:11,fontWeight:600,color:'#6B6358',textTransform:'uppercase',letterSpacing:'0.04em'}}>Avg Lead (days)</th>
                  <th style={{textAlign:'right',padding:'12px 16px',fontSize:11,fontWeight:600,color:'#6B6358',textTransform:'uppercase',letterSpacing:'0.04em'}}>Open</th>
                  <th style={{textAlign:'right',padding:'12px 16px',fontSize:11,fontWeight:600,color:'#6B6358',textTransform:'uppercase',letterSpacing:'0.04em'}}>Cancelled</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map(sp => (
                  <tr key={sp.supplier_id} style={{borderBottom:'1px solid #3A3428',transition:'background 0.15s ease'}}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#2A261E' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                    <td style={{padding:'12px 16px',color:'#F0EBE3',fontWeight:500}}>{sp.supplier_name}</td>
                    <td style={{padding:'12px 16px',textAlign:'right',color:'#A09888'}}>{sp.total_pos}</td>
                    <td style={{padding:'12px 16px',textAlign:'right',color:'#A09888'}}>{sp.received_count}</td>
                    <td style={{padding:'12px 16px',textAlign:'right',color:'#A09888'}}>{sp.on_time_count}</td>
                    <td style={{padding:'12px 16px',textAlign:'right'}}>
                      <Badge variant={sp.on_time_rate >= 90 ? 'success' : sp.on_time_rate >= 70 ? 'warning' : 'danger'}>
                        {sp.on_time_rate}%
                      </Badge>
                    </td>
                    <td style={{padding:'12px 16px',textAlign:'right',color:'#A09888'}}>{sp.avg_lead_time_days?.toFixed(1) ?? '—'}</td>
                    <td style={{padding:'12px 16px',textAlign:'right'}}>
                      <span style={{color:sp.open_pos > 0 ? '#FBBF24' : '#6B6358'}}>{sp.open_pos}</span>
                    </td>
                    <td style={{padding:'12px 16px',textAlign:'right',color:'#A09888'}}>{sp.cancelled_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminPage>
  )
}
