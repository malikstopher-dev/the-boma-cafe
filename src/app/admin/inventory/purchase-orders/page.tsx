'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/admin/design-system/PageHeader'
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

export default function PurchaseOrdersPage() {
  const router = useRouter()
  const [pos, setPos] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/inventory/purchase-orders').then(r => r.json()),
      fetch('/api/inventory/suppliers?page_size=50').then(r => r.json()),
    ]).then(([poJson, supJson]) => {
      setPos(poJson.data || [])
      setSuppliers((supJson.data || []).map((s: any) => ({ id: s.id, name: s.name })))
    }).finally(() => setIsLoading(false))
  }, [])

  const filtered = pos.filter(po => {
    if (statusFilter && po.status !== statusFilter) return false
    if (supplierFilter && po.supplier_id !== supplierFilter) return false
    return true
  })

  function supplierName(id: string) {
    return suppliers.find(s => s.id === id)?.name || id.slice(0, 8)
  }

  return (
    <div>
      <PageHeader title="Purchase Orders" description="Manage orders and supplier deliveries" actions={<Link href="/admin/inventory/purchase-orders/new"><Button size="sm">New PO</Button></Link>} />

      <div className="flex flex-wrap gap-3 mb-4">
        <select className="border rounded px-3 py-2 text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="approved">Approved</option>
          <option value="ordered">Ordered</option>
          <option value="partial">Partially Received</option>
          <option value="received">Received</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select className="border rounded px-3 py-2 text-sm" value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)}>
          <option value="">All Suppliers</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {isLoading ? <SkeletonCard /> : filtered.length === 0 ? (
        <EmptyState title="No purchase orders" description="Create your first purchase order" />
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-3 font-medium">Created</th>
                <th className="text-left p-3 font-medium">Supplier</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Expected</th>
                <th className="text-right p-3 font-medium">Items</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(po => (
                <tr key={po.id} className="border-b cursor-pointer hover:bg-gray-50" onClick={() => router.push(`/admin/inventory/purchase-orders/${po.id}`)}>
                  <td className="p-3">{new Date(po.created_at).toLocaleDateString()}</td>
                  <td className="p-3 font-medium">{supplierName(po.supplier_id)}</td>
                  <td className="p-3">
                    <Badge variant={STATUS_VARIANTS[po.status] || 'default'}>{po.status}</Badge>
                  </td>
                  <td className="p-3 text-gray-500">
                    {po.expected_at ? new Date(po.expected_at).toLocaleDateString() : '—'}
                    {po.expected_at && po.expected_at < new Date().toISOString().slice(0, 10) && ['ordered', 'partial'].includes(po.status) && (
                      <span className="ml-2 text-red-500 text-xs">OVERDUE</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {po.inventory_purchase_order_items?.length ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
