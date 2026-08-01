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
  in_progress: 'warning',
  submitted: 'default',
  approved: 'success',
  cancelled: 'danger',
}

type StockCount = {
  id: string
  location_id: string
  status: string
  performed_by: string | null
  approved_by: string | null
  notes: string | null
  created_at: string
  completed_at: string | null
}

export default function StockCountsPage() {
  const router = useRouter()
  const [counts, setCounts] = useState<StockCount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([])
  const [locationFilter, setLocationFilter] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/inventory/stock-counts').then(r => r.json()),
      fetch('/api/inventory/locations?page_size=50').then(r => r.json()),
    ]).then(([countsJson, locsJson]) => {
      setCounts(countsJson.data || [])
      setLocations((locsJson.data || []).map((l: any) => ({ id: l.id, name: l.name })))
    }).finally(() => setIsLoading(false))
  }, [])

  const filtered = locationFilter
    ? counts.filter(c => c.location_id === locationFilter)
    : counts

  function locationName(id: string) {
    return locations.find(l => l.id === id)?.name || id.slice(0, 8)
  }

  const columns: Column<StockCount>[] = [
    {
      key: 'created_at',
      header: 'Date',
      sortable: true,
      cell: count => (
        <span>{new Date(count.created_at).toLocaleDateString()}</span>
      ),
    },
    {
      key: 'location_id',
      header: 'Location',
      cell: count => (
        <span>{locationName(count.location_id)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: count => (
        <Badge variant={STATUS_VARIANTS[count.status] || 'default'}>{count.status.replace('_', ' ')}</Badge>
      ),
    },
    {
      key: 'completed_at',
      header: 'Completed',
      cell: count => (
        <span style={{color:'#A09888'}}>{count.completed_at ? new Date(count.completed_at).toLocaleDateString() : '—'}</span>
      ),
    },
  ]

  return (
    <AdminPage
      title="Stock Counts"
      description="Physical inventory counting sessions"
      actions={<Link href="/admin/operations/stock-counts/new"><Button size="sm">New Count</Button></Link>}
      filters={
        <FilterBar>
          <select style={{background:'#2A261E',border:'1px solid #3A3428',borderRadius:6,padding:'6px 12px',fontSize:14,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}} value={locationFilter} onChange={e => setLocationFilter(e.target.value)}>
            <option value="">All Locations</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </FilterBar>
      }
    >
      <DataTable<StockCount>
        columns={columns}
        data={filtered}
        keyField="id"
        onRowClick={count => router.push(`/admin/operations/stock-counts/${count.id}`)}
        isLoading={isLoading}
        emptyState={
          <EmptyState title="No stock counts" description="Start your first physical inventory count" />
        }
      />
    </AdminPage>
  )
}
