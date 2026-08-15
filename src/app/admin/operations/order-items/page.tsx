'use client'

import { useState, useEffect, useCallback } from 'react'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Button from '@/components/admin/design-system/Button'
import Badge from '@/components/admin/design-system/Badge'

type OrderSummary = {
  id: string
  order_ref: string
  customer_name: string
  total: number
  status: string
  created_at: string
}

type OrderLine = {
  id: string
  item_name: string
  quantity: number
  unit_price: number
  base_quantity: number | null
  product_id: string | null
  pour_size_ml: number | null
  transaction_id: string | null
  deducted_at: string | null
  recipe_id: string | null
  inventory_products?: { id: string; name: string; sku: string | null } | null
}

type OrderDetail = {
  order_id: string
  status: string
  items: OrderLine[]
}

export default function OrderItemsPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [search, setSearch] = useState('')
  const [selOrderId, setSelOrderId] = useState('')
  const [detail, setDetail] = useState<OrderDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/supabase/orders?limit=50')
      .then(r => r.json())
      .then(json => setOrders(Array.isArray(json) ? json : json.orders ?? []))
      .catch(() => {})
  }, [])

  const loadDetail = useCallback(async (orderId: string) => {
    setIsLoading(true)
    setMessage('')
    try {
      const res = await fetch(`/api/inventory/order-items?order_id=${orderId}`)
      const json = await res.json()
      setDetail(json.data ?? null)
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selOrderId) loadDetail(selOrderId)
    else setDetail(null)
  }, [selOrderId, loadDetail])

  async function post(path: string, label: string) {
    setBusy(true)
    setMessage('')
    try {
      const res = await fetch(`/api/inventory/order-items/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: selOrderId }),
      })
      const json = await res.json()
      if (json.error) {
        setMessage(`Error: ${json.error.message}`)
      } else {
        setMessage(`${label} complete (${path === 'deduct' ? `${json.data?.deducted ?? 0} deducted, ${json.data?.skipped ?? 0} skipped` : `${json.data?.items?.length ?? 0} items synced`})`)
        await loadDetail(selOrderId)
      }
    } catch {
      setMessage(`Failed: ${label.toLowerCase()}`)
    } finally {
      setBusy(false)
    }
  }

  const filteredOrders = search
    ? orders.filter(o =>
        o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
        o.order_ref?.toLowerCase().includes(search.toLowerCase()),
      )
    : orders

  const matched = detail?.items.filter(i => i.product_id) ?? []
  const unmatched = detail?.items.filter(i => !i.product_id) ?? []
  const deducted = matched.filter(i => i.transaction_id || i.deducted_at)

  return (
    <AdminPage
      title="Order Items"
      description="Normalize order line items and auto-deduct stock when orders complete"
    >
      <div style={{padding:24,fontFamily:'Inter, sans-serif'}}>
        <div className="grid grid-cols-1 lg:grid-cols-3" style={{gap:24}}>
          <div className="lg:col-span-1">
            <h3 style={{fontSize:13,fontWeight:600,color:'#A09888',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:12,fontFamily:'Inter, sans-serif'}}>Orders</h3>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search customer / order ref..."
              style={{width:'100%',background:'#2A261E',border:'1px solid #3A3428',borderRadius:8,padding:'8px 12px',fontSize:14,color:'#F0EBE3',marginBottom:12,fontFamily:'Inter, sans-serif',outline:'none'}}
            />
            <div className="max-h-[70vh] overflow-y-auto" style={{display:'flex',flexDirection:'column',gap:8}}>
              {filteredOrders.map(o => (
                <button
                  key={o.id}
                  onClick={() => setSelOrderId(o.id)}
                  style={{
                    width:'100%',textAlign:'left',padding:12,borderRadius:8,
                    background: selOrderId === o.id ? '#1E1A14' : '#1E1A14',
                    border: selOrderId === o.id ? '1px solid #C8A04E' : '1px solid #3A3428',
                    color:'#F0EBE3',cursor:'pointer',fontFamily:'Inter, sans-serif',
                    transition:'border-color 0.15s'
                  }}
                >
                  <div style={{fontWeight:500,fontSize:14,color:'#F0EBE3'}}>{o.customer_name || 'Unknown'}</div>
                  <div style={{fontSize:12,color:'#A09888',display:'flex',justifyContent:'space-between',marginTop:4}}>
                    <span>{o.order_ref}</span>
                    <span>R{o.total?.toFixed?.(2) ?? o.total}</span>
                  </div>
                  <div style={{fontSize:12,color:'#6B6358',marginTop:4}}>{o.status} · {new Date(o.created_at).toLocaleDateString('en-ZA')}</div>
                </button>
              ))}
              {filteredOrders.length === 0 && (
                <p style={{color:'#6B6358',fontSize:14,paddingTop:32,paddingBottom:32,textAlign:'center',fontFamily:'Inter, sans-serif'}}>No orders found</p>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            {!selOrderId ? (
              <p style={{color:'#6B6358',paddingTop:48,paddingBottom:48,textAlign:'center',fontFamily:'Inter, sans-serif'}}>Select an order to view its items</p>
            ) : isLoading ? (
              <p style={{color:'#A09888',paddingTop:48,paddingBottom:48,textAlign:'center',fontFamily:'Inter, sans-serif'}}>Loading...</p>
            ) : detail ? (
              <div style={{background:'#1E1A14',border:'1px solid #3A3428',borderRadius:12,padding:20,fontFamily:'Inter, sans-serif'}}>
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
                  <h3 style={{fontSize:16,fontWeight:600,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}>Order Items</h3>
                  <Badge variant={detail.status === 'completed' ? 'success' : 'info'}>{detail.status}</Badge>
                  <span style={{fontSize:13,color:'#A09888',fontFamily:'Inter, sans-serif'}}>
                    {matched.length} matched · {unmatched.length} unmatched · {deducted.length} deducted
                  </span>
                </div>

                {message && <div style={{marginBottom:16,fontSize:14,color:'#A09888',background:'rgba(200,160,78,0.08)',border:'1px solid #3A3428',borderRadius:8,padding:12,fontFamily:'Inter, sans-serif'}}>{message}</div>}

                <div style={{display:'flex',gap:8,marginBottom:16}}>
                  <Button size="sm" onClick={() => post('sync', 'Sync')} disabled={busy}>
                    Sync Items
                  </Button>
                  <Button size="sm" variant="primary" onClick={() => post('deduct', 'Deduct')} disabled={busy || matched.length === 0}>
                    Deduct Stock (SALE)
                  </Button>
                </div>

                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {detail.items.map(item => (
                    <div key={item.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',background:'#242018',border:'1px solid #3A3428',borderRadius:8,fontFamily:'Inter, sans-serif'}}>
                      <span style={{fontWeight:500,flex:1,color:'#F0EBE3',fontSize:14}}>
                        {item.quantity}x {item.item_name}
                      </span>
                      {item.product_id ? (
                        <Badge variant="success">
                          {item.inventory_products?.name ?? 'matched'}
                        </Badge>
                      ) : (
                        <Badge variant="danger">unmatched</Badge>
                      )}
                      {item.product_id && (
                        <span style={{fontSize:12,color:'#A09888'}}>
                          base {item.base_quantity ?? '—'}{item.pour_size_ml ? ` (${item.pour_size_ml}ml pour)` : ''}{item.recipe_id ? ' · recipe' : ''}
                        </span>
                      )}
                      {item.transaction_id || item.deducted_at ? (
                        <span style={{fontSize:12,color:'#4CAF50'}}>✓ deducted</span>
                      ) : item.product_id ? (
                        <span style={{fontSize:12,color:'#C8A04E'}}>pending</span>
                      ) : null}
                    </div>
                  ))}
                  {detail.items.length === 0 && (
                    <p style={{color:'#6B6358',fontSize:14,paddingTop:32,paddingBottom:32,textAlign:'center',fontFamily:'Inter, sans-serif'}}>
                      No normalized items yet — click "Sync Items" to parse the order
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p style={{color:'#6B6358',paddingTop:48,paddingBottom:48,textAlign:'center',fontFamily:'Inter, sans-serif'}}>Order not found</p>
            )}
          </div>
        </div>
      </div>
    </AdminPage>
  )
}
