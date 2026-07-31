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
  const [actionLoading, setActionLoading] = useState(false)

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
        body: JSON.stringify({ items, invoice_number: invoiceNumber || null }),
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
    <AdminPage title={`PO ÔÇö ${po.inventory_suppliers?.name ?? 'Unknown Supplier'}`} actions={pageActions}>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-3">
          <div className="text-xs text-gray-500">Status</div>
          <div className="font-semibold capitalize">{po.status.replace('_', ' ')}</div>
        </div>
        <div className="bg-white rounded-lg border p-3">
          <div className="text-xs text-gray-500">Ordered</div>
          <div className="font-semibold">{po.ordered_at ? new Date(po.ordered_at).toLocaleDateString() : 'ÔÇö'}</div>
        </div>
        <div className="bg-white rounded-lg border p-3">
          <div className="text-xs text-gray-500">Expected</div>
          <div className="font-semibold">{po.expected_at ? new Date(po.expected_at).toLocaleDateString() : 'ÔÇö'}</div>
        </div>
        <div className="bg-white rounded-lg border p-3">
          <div className="text-xs text-gray-500">Quotation</div>
          <div className="font-semibold">{po.quotation_ref || 'ÔÇö'}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden mb-6">
        <div className="px-4 py-3 border-b font-semibold flex justify-between">
          <span>Line Items ({totalOrdered.toFixed(0)} ordered, {totalReceived.toFixed(0)} received)</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left p-2">Product</th>
              <th className="text-right p-2">Ordered</th>
              <th className="text-right p-2">Received</th>
              <th className="text-right p-2">Outstanding</th>
              <th className="text-right p-2">Unit Cost</th>
              <th className="text-left p-2">Location</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any) => {
              const outstanding = Number(item.quantity_ordered) - Number(item.quantity_received ?? 0)
              return (
                <tr key={item.id} className="border-b">
                  <td className="p-2 font-medium">{item.inventory_products?.name || item.product_id}</td>
                  <td className="p-2 text-right">{Number(item.quantity_ordered).toFixed(2)}</td>
                  <td className="p-2 text-right text-green-600">{Number(item.quantity_received ?? 0).toFixed(2)}</td>
                  <td className={`p-2 text-right font-mono ${outstanding > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
                    {outstanding > 0 ? outstanding.toFixed(2) : '0'}
                  </td>
                  <td className="p-2 text-right">{item.unit_cost ? `R${Number(item.unit_cost).toFixed(2)}` : 'ÔÇö'}</td>
                  <td className="p-2 text-gray-500">{item.location_id?.slice(0, 8) || 'ÔÇö'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {receiving && canReceive && (
        <div className="bg-white rounded-lg border p-4 mb-6">
          <h3 className="font-semibold mb-3">Receive Items</h3>
          <div className="mb-3">
            <label className="text-xs font-medium text-gray-600 block mb-1">Invoice Number</label>
            <input className="border rounded px-3 py-2 text-sm w-64" placeholder="Optional" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
          </div>

          {items.filter((i: any) => Number(i.quantity_ordered) - Number(i.quantity_received ?? 0) > 0).map((item: any) => {
            const outstanding = Number(item.quantity_ordered) - Number(item.quantity_received ?? 0)
            return (
              <div key={item.id} className="flex gap-3 items-end mb-2 p-2 border rounded">
                <div className="flex-1">
                  <div className="text-sm font-medium">{item.inventory_products?.name || item.product_id}</div>
                  <div className="text-xs text-gray-500">{outstanding.toFixed(2)} outstanding</div>
                </div>
                <div className="w-20">
                  <label className="text-xs text-gray-500 block mb-1">Receiving</label>
                  <input className="border rounded px-3 py-2 text-sm w-full" type="number" min="0" step="0.01" value={receiveForm[item.id]?.qty ?? ''} onChange={e => setReceiveForm(f => ({ ...f, [item.id]: { ...f[item.id], qty: e.target.value } }))} />
                </div>
                <div className="w-24">
                  <label className="text-xs text-gray-500 block mb-1">Unit Cost</label>
                  <input className="border rounded px-3 py-2 text-sm w-full" type="number" min="0" step="0.01" placeholder="R" value={receiveForm[item.id]?.cost ?? ''} onChange={e => setReceiveForm(f => ({ ...f, [item.id]: { ...f[item.id], cost: e.target.value } }))} />
                </div>
              </div>
            )
          })}

          <Button onClick={handleReceive} disabled={actionLoading} size="lg">
            {actionLoading ? 'Receiving...' : 'Receive & Update Stock'}
          </Button>
          <p className="text-xs text-gray-400 mt-2">
            This will create inventory transactions (type: purchase) and update stock balances automatically.
          </p>
        </div>
      )}

      {receipts.length > 0 && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="px-4 py-3 border-b font-semibold">Receiving History ({receipts.length})</div>
          {receipts.map((receipt: any) => (
            <div key={receipt.id} className="border-b p-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">{new Date(receipt.received_at).toLocaleString()}</span>
                {receipt.invoice_number && <span className="text-gray-500">Invoice: {receipt.invoice_number}</span>}
              </div>
              {(receipt.inventory_po_receipt_items ?? []).length > 0 && (
                <table className="w-full text-xs mt-1">
                  <thead>
                    <tr className="border-b text-gray-500">
                      <th className="text-left p-1">Product</th>
                      <th className="text-right p-1">Qty</th>
                      <th className="text-right p-1">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(receipt.inventory_po_receipt_items ?? []).map((ri: any) => (
                      <tr key={ri.id}>
                        <td className="p-1">{ri.inventory_products?.name || ri.product_id}</td>
                        <td className="p-1 text-right">{Number(ri.quantity_received).toFixed(2)}</td>
                        <td className="p-1 text-right">{ri.unit_cost ? `R${Number(ri.unit_cost).toFixed(2)}` : 'ÔÇö'}</td>
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