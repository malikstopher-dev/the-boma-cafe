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
        fetch('/api/inventory/products?page_size=500')
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
      <div style={{padding:24,fontFamily:'Inter, sans-serif'}}>
        <div style={{marginBottom:24}}>
          <label style={{display:'block',fontSize:13,fontWeight:600,color:'#A09888',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8}}>Select Product</label>
          <select
            value={selectedProduct}
            onChange={e => setSelectedProduct(e.target.value)}
            style={{
              background:'#2A261E',border:'1px solid #3A3428',borderRadius:8,
              padding:'8px 12px',fontSize:14,color:'#F0EBE3',width:'100%',maxWidth:448,
              outline:'none',fontFamily:'Inter, sans-serif'
            }}
          >
            <option value="">Choose a product...</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {selectedProduct && (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))',gap:16,marginBottom:24}}>
            <div style={{background:'#1E1A14',border:'1px solid #3A3428',borderRadius:12,padding:16}}>
              <p style={{fontSize:13,fontWeight:600,color:'#A09888',textTransform:'uppercase',letterSpacing:'0.05em',margin:0}}>Current Price</p>
              <p style={{fontSize:28,fontWeight:700,color:'#F0EBE3',marginTop:8,margin:0}}>
                {priceHistory.length > 0 ? `R${priceHistory[0].unit_cost.toFixed(2)}` : '—'}
              </p>
            </div>
            <div style={{background:'#1E1A14',border:'1px solid #3A3428',borderRadius:12,padding:16}}>
              <p style={{fontSize:13,fontWeight:600,color:'#A09888',textTransform:'uppercase',letterSpacing:'0.05em',margin:0}}>Price History Entries</p>
              <p style={{fontSize:28,fontWeight:700,color:'#F0EBE3',marginTop:8,margin:0}}>{priceHistory.length}</p>
            </div>
            <div style={{background:'#1E1A14',border:'1px solid #3A3428',borderRadius:12,padding:16}}>
              <p style={{fontSize:13,fontWeight:600,color:'#A09888',textTransform:'uppercase',letterSpacing:'0.05em',margin:0}}>Price Changes</p>
              <p style={{fontSize:28,fontWeight:700,color:'#FBBF24',marginTop:8,margin:0}}>{priceChanges}</p>
            </div>
          </div>
        )}

        {loadingHistory ? (
          <div style={{color:'#A09888',padding:'32px 0',textAlign:'center'}}>Loading price history...</div>
        ) : selectedProduct && priceHistory.length === 0 ? (
          <div style={{color:'#6B6358',padding:'32px 0',textAlign:'center'}}>No price history recorded for {selectedName}</div>
        ) : selectedProduct && (
          <div style={{overflowX:'auto',background:'#1E1A14',border:'1px solid #3A3428',borderRadius:12}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:14}}>
              <thead>
                <tr style={{background:'#242018',borderBottom:'1px solid #3A3428'}}>
                  <th style={{textAlign:'left',padding:'12px 16px',fontSize:11,fontWeight:600,color:'#6B6358',textTransform:'uppercase',letterSpacing:'0.04em'}}>Date</th>
                  <th style={{textAlign:'right',padding:'12px 16px',fontSize:11,fontWeight:600,color:'#6B6358',textTransform:'uppercase',letterSpacing:'0.04em'}}>Unit Cost</th>
                  <th style={{textAlign:'right',padding:'12px 16px',fontSize:11,fontWeight:600,color:'#6B6358',textTransform:'uppercase',letterSpacing:'0.04em'}}>Quantity</th>
                  <th style={{textAlign:'left',padding:'12px 16px',fontSize:11,fontWeight:600,color:'#6B6358',textTransform:'uppercase',letterSpacing:'0.04em'}}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {priceHistory.map((entry, i) => {
                  const prevCost = i < priceHistory.length - 1 ? priceHistory[i + 1].unit_cost : null
                  const change = prevCost !== null ? entry.unit_cost - prevCost : null
                  return (
                    <tr key={entry.id} style={{borderBottom:'1px solid #3A3428',transition:'background 0.15s ease'}}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#2A261E' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                      <td style={{padding:'12px 16px',color:'#A09888'}}>
                        {new Date(entry.effective_date).toLocaleDateString('en-ZA')}
                      </td>
                      <td style={{padding:'12px 16px',textAlign:'right',color:'#F0EBE3',fontWeight:500}}>
                        R{entry.unit_cost.toFixed(2)}
                        {change !== null && change !== 0 && (
                          <span style={{marginLeft:8,fontSize:12,color:change > 0 ? '#F87171' : '#4ADE80'}}>
                            {change > 0 ? '+' : ''}{change.toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td style={{padding:'12px 16px',textAlign:'right',color:'#A09888'}}>
                        {entry.quantity?.toFixed(2) ?? '—'}
                      </td>
                      <td style={{padding:'12px 16px',color:'#6B6358',fontSize:12}}>{entry.notes ?? '—'}</td>
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
