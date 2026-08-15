'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Button from '@/components/admin/design-system/Button'
import Badge from '@/components/admin/design-system/Badge'
import { SkeletonCard } from '@/components/admin/design-system/Skeleton'
import EmptyState from '@/components/admin/design-system/EmptyState'

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'default' | 'danger'> = {
  draft: 'default',
  approved: 'success',
  ordered: 'warning',
  partial: 'warning',
  received: 'success',
  cancelled: 'danger',
}

export default function PurchaseOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [po, setPo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [receiving, setReceiving] = useState(false)
  const [receiveForm, setReceiveForm] = useState<Record<string, { qty: string; cost: string }>>({})
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [costCentres, setCostCentres] = useState<{ id: string; name: string }[]>([])
  const [costCentreId, setCostCentreId] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetch('/api/inventory/cost-centres')
      .then(r => r.json())
      .then(json => {
        if (json.data) setCostCentres(json.data)
      })
      .catch(() => { /* selector simply stays empty */ })
  }, [])

  function load() {
    const id = params?.id as string
    if (!id) return
    setIsLoading(true)
    fetch(`/api/inventory/purchase-orders/${id}`)
      .then(r => r.json())
      .then(json => {
        if (json.error) setError(json.error.message)
        else {
          setPo(json.data)
          const form: Record<string, { qty: string; cost: string }> = {}
          for (const item of json.data.inventory_purchase_order_items ?? []) {
            const outstanding = Number(item.quantity_ordered) - Number(item.quantity_received ?? 0)
            form[item.id] = {
              qty: outstanding > 0 ? outstanding.toString() : '0',
              cost: item.unit_cost?.toString() ?? '',
            }
          }
          setReceiveForm(form)
        }
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => { load() }, [params?.id])

  async function handleAction(action: string) {
    const id = params?.id as string
    setActionLoading(true)
    try {
      const res = await fetch(`/api/inventory/purchase-orders/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.ok) {
        load()
        setReceiving(false)
      } else {
        const err = await res.json()
        alert(err.error?.message || `Failed to ${action}`)
      }
    } finally {
      setActionLoading(false)
    }
  }

  async function handleReceive() {
    const id = params?.id as string
    setActionLoading(true)
    try {
      const items = Object.entries(receiveForm)
        .filter(([_, v]) => Number(v.qty) > 0)
        .map(([poItemId, v]) => {
          const item = po.inventory_purchase_order_items.find((i: any) => i.id === poItemId)
          return {
            po_item_id: poItemId,
            product_id: item.product_id,
            quantity_received: Number(v.qty),
            unit_cost: v.cost ? Number(v.cost) : null,
          }
        })

      if (items.length === 0) {
        alert('Enter at least one item quantity')
        setActionLoading(false)
        return
      }

      const res = await fetch(`/api/inventory/purchase-orders/${id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          invoice_number: invoiceNumber || null,
          cost_centre_id: costCentreId || null,
        }),
      })
      if (res.ok) {
        load()
        setReceiving(false)
        setInvoiceNumber('')
      } else {
        const err = await res.json()
        alert(err.error?.message || 'Receive failed')
      }
    } finally {
      setActionLoading(false)
    }
  }

  if (isLoading) return <AdminPage title="Purchase Order"><SkeletonCard /></AdminPage>
  if (error || !po) return <AdminPage title="Purchase Order"><EmptyState title="Not found" description={error || ''} /></AdminPage>

  const isDraft = po.status === 'draft'
  const isApproved = po.status === 'approved'
  const isOrderedOrPartial = ['ordered', 'partial'].includes(po.status)
  const canReceive = isOrderedOrPartial

  const items = po.inventory_purchase_order_items ?? []
  const receipts = po.receipts ?? []
  const totalOrdered = items.reduce((s: number, i: any) => s + Number(i.quantity_ordered), 0)
  const totalReceived = items.reduce((s: number, i: any) => s + Number(i.quantity_received ?? 0), 0)

  const pageActions = (
    <>
      <Badge variant={STATUS_VARIANTS[po.status] || 'default'}>{po.status.replace('_', ' ')}</Badge>
      {isDraft && (
        <>
          <Button onClick={() => handleAction('approve')} disabled={actionLoading} size="sm">Approve</Button>
          <Button onClick={() => handleAction('cancel')} disabled={actionLoading} variant="danger" size="sm">Cancel</Button>
        </>
      )}
      {isApproved && (
        <>
          <Button onClick={() => handleAction('order')} disabled={actionLoading} size="sm">Mark Ordered</Button>
          <Button onClick={() => handleAction('cancel')} disabled={actionLoading} variant="danger" size="sm">Cancel</Button>
        </>
      )}
      {canReceive && (
        <>
          <Button onClick={() => setReceiving(!receiving)} variant="secondary" size="sm">{receiving ? 'Cancel' : 'Receive Items'}</Button>
          <Button onClick={() => handleAction('cancel')} disabled={actionLoading} variant="danger" size="sm">Cancel</Button>
        </>
      )}
      <Link href="/admin/operations/purchase-orders"><Button variant="secondary" size="sm">Back</Button></Link>
    </>
  )

  return (
    <AdminPage title={`PO — ${po.inventory_suppliers?.name ?? 'Unknown Supplier'}`} actions={pageActions}>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <div style={{background:'#1E1A14',borderRadius:8,border:'1px solid #3A3428',padding:12}}>
          <div style={{fontSize:12,color:'#A09888',fontFamily:'Inter, sans-serif'}}>Status</div>
          <div style={{fontWeight:600,textTransform:'capitalize',color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}>{po.status.replace('_', ' ')}</div>
        </div>
        <div style={{background:'#1E1A14',borderRadius:8,border:'1px solid #3A3428',padding:12}}>
          <div style={{fontSize:12,color:'#A09888',fontFamily:'Inter, sans-serif'}}>Ordered</div>
          <div style={{fontWeight:600,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}>{po.ordered_at ? new Date(po.ordered_at).toLocaleDateString() : '—'}</div>
        </div>
        <div style={{background:'#1E1A14',borderRadius:8,border:'1px solid #3A3428',padding:12}}>
          <div style={{fontSize:12,color:'#A09888',fontFamily:'Inter, sans-serif'}}>Expected</div>
          <div style={{fontWeight:600,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}>{po.expected_at ? new Date(po.expected_at).toLocaleDateString() : '—'}</div>
        </div>
        <div style={{background:'#1E1A14',borderRadius:8,border:'1px solid #3A3428',padding:12}}>
          <div style={{fontSize:12,color:'#A09888',fontFamily:'Inter, sans-serif'}}>Quotation</div>
          <div style={{fontWeight:600,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}>{po.quotation_ref || '—'}</div>
        </div>
      </div>

      <div style={{background:'#1E1A14',borderRadius:8,border:'1px solid #3A3428',overflow:'hidden',marginBottom:24}}>
        <div style={{padding:'12px 16px',borderBottom:'1px solid #3A3428',fontWeight:600,display:'flex',justifyContent:'space-between',color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}>
          <span>Line Items ({totalOrdered.toFixed(0)} ordered, {totalReceived.toFixed(0)} received)</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{borderBottom:'1px solid #3A3428',background:'#242018'}}>
              <th style={{textAlign:'left',padding:8,color:'#A09888',fontWeight:500,fontFamily:'Inter, sans-serif'}}>Product</th>
              <th style={{textAlign:'right',padding:8,color:'#A09888',fontWeight:500,fontFamily:'Inter, sans-serif'}}>Ordered</th>
              <th style={{textAlign:'right',padding:8,color:'#A09888',fontWeight:500,fontFamily:'Inter, sans-serif'}}>Received</th>
              <th style={{textAlign:'right',padding:8,color:'#A09888',fontWeight:500,fontFamily:'Inter, sans-serif'}}>Outstanding</th>
              <th style={{textAlign:'right',padding:8,color:'#A09888',fontWeight:500,fontFamily:'Inter, sans-serif'}}>Unit Cost</th>
              <th style={{textAlign:'left',padding:8,color:'#A09888',fontWeight:500,fontFamily:'Inter, sans-serif'}}>Location</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any) => {
              const outstanding = Number(item.quantity_ordered) - Number(item.quantity_received ?? 0)
              return (
                <tr key={item.id} style={{borderBottom:'1px solid #3A3428'}}>
                  <td style={{padding:8,fontWeight:500,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}>{item.inventory_products?.name || item.product_id}</td>
                  <td style={{padding:8,textAlign:'right',color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}>{Number(item.quantity_ordered).toFixed(2)}</td>
                  <td style={{padding:8,textAlign:'right',color:'#4CAF50',fontFamily:'Inter, sans-serif'}}>{Number(item.quantity_received ?? 0).toFixed(2)}</td>
                  <td style={{padding:8,textAlign:'right',fontFamily:'monospace',color:outstanding > 0 ? '#FF9800' : '#6B6358'}}>
                    {outstanding > 0 ? outstanding.toFixed(2) : '0'}
                  </td>
                  <td style={{padding:8,textAlign:'right',color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}>{item.unit_cost ? `R${Number(item.unit_cost).toFixed(2)}` : '—'}</td>
                  <td style={{padding:8,color:'#A09888',fontFamily:'Inter, sans-serif'}}>{item.location_id?.slice(0, 8) || '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {receiving && canReceive && (
        <div style={{background:'#1E1A14',borderRadius:8,border:'1px solid #3A3428',padding:16,marginBottom:24}}>
          <h3 style={{fontWeight:600,marginBottom:12,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}>Receive Items</h3>
          <div style={{marginBottom:12}}>
            <label style={{fontSize:12,fontWeight:500,color:'#A09888',display:'block',marginBottom:4,fontFamily:'Inter, sans-serif'}}>Invoice Number</label>
            <input style={{background:'#2A261E',border:'1px solid #3A3428',borderRadius:6,padding:'6px 12px',fontSize:14,width:256,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}} placeholder="Optional" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
          </div>

          <div style={{marginBottom:12}}>
            <label style={{fontSize:12,fontWeight:500,color:'#A09888',display:'block',marginBottom:4,fontFamily:'Inter, sans-serif'}}>Cost Centre</label>
            <select
              style={{background:'#2A261E',border:'1px solid #3A3428',borderRadius:6,padding:'6px 12px',fontSize:14,width:256,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}
              value={costCentreId}
              onChange={e => setCostCentreId(e.target.value)}
            >
              <option value="">Auto — use receiving location</option>
              {costCentres.map(cc => (
                <option key={cc.id} value={cc.id}>{cc.name}</option>
              ))}
            </select>
            <p style={{fontSize:12,color:'#6B6358',marginTop:4,fontFamily:'Inter, sans-serif'}}>
              Auto uses the cost centre configured on each item's location. Override only if this delivery is charged to a different centre.
            </p>
          </div>

          {items.filter((i: any) => Number(i.quantity_ordered) - Number(i.quantity_received ?? 0) > 0).map((item: any) => {
            const outstanding = Number(item.quantity_ordered) - Number(item.quantity_received ?? 0)
            return (
              <div key={item.id} className="flex gap-3 items-end mb-2 p-2" style={{border:'1px solid #3A3428',borderRadius:6}}>
                <div className="flex-1">
                  <div style={{fontSize:14,fontWeight:500,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}>{item.inventory_products?.name || item.product_id}</div>
                  <div style={{fontSize:12,color:'#A09888',fontFamily:'Inter, sans-serif'}}>{outstanding.toFixed(2)} outstanding</div>
                </div>
                <div className="w-20">
                  <label style={{fontSize:12,color:'#A09888',display:'block',marginBottom:4,fontFamily:'Inter, sans-serif'}}>Receiving</label>
                  <input style={{background:'#2A261E',border:'1px solid #3A3428',borderRadius:6,padding:'6px 12px',fontSize:14,width:'100%',color:'#F0EBE3',fontFamily:'Inter, sans-serif'}} type="number" min="0" step="0.01" value={receiveForm[item.id]?.qty ?? ''} onChange={e => setReceiveForm(f => ({ ...f, [item.id]: { ...f[item.id], qty: e.target.value } }))} />
                </div>
                <div className="w-24">
                  <label style={{fontSize:12,color:'#A09888',display:'block',marginBottom:4,fontFamily:'Inter, sans-serif'}}>Unit Cost</label>
                  <input style={{background:'#2A261E',border:'1px solid #3A3428',borderRadius:6,padding:'6px 12px',fontSize:14,width:'100%',color:'#F0EBE3',fontFamily:'Inter, sans-serif'}} type="number" min="0" step="0.01" placeholder="R" value={receiveForm[item.id]?.cost ?? ''} onChange={e => setReceiveForm(f => ({ ...f, [item.id]: { ...f[item.id], cost: e.target.value } }))} />
                </div>
              </div>
            )
          })}

          <Button onClick={handleReceive} disabled={actionLoading} size="lg">
            {actionLoading ? 'Receiving...' : 'Receive & Update Stock'}
          </Button>
          <p style={{fontSize:12,color:'#6B6358',marginTop:8,fontFamily:'Inter, sans-serif'}}>
            This will create inventory transactions (type: purchase) and update stock balances automatically.
          </p>
        </div>
      )}

      {receipts.length > 0 && (
        <div style={{background:'#1E1A14',borderRadius:8,border:'1px solid #3A3428',overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid #3A3428',fontWeight:600,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}>Receiving History ({receipts.length})</div>
          {receipts.map((receipt: any) => (
            <div key={receipt.id} style={{borderBottom:'1px solid #3A3428',padding:12}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:14,marginBottom:4}}>
                <span style={{fontWeight:500,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}>{new Date(receipt.received_at).toLocaleString()}</span>
                {receipt.received_by_admin_name && <span style={{color:'#A09888',fontFamily:'Inter, sans-serif'}}>Received by: {receipt.received_by_admin_name}</span>}
                {receipt.invoice_number && <span style={{color:'#A09888',fontFamily:'Inter, sans-serif'}}>Invoice: {receipt.invoice_number}</span>}
              </div>
              {(receipt.inventory_po_receipt_items ?? []).length > 0 && (
                <table className="w-full text-xs mt-1">
                  <thead>
                    <tr style={{borderBottom:'1px solid #3A3428',color:'#A09888'}}>
                      <th style={{textAlign:'left',padding:4,fontWeight:500,fontFamily:'Inter, sans-serif'}}>Product</th>
                      <th style={{textAlign:'right',padding:4,fontWeight:500,fontFamily:'Inter, sans-serif'}}>Qty</th>
                      <th style={{textAlign:'right',padding:4,fontWeight:500,fontFamily:'Inter, sans-serif'}}>Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(receipt.inventory_po_receipt_items ?? []).map((ri: any) => (
                      <tr key={ri.id}>
                        <td className="p-1">{ri.inventory_products?.name || ri.product_id}</td>
                        <td className="p-1 text-right">{Number(ri.quantity_received).toFixed(2)}</td>
                        <td className="p-1 text-right">{ri.unit_cost ? `R${Number(ri.unit_cost).toFixed(2)}` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminPage>
  )
}