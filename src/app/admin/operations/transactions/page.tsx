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
  performed_by: string | null
  notes: string | null
  created_at: string
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

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
    }
    return <Badge variant={variants[type] || 'default'}>{type.replace('_', ' ')}</Badge>
  }

  const columns: Column<Transaction>[] = [
    {
      key: 'created_at',
      header: 'Date',
      sortable: true,
      cell: tx => (
        <span className="text-xs text-gray-500">{new Date(tx.created_at).toLocaleString()}</span>
      ),
    },
    {
      key: 'transaction_type',
      header: 'Type',
      cell: tx => typeBadge(tx.transaction_type),
    },
    {
      key: 'product_id',
      header: 'Product',
      cell: tx => (
        <span className="text-xs font-mono">{tx.product_id.substring(0, 8)}…</span>
      ),
    },
    {
      key: 'quantity',
      header: 'Quantity',
      sortable: true,
      className: 'font-medium',
      cell: tx => (
        <span className={tx.quantity < 0 ? 'text-red-600' : 'text-green-600'}>
          {tx.quantity > 0 ? '+' : ''}{tx.quantity}
        </span>
      ),
    },
    {
      key: 'unit_cost',
      header: 'Unit Cost',
      cell: tx => (
        <span>{tx.unit_cost ? `R${tx.unit_cost}` : '—'}</span>
      ),
    },
    {
      key: 'notes',
      header: 'Notes',
      cell: tx => (
        <span className="text-xs text-gray-400">{tx.notes || '—'}</span>
      ),
    },
  ]

  return (
    <AdminPage
      title="Transactions"
      description="Inventory transaction ledger"
      filters={
        <FilterBar>
          <Select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="w-48"
            options={[
              { value: '', label: 'All Types' },
              { value: 'purchase', label: 'Purchase' },
              { value: 'sale', label: 'Sale' },
              { value: 'breakage', label: 'Breakage' },
              { value: 'spillage', label: 'Spillage' },
              { value: 'waste', label: 'Waste' },
              { value: 'adjustment', label: 'Adjustment' },
              { value: 'transfer_in', label: 'Transfer In' },
              { value: 'transfer_out', label: 'Transfer Out' },
              { value: 'opening', label: 'Opening Stock' },
              { value: 'comp', label: 'Comp' },
              { value: 'staff', label: 'Staff' },
              { value: 'return', label: 'Return' },
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
          <Button onClick={fetchTransactions} variant="secondary" size="sm">Filter</Button>
        </FilterBar>
      }
    >
      <DataTable<Transaction>
        columns={columns}
        data={transactions}
        keyField="id"
        isLoading={isLoading}
        emptyState={
          <EmptyState title="No transactions found" description="Try adjusting your filters" />
        }
      />
    </AdminPage>
  )
}
