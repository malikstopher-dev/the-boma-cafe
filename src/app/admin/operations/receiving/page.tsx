'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Badge from '@/components/admin/design-system/Badge'
import Button from '@/components/admin/design-system/Button'
import EmptyState from '@/components/admin/design-system/EmptyState'

type PurchaseOrderRow = {
  id: string
  supplier_id: string | null
  status: string
  expected_at: string | null
  created_at: string
  inventory_suppliers?: { name: string } | null
  inventory_purchase_order_items?: { count: number }[]
}

const AWAITING_STATUSES = ['ordered', 'partial']

const statusBadge: Record<string, { variant: 'warning' | 'info' | 'success' | 'danger'; label: string }> = {
  draft: { variant: 'info', label: 'Draft' },
  approved: { variant: 'info', label: 'Approved' },
  ordered: { variant: 'warning', label: 'Awaiting Delivery' },
  partial: { variant: 'warning', label: 'Partially Received' },
  received: { variant: 'success', label: 'Received' },
  cancelled: { variant: 'danger', label: 'Cancelled' },
}

export default function ReceivingPage() {
  const [pos, setPos] = useState<PurchaseOrderRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchPending = useCallback(async () => {
    setIsLoading(true)
    try {
      // Fetch both awaiting statuses server-side — a single uncapped list
      // would silently drop older pending POs once 50 exist.
      const [orderedRes, partialRes] = await Promise.all([
        fetch('/api/inventory/purchase-orders?status=ordered&limit=100'),
        fetch('/api/inventory/purchase-orders?status=partial&limit=100'),
      ])
      const [orderedJson, partialJson] = await Promise.all([orderedRes.json(), partialRes.json()])
      const ordered: PurchaseOrderRow[] = orderedJson.data || []
      const partial: PurchaseOrderRow[] = partialJson.data || []
      setPos([...ordered, ...partial].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchPending() }, [fetchPending])

  return (
    <AdminPage
      title="Goods Receiving"
      description="Deliveries waiting to be received against purchase orders"
      actions={
        <Button onClick={fetchPending} variant="secondary" size="sm">Refresh</Button>
      }
    >
      {isLoading ? (
        <div style={{color:'#A09888',padding:'48px 0',textAlign:'center',fontFamily:'Inter, sans-serif'}}>Loading...</div>
      ) : pos.length === 0 ? (
        <EmptyState
          title="No pending deliveries"
          description="Purchase orders that are ordered or partially received will appear here"
        />
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {pos.map(po => {
            const badge = statusBadge[po.status] ?? { variant: 'info' as const, label: po.status }
            return (
              <Link
                key={po.id}
                href={`/admin/operations/purchase-orders/${po.id}`}
                style={{
                  display:'flex',alignItems:'center',gap:16,padding:'16px 20px',
                  background:'#1E1A14',border:'1px solid #3A3428',borderRadius:12,
                  textDecoration:'none',transition:'background 0.15s ease',fontFamily:'Inter, sans-serif'
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#2A261E' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#1E1A14' }}
              >
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontWeight:600,color:'#F0EBE3',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:14,margin:0}}>
                    PO {po.id.slice(0, 8)}
                    <span style={{color:'#A09888',fontWeight:400}}> — {po.inventory_suppliers?.name ?? 'Unknown supplier'}</span>
                  </p>
                  <p style={{fontSize:12,color:'#A09888',marginTop:4,margin:0}}>
                    {po.inventory_purchase_order_items?.[0]?.count ?? 0} line items
                    {po.expected_at ? ` · expected ${new Date(po.expected_at).toLocaleDateString('en-ZA')}` : ''}
                  </p>
                </div>
                <Badge variant={badge.variant}>{badge.label}</Badge>
                <span style={{color:'#A09888',fontSize:14}}>Receive →</span>
              </Link>
            )
          })}
        </div>
      )}
    </AdminPage>
  )
}
