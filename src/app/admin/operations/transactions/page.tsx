'use client'

import { useState, useEffect, useCallback } from 'react'
import AdminPage from '@/components/admin/design-system/AdminPage'
import DataTable from '@/components/admin/design-system/DataTable'
import type { Column } from '@/components/admin/design-system/DataTable'
import FilterBar from '@/components/admin/design-system/FilterBar'
import Button from '@/components/admin/design-system/Button'
import { Select } from '@/components/admin/design-system/Input'
import Badge from '@/components/admin/design-system/Badge'
import EmptyState from '@/components/admin/design-system/EmptyState'

type Transaction = {
  id: string
  product_id: string
  location_id: string
  transaction_type: string
  quantity: number
  unit_cost: number | null
  cost_centre_id: string | null
  reason_type: string | null
  reason_notes: string | null
  manager_note: string | null
  performed_by: string | null
  notes: string | null
  created_at: string
}

type Product = { id: string; name: string }
type CostCentre = { id: string; name: string }
type Location = { id: string; name: string }

const TYPE_LABELS: Record<string, string> = {
  purchase: 'Purchase',
  sale: 'Sale',
  sale_bottle: 'Bottle Sale',
  opening: 'Opening Stock',
  adjustment: 'Adjustment',
  breakage: 'Breakage',
  spillage: 'Spillage',
  waste: 'Waste',
  comp: 'Comp',
  staff: 'Staff',
  transfer_in: 'Transfer In',
  transfer_out: 'Transfer Out',
  return: 'Return',
  production: 'Production',
  physical_count: 'Stock Count',
  expiry_loss: 'Expired',
  theft: 'Theft',
  donation: 'Donation',
}

