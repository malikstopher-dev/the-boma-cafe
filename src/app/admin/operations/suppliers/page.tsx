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

type Supplier = {
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
      .catch(() => setSuppliers([]))
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
      const json = await res.json()
      if (res.ok) {
        setShowCreateForm(false)
        setForm({ name: '', contact_person: '', phone: '', email: '' })
        load()
      } else {
        alert(json.error?.message || 'Failed to create supplier')
      }
    } finally { setSaving(false) }
  }

  const columns: Column<Supplier>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      cell: supplier => (
        <span className={!supplier.is_active ? 'opacity-50' : ''}>{supplier.name}</span>
      ),
    },
    {
      key: 'contact_person',
      header: 'Contact',
      cell: supplier => (
        <span style={{color:'#A09888'}}>{supplier.contact_person || '—'}</span>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      cell: supplier => (
        <span style={{color:'#A09888'}}>{supplier.phone || '—'}</span>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      cell: supplier => (
        <span style={{color:'#A09888'}}>{supplier.email || '—'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: supplier => (
        <Badge variant={supplier.is_active ? 'success' : 'default'}>{supplier.is_active ? 'Active' : 'Archived'}</Badge>
      ),
    },
  ]

  return (
    <AdminPage
      title="Suppliers"
      description="Manage your suppliers and their contact information"
      actions={<Button onClick={() => setShowCreateForm(true)} size="sm">Add Supplier</Button>}
      filters={
        <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search suppliers…">
          <label style={{display:'flex',alignItems:'center',gap:4,fontSize:14,color:'#A09888',cursor:'pointer',userSelect:'none'}}>
            <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} style={{borderRadius:4}} />
            Show archived
          </label>
        </FilterBar>
      }
    >
      {showCreateForm && (
        <div style={{background:'#1E1A14',borderRadius:8,border:'1px solid #3A3428',padding:16,marginBottom:16}}>
          <h3 style={{fontWeight:600,marginBottom:12,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}}>New Supplier</h3>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12,marginBottom:12}}>
            <input style={{background:'#2A261E',border:'1px solid #3A3428',borderRadius:6,padding:'6px 12px',fontSize:14,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}} placeholder="Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <input style={{background:'#2A261E',border:'1px solid #3A3428',borderRadius:6,padding:'6px 12px',fontSize:14,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}} placeholder="Contact Person" value={form.contact_person} onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))} />
            <input style={{background:'#2A261E',border:'1px solid #3A3428',borderRadius:6,padding:'6px 12px',fontSize:14,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}} placeholder="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            <input style={{background:'#2A261E',border:'1px solid #3A3428',borderRadius:6,padding:'6px 12px',fontSize:14,color:'#F0EBE3',fontFamily:'Inter, sans-serif'}} placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={saving || !form.name.trim()}>Create</Button>
            <Button variant="secondary" onClick={() => setShowCreateForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <DataTable<Supplier>
        columns={columns}
        data={suppliers}
        keyField="id"
        onRowClick={supplier => router.push(`/admin/operations/suppliers/${supplier.id}`)}
        isLoading={isLoading}
        emptyState={
          <EmptyState
            title="No suppliers found"
            description={search ? 'Try a different search' : 'Add your first supplier to get started'}
          />
        }
      />
    </AdminPage>
  )
}
