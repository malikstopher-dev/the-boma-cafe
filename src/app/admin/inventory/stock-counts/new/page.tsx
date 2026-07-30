'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Button from '@/components/admin/design-system/Button'
import { SkeletonCard } from '@/components/admin/design-system/Skeleton'

export default function NewStockCountPage() {
  const router = useRouter()
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedLocation, setSelectedLocation] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    fetch('/api/inventory/locations?page_size=50')
      .then(r => r.json())
      .then(json => {
        setLocations((json.data || []).map((l: any) => ({ id: l.id, name: l.name })))
        if (json.data?.length > 0) setSelectedLocation(json.data[0].id)
      })
      .finally(() => setIsLoading(false))
  }, [])

  async function handleStart() {
    if (!selectedLocation) return
    setIsCreating(true)

    try {
      const res = await fetch('/api/inventory/stock-counts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location_id: selectedLocation }),
      })

      if (res.ok) {
        const json = await res.json()
        router.push(`/admin/inventory/stock-counts/${json.data.stockCount.id}`)
      } else {
        const err = await res.json()
        alert(err.error?.message || 'Failed to start count')
      }
    } finally {
      setIsCreating(false)
    }
  }

  if (isLoading) return <AdminPage title="New Stock Count"><SkeletonCard /></AdminPage>

  return (
    <AdminPage title="New Stock Count" description="Start a physical inventory count session" actions={<Link href="/admin/inventory/stock-counts"><Button variant="secondary" size="sm">Back</Button></Link>}>

      <div className="max-w-md bg-white rounded-lg border p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
        <select
          className="border rounded px-3 py-2 text-sm w-full mb-4"
          value={selectedLocation}
          onChange={e => setSelectedLocation(e.target.value)}
        >
          {locations.length === 0 && <option value="">No locations available</option>}
          {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>

        <Button onClick={handleStart} disabled={isCreating || !selectedLocation} className="w-full">
          {isCreating ? 'Creating...' : 'Start Count'}
        </Button>

        <p className="text-xs text-gray-400 mt-3">
          This will create a new stock count session. You will count each product one by one.
        </p>
      </div>
    </AdminPage>
  )
}
