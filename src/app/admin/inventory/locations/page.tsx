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

interface Location {
  id: string
  name: string
  code: string
  description: string | null
  is_active: boolean
  deleted_at: string | null
}

export default function LocationsPage() {
  const router = useRouter()
  const [locations, setLocations] = useState<Location[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [form, setForm] = useState({ name: '', code: '', description: '' })
  const [saving, setSaving] = useState(false)

  function load() {
    setIsLoading(true)
    const params = new URLSearchParams()
    if (showArchived) params.set('show_archived', 'true')
    params.set('page_size', '100')

    fetch(`/api/inventory/locations?${params}`)
      .then(r => r.json())
      .then(json => setLocations(json.data || []))
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
        setForm({ name: '', code: '', description: '' })
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
        <span className="text-gray-500">{loc.description || '—'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: loc => (
        <Badge variant={loc.is_active ? 'success' : 'default'}>{loc.is_active ? 'Active' : 'Archived'}</Badge>
      ),
    },
  ]

  return (
    <AdminPage
      title="Locations"
      description="Manage inventory storage locations"
      actions={<Button onClick={() => setShowCreateForm(true)} size="sm">Add Location</Button>}
      filters={
        <FilterBar>
          <label className="flex items-center gap-1 text-sm text-gray-600 cursor-pointer select-none">
            <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} className="rounded" />
            Show archived
          </label>
        </FilterBar>
      }
    >
      {showCreateForm && (
        <div className="bg-white rounded-lg border p-4 mb-4">
          <h3 className="font-semibold mb-3">New Location</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <input className="border rounded px-3 py-2 text-sm" placeholder="Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <input className="border rounded px-3 py-2 text-sm" placeholder="Code * (e.g. MAIN)" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
            <input className="border rounded px-3 py-2 text-sm" placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
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
        onRowClick={loc => router.push(`/admin/inventory/locations/${loc.id}`)}
        isLoading={isLoading}
        emptyState={
          <EmptyState title="No locations found" description="Add your first location to get started" />
        }
      />
    </AdminPage>
  )
}
