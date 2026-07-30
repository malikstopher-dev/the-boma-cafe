'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/admin/design-system/PageHeader'
import Button from '@/components/admin/design-system/Button'
import { Select } from '@/components/admin/design-system/Input'
import Badge from '@/components/admin/design-system/Badge'
import { SkeletonCard } from '@/components/admin/design-system/Skeleton'
import EmptyState from '@/components/admin/design-system/EmptyState'

interface Transaction {
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

  return (
    <div>
      <PageHeader title="Transactions" description="Inventory transaction ledger" />

      <div className="flex gap-3 mb-4 flex-wrap">
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
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
        <Button onClick={fetchTransactions} variant="secondary" size="sm">Filter</Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : transactions.length === 0 ? (
        <EmptyState title="No transactions found" description="Try adjusting your filters" />
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-left p-3 font-medium">Product</th>
                  <th className="text-left p-3 font-medium">Quantity</th>
                  <th className="text-left p-3 font-medium">Unit Cost</th>
                  <th className="text-left p-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-xs text-gray-500">{new Date(tx.created_at).toLocaleString()}</td>
                    <td className="p-3">{typeBadge(tx.transaction_type)}</td>
                    <td className="p-3 text-xs font-mono">{tx.product_id.substring(0, 8)}…</td>
                    <td className={`p-3 font-medium ${tx.quantity < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {tx.quantity > 0 ? '+' : ''}{tx.quantity}
                    </td>
                    <td className="p-3">{tx.unit_cost ? `R${tx.unit_cost}` : '—'}</td>
                    <td className="p-3 text-xs text-gray-400">{tx.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