const REASON_LABELS: Record<string, string> = {
  SALE: 'Sale',
  BOOKING: 'Booking',
  BREAKAGE: 'Breakage',
  WASTE: 'Waste',
  STAFF_MEAL: 'Staff Meal',
  PROMOTION: 'Promotion',
  EXPIRED: 'Expired',
  THEFT: 'Theft',
  DONATION: 'Donation',
  COMP: 'Comp',
  TRANSFER: 'Transfer',
  ADJUSTMENT: 'Adjustment',
  RETURN: 'Return',
  OPENING: 'Opening',
  CLOSING: 'Closing',
  PRODUCTION: 'Production',
  SPILLAGE: 'Spillage',
  DELIVERY: 'Delivery',
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [products, setProducts] = useState<Record<string, string>>({})
  const [costCentres, setCostCentres] = useState<Record<string, string>>({})
  const [locations, setLocations] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const loadNameMaps = useCallback(async () => {
    try {
      const [p, c, l] = await Promise.all([
        fetch('/api/inventory/products?location_id=main&page_size=500').then(r => r.json()),
        fetch('/api/inventory/cost-centres').then(r => r.json()),
        fetch('/api/inventory/locations').then(r => r.json()),
      ])
      const pmap: Record<string, string> = {}
      ;(p.data || []).forEach((x: Product) => { pmap[x.id] = x.name })
      const cmap: Record<string, string> = {}
      ;(c.data || []).forEach((x: CostCentre) => { cmap[x.id] = x.name })
      const lmap: Record<string, string> = {}
      ;(l.data || []).forEach((x: Location) => { lmap[x.id] = x.name })
      setProducts(pmap)
      setCostCentres(cmap)
      setLocations(lmap)
    } catch {
      // name maps are best-effort
    }
  }, [])

  useEffect(() => { loadNameMaps() }, [])

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (typeFilter) params.set('type', typeFilter)
      if (dateFrom) params.set('from', dateFrom)
      if (dateTo) params.set('to', dateTo)
      params.set('page_size', '100')

      const res = await fetch(`/api/inventory/transactions?${params}`)
      const json = await res.json()
      setTransactions(json.data || [])
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [typeFilter, dateFrom, dateTo])

  useEffect(() => { fetchTransactions() }, [fetchTransactions])

  const typeBadge = (type: string) => {
    const variants: Record<string, 'success' | 'danger' | 'warning' | 'info' | 'default'> = {
      purchase: 'success',
      sale: 'danger',
      sale_bottle: 'danger',
      opening: 'info',
      adjustment: 'warning',
      breakage: 'danger',
      spillage: 'danger',
      waste: 'danger',
      comp: 'warning',
      staff: 'warning',
      transfer_in: 'info',
      transfer_out: 'info',
      return: 'success',
      production: 'info',
      physical_count: 'warning',
    }
    return <Badge variant={variants[type] || 'default'}>{TYPE_LABELS[type] || type.replace('_', ' ')}</Badge>
  }

  const columns: Column<Transaction>[] = [
    {
      key: 'created_at',
      header: 'When',
      sortable: true,
      cell: tx => (
        <span style={{ fontSize: 12, color: '#F0EBE3' }}>{new Date(tx.created_at).toLocaleString('en-ZA')}</span>
      ),
    },
    {
      key: 'product_id',
      header: 'Product',
      cell: tx => (
        <span style={{ color: '#F0EBE3', fontWeight: 500 }}>
          {products[tx.product_id] || tx.product_id.substring(0, 8)}
        </span>
      ),
    },
    {
      key: 'transaction_type',
      header: 'Type',
      cell: tx => typeBadge(tx.transaction_type),
    },
    {
      key: 'quantity',
      header: 'Stock Change',
      sortable: true,
      className: 'font-medium',
      cell: tx => (
        <span style={{ color: tx.quantity < 0 ? '#E85454' : '#4CAF50', fontWeight: 600 }}>
          {tx.quantity > 0 ? '+' : ''}{tx.quantity}
        </span>
      ),
    },
    {
      key: 'reason_type',
      header: 'Reason',
      cell: tx => (
        <span style={{ fontSize: 12, color: '#A09888' }}>
          {REASON_LABELS[tx.reason_type || ''] || tx.reason_type || '—'}
        </span>
      ),
    },
    {
      key: 'cost_centre_id',
      header: 'Cost Centre',
      cell: tx => (
        <span style={{ fontSize: 12, color: '#8A8694' }}>
          {(tx.cost_centre_id && costCentres[tx.cost_centre_id]) || '—'}
        </span>
      ),
    },
    {
      key: 'location_id',
      header: 'Location',
      cell: tx => (
        <span style={{ fontSize: 12, color: '#8A8694' }}>{locations[tx.location_id] || '—'}</span>
      ),
    },
    {
      key: 'performed_by',
      header: 'Who',
      cell: tx => (
        <span style={{ fontSize: 12, color: '#A09888' }}>{tx.performed_by || '—'}</span>
      ),
    },
    {
      key: 'notes',
      header: 'Notes',
      cell: tx => {
        const note = tx.manager_note || tx.reason_notes || tx.notes
        return (
          <span style={{ fontSize: 12, color: '#6B6358' }}>{note || '—'}</span>
        )
      },
    },
  ]

  return (
    <AdminPage
      title="Audit Trail"
      description="Every stock movement — who changed it, why, and by how much"
      filters={
        <FilterBar>
          <Select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="w-48"
            options={[
              { value: '', label: 'All Movements' },
              ...Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label })),
            ]}
          />
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            style={{padding:'6px 12px',border:'1px solid #3A3428',borderRadius:8,fontSize:14,background:'#2A261E',color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}
          />
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            style={{padding:'6px 12px',border:'1px solid #3A3428',borderRadius:8,fontSize:14,background:'#2A261E',color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}
          />
          <Button onClick={() => { loadNameMaps(); fetchTransactions() }} variant="secondary" size="sm">Filter</Button>
        </FilterBar>
      }
    >
      <DataTable<Transaction>
        columns={columns}
        data={transactions}
        keyField="id"
        isLoading={isLoading}
        emptyState={
          <EmptyState title="No movements found" description="Try adjusting your filters" />
        }
      />
    </AdminPage>
  )
}