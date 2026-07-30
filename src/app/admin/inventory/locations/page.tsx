'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/admin/design-system/PageHeader'
import Button from '@/components/admin/design-system/Button'
import Badge from '@/components/admin/design-system/Badge'
import { SkeletonCard } from '@/components/admin/design-system/Skeleton'
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

  return (
    <div>
      <PageHeader title="Locations" description="Manage inventory storage locations" actions={<Button onClick={() => setShowCreateForm(true)} size="sm">Add Location</Button>} />

      {showCreateForm && (
        <div className="bg-white rounded-lg border p-4 mb-6">
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

      <div className="flex gap-2 mb-4">
        <label className="flex items-center gap-1 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} />
          Show archived
        </label>
      </div>

      {isLoading ? <SkeletonCard /> : locations.length === 0 ? (
        <EmptyState title="No locations found" description="Add your first location to get started" />
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">Code</th>
                <th className="text-left p-3 font-medium">Description</th>
                <th className="text-left p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {locations.map(loc => (
                <tr key={loc.id} className="border-b cursor-pointer hover:bg-gray-50" onClick={() => router.push(`/admin/inventory/locations/${loc.id}`)}>
                  <td className={`p-3 font-medium ${!loc.is_active ? 'text-gray-400' : ''}`}>{loc.name}</td>
                  <td className="p-3 font-mono text-sm">{loc.code}</td>
                  <td className="p-3 text-gray-500">{loc.description || '—'}</td>
                  <td className="p-3">
                    <Badge variant={loc.is_active ? 'success' : 'default'}>{loc.is_active ? 'Active' : 'Archived'}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
