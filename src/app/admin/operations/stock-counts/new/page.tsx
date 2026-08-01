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
        router.push(`/admin/operations/stock-counts/${json.data.stockCount.id}`)
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
    <AdminPage title="New Stock Count" description="Start a physical inventory count session" actions={<Link href="/admin/operations/stock-counts"><Button variant="secondary" size="sm">Back</Button></Link>}>

      <div style={{maxWidth:'md',background:'#1E1A14',borderRadius:8,border:'1px solid #3A3428',padding:24}}>
        <label style={{display:'block',fontSize:14,fontWeight:500,color:'#A09888',marginBottom:8}}>Location</label>
        <select
          style={{background:'#2A261E',border:'1px solid #3A3428',borderRadius:6,padding:'6px 12px',fontSize:14,width:'100%',marginBottom:16,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}
          value={selectedLocation}
          onChange={e => setSelectedLocation(e.target.value)}
        >
          {locations.length === 0 && <option value="">No locations available</option>}
          {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>

        <Button onClick={handleStart} disabled={isCreating || !selectedLocation} className="w-full">
          {isCreating ? 'Creating...' : 'Start Count'}
        </Button>

        <p style={{fontSize:12,color:'#6B6358',marginTop:12,fontFamily:'Inter, sans-serif'}}>
          This will create a new stock count session. You will count each product one by one.
        </p>
      </div>
    </AdminPage>
  )
}
