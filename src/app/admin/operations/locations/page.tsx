'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminPage from '@/components/admin/design-system/AdminPage'
import DataTable from '@/components/admin/design-system/DataTable'
import type { Column } from '@/components/admin/design-system/DataTable'
import FilterBar from '@/components/admin/design-system/FilterBar'
import Button from '@/components/admin/design-system/Button'
import Badge from '@/components/admin/design-system/Badge'
import EmptyState from '@/components/admin/design-system/EmptyState'

type Location = {
  id: string
  name: string
  code: string
  description: string | null
  is_active: boolean
  deleted_at: string | null
  order_station: 'kitchen' | 'bar' | null
}

export default function LocationsPage() {
  const router = useRouter()
  const [locations, setLocations] = useState<Location[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [form, setForm] = useState({ name: '', code: '', description: '', order_station: '' })
  const [saving, setSaving] = useState(false)

  function load() {
    setIsLoading(true)
    const params = new URLSearchParams()
    if (showArchived) params.set('show_archived', 'true')
    params.set('page_size', '100')

    fetch(`/api/inventory/locations?${params}`)
      .then(r => r.json())
      .then(json => setLocations(json.data || []))
      .catch(() => setLocations([]))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => { load() }, [showArchived])

  async function handleCreate() {
    if (!form.name.trim() || !form.code.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/inventory/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setShowCreateForm(false)
        setForm({ name: '', code: '', description: '', order_station: '' })
        load()
      } else {
        const err = await res.json()
        alert(err.error?.message || 'Failed to create location')
      }
    } finally { setSaving(false) }
  }

  const columns: Column<Location>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      cell: loc => (
        <span className={!loc.is_active ? 'opacity-50' : ''}>{loc.name}</span>
      ),
    },
    {
      key: 'code',
      header: 'Code',
      cell: loc => (
        <span className="font-mono text-sm">{loc.code}</span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      cell: loc => (
        <span style={{color:'#A09888'}}>{loc.description || '—'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: loc => (
        <Badge variant={loc.is_active ? 'success' : 'default'}>{loc.is_active ? 'Active' : 'Archived'}</Badge>
      ),
    },
    {
      key: 'order_station',
      header: 'Order Station',
      cell: loc => loc.order_station
        ? <Badge variant="info">{loc.order_station === 'bar' ? 'Bar' : 'Kitchen'}</Badge>
        : <span style={{color:'#6B6358'}}>Not mapped</span>,
    },
  ]

  return (
    <AdminPage
      title="Locations"
      description="Manage inventory storage locations"
      actions={<Button onClick={() => setShowCreateForm(true)} size="sm">Add Location</Button>}
      filters={
        <FilterBar>
          <label style={{display:'flex',alignItems:'center',gap:4,fontSize:14,color:'#A09888',cursor:'pointer',userSelect:'none'}}>
            <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} style={{borderRadius:4}} />
            Show archived
          </label>
        </FilterBar>
      }
    >
      {showCreateForm && (
        <div style={{background:'#1E1A14',borderRadius:8,border:'1px solid #3A3428',padding:16,marginBottom:16}}>
          <h3 style={{fontWeight:600,marginBottom:12,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}>New Location</h3>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12,marginBottom:12}}>
            <input style={{background:'#2A261E',border:'1px solid #3A3428',borderRadius:6,padding:'6px 12px',fontSize:14,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}} placeholder="Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <input style={{background:'#2A261E',border:'1px solid #3A3428',borderRadius:6,padding:'6px 12px',fontSize:14,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}} placeholder="Code * (e.g. MAIN)" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
            <input style={{background:'#2A261E',border:'1px solid #3A3428',borderRadius:6,padding:'6px 12px',fontSize:14,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}} placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <select style={{background:'#2A261E',border:'1px solid #3A3428',borderRadius:6,padding:'6px 12px',fontSize:14,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}} value={form.order_station} onChange={e => setForm(f => ({ ...f, order_station: e.target.value }))}>
              <option value="">No order station</option>
              <option value="kitchen">Kitchen orders</option>
              <option value="bar">Bar orders</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={saving || !form.name.trim() || !form.code.trim()}>Create</Button>
            <Button variant="secondary" onClick={() => setShowCreateForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <DataTable<Location>
        columns={columns}
        data={locations}
        keyField="id"
        onRowClick={loc => router.push(`/admin/operations/locations/${loc.id}`)}
        isLoading={isLoading}
        emptyState={
          <EmptyState title="No locations found" description="Add your first location to get started" />
        }
      />
    </AdminPage>
  )
}
