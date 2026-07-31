'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AdminPage from '@/components/admin/design-system/AdminPage'
import DataTable from '@/components/admin/design-system/DataTable'
import type { Column } from '@/components/admin/design-system/DataTable'
import FilterBar from '@/components/admin/design-system/FilterBar'
import Button from '@/components/admin/design-system/Button'
import Badge from '@/components/admin/design-system/Badge'
import EmptyState from '@/components/admin/design-system/EmptyState'

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'default' | 'danger'> = {
  draft: 'default',
  approved: 'success',
  ordered: 'warning',
  partial: 'warning',
  received: 'success',
  cancelled: 'danger',
}

type PurchaseOrder = {
  id: string
  supplier_id: string
  status: string
  expected_at: string | null
  created_at: string
  inventory_purchase_order_items?: unknown[]
}

export default function PurchaseOrdersPage() {
  const router = useRouter()
  const [pos, setPos] = useState<PurchaseOrder[]>([])
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

  const today = new Date().toISOString().slice(0, 10)

  const columns: Column<PurchaseOrder>[] = [
    {
      key: 'created_at',
      header: 'Created',
      sortable: true,
      cell: po => (
        <span>{new Date(po.created_at).toLocaleDateString()}</span>
      ),
    },
    {
      key: 'supplier_id',
      header: 'Supplier',
      cell: po => (
        <span className="font-medium">{supplierName(po.supplier_id)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: po => (
        <Badge variant={STATUS_VARIANTS[po.status] || 'default'}>{po.status}</Badge>
      ),
    },
    {
      key: 'expected_at',
      header: 'Expected',
      cell: po => (
        <span className="text-gray-500">
          {po.expected_at ? new Date(po.expected_at).toLocaleDateString() : '—'}
          {po.expected_at && po.expected_at < today && ['ordered', 'partial'].includes(po.status) && (
            <span className="ml-2 text-red-500 text-xs font-semibold">OVERDUE</span>
          )}
        </span>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      className: 'text-right',
      cell: po => (
        <span>{po.inventory_purchase_order_items?.length ?? '—'}</span>
      ),
    },
  ]

  return (
    <AdminPage
      title="Purchase Orders"
      description="Manage orders and supplier deliveries"
      actions={<Link href="/admin/operations/purchase-orders/new"><Button size="sm">New PO</Button></Link>}
      filters={
        <FilterBar>
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
        </FilterBar>
      }
    >
      <DataTable<PurchaseOrder>
        columns={columns}
        data={filtered}
        keyField="id"
        onRowClick={po => router.push(`/admin/operations/purchase-orders/${po.id}`)}
        isLoading={isLoading}
        emptyState={
          <EmptyState title="No purchase orders" description="Create your first purchase order" />
        }
      />
    </AdminPage>
  )
}
