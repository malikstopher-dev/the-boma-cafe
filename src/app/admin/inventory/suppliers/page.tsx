'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/admin/design-system/PageHeader'
import Button from '@/components/admin/design-system/Button'
import Badge from '@/components/admin/design-system/Badge'
import { SkeletonCard } from '@/components/admin/design-system/Skeleton'
import EmptyState from '@/components/admin/design-system/EmptyState'

interface Supplier {
  id: string
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  is_active: boolean
  deleted_at: string | null
  created_at: string
}

export default function SuppliersPage() {
  const router = useRouter()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [form, setForm] = useState({ name: '', contact_person: '', phone: '', email: '' })
  const [saving, setSaving] = useState(false)

  function load() {
    setIsLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (showArchived) params.set('show_archived', 'true')
    params.set('page_size', '100')

    fetch(`/api/inventory/suppliers?${params}`)
      .then(r => r.json())
      .then(json => setSuppliers(json.data || []))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => { load() }, [search, showArchived])

  async function handleCreate() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/inventory/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setShowCreateForm(false)
        setForm({ name: '', contact_person: '', phone: '', email: '' })
        load()
      }
    } finally { setSaving(false) }
  }

  return (
    <div>
      <PageHeader title="Suppliers" description="Manage your suppliers and their contact information" actions={<Button onClick={() => setShowCreateForm(true)} size="sm">Add Supplier</Button>} />

      {showCreateForm && (
        <div className="bg-white rounded-lg border p-4 mb-6">
          <h3 className="font-semibold mb-3">New Supplier</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <input className="border rounded px-3 py-2 text-sm" placeholder="Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <input className="border rounded px-3 py-2 text-sm" placeholder="Contact Person" value={form.contact_person} onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))} />
            <input className="border rounded px-3 py-2 text-sm" placeholder="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            <input className="border rounded px-3 py-2 text-sm" placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={saving || !form.name.trim()}>Create</Button>
            <Button variant="secondary" onClick={() => setShowCreateForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <input className="border rounded px-3 py-2 text-sm flex-1 max-w-xs" placeholder="Search suppliers..." value={search} onChange={e => setSearch(e.target.value)} />
        <label className="flex items-center gap-1 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} />
          Show archived
        </label>
      </div>

      {isLoading ? <SkeletonCard /> : suppliers.length === 0 ? (
        <EmptyState title="No suppliers found" description={search ? 'Try a different search' : 'Add your first supplier to get started'} />
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">Contact</th>
                <th className="text-left p-3 font-medium">Phone</th>
                <th className="text-left p-3 font-medium">Email</th>
                <th className="text-left p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map(supplier => (
                <tr key={supplier.id} className="border-b cursor-pointer hover:bg-gray-50" onClick={() => router.push(`/admin/inventory/suppliers/${supplier.id}`)}>
                  <td className={`p-3 font-medium ${!supplier.is_active ? 'text-gray-400' : ''}`}>{supplier.name}</td>
                  <td className="p-3 text-gray-500">{supplier.contact_person || '—'}</td>
                  <td className="p-3 text-gray-500">{supplier.phone || '—'}</td>
                  <td className="p-3 text-gray-500">{supplier.email || '—'}</td>
                  <td className="p-3">
                    <Badge variant={supplier.is_active ? 'success' : 'default'}>{supplier.is_active ? 'Active' : 'Archived'}</Badge>
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
