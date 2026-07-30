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
  in_progress: 'warning',
  submitted: 'default',
  approved: 'success',
  cancelled: 'danger',
}

interface StockCount {
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

  return (
    <div>
      <PageHeader title="Stock Counts" description="Physical inventory counting sessions" actions={<Link href="/admin/inventory/stock-counts/new"><Button size="sm">New Count</Button></Link>} />

      <div className="flex gap-2 mb-4">
        <select className="border rounded px-3 py-2 text-sm" value={locationFilter} onChange={e => setLocationFilter(e.target.value)}>
          <option value="">All Locations</option>
          {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>

      {isLoading ? <SkeletonCard /> : filtered.length === 0 ? (
        <EmptyState title="No stock counts" description="Start your first physical inventory count" />
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-left p-3 font-medium">Location</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Completed</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(count => (
                <tr key={count.id} className="border-b cursor-pointer hover:bg-gray-50" onClick={() => router.push(`/admin/inventory/stock-counts/${count.id}`)}>
                  <td className="p-3">{new Date(count.created_at).toLocaleDateString()}</td>
                  <td className="p-3">{locationName(count.location_id)}</td>
                  <td className="p-3">
                    <Badge variant={STATUS_VARIANTS[count.status] || 'default'}>{count.status.replace('_', ' ')}</Badge>
                  </td>
                  <td className="p-3 text-gray-500">{count.completed_at ? new Date(count.completed_at).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
