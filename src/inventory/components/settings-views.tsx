'use client'

import { useState, useEffect } from 'react'
import DataTable from '@/components/admin/design-system/DataTable'
import type { Column } from '@/components/admin/design-system/DataTable'
import Button from '@/components/admin/design-system/Button'
import ReasonDialog from '@/components/admin/design-system/ReasonDialog'

type Uom = {
  id: string
  name: string
  symbol: string | null
  category: string
}

type Category = {
  id: string
  name: string
  parent_id: string | null
  is_active: boolean
  children?: Category[]
}

type CostCentre = {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
}

export function UomsView() {
  const [uoms, setUoms] = useState<Uom[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/inventory/uoms')
      .then(r => r.json())
      .then(json => setUoms(json.data || []))
      .catch(() => setUoms([]))
      .finally(() => setIsLoading(false))
  }, [])

  const columns: Column<Uom>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      cell: uom => <span className="font-medium">{uom.name}</span>,
    },
    {
      key: 'symbol',
      header: 'Symbol',
      cell: uom => <span className="text-gray-500">{uom.symbol || '—'}</span>,
    },
    {
      key: 'category',
      header: 'Category',
      cell: uom => <span className="capitalize">{uom.category}</span>,
    },
  ]

  return (
    <DataTable<Uom>
      columns={columns}
      data={uoms}
      keyField="id"
      isLoading={isLoading}
      emptyState={<div className="p-6 text-center text-gray-400">No UOMs defined yet</div>}
    />
  )
}

export function CategoriesView() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/inventory/categories')
      .then(r => r.json())
      .then(json => setCategories(json.data || []))
      .catch(() => setCategories([]))
      .finally(() => setIsLoading(false))
  }, [])

  const columns: Column<Category>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      cell: cat => <span className="font-medium">{cat.name}</span>,
    },
    {
      key: 'parent_id',
      header: 'Parent',
      cell: cat => <span className="text-gray-500">{cat.parent_id || '—'}</span>,
    },
    {
      key: 'is_active',
      header: 'Status',
      cell: cat => <span>{cat.is_active ? 'Active' : 'Archived'}</span>,
    },
  ]

  return (
    <DataTable<Category>
      columns={columns}
      data={categories}
      keyField="id"
      isLoading={isLoading}
      emptyState={<div className="p-6 text-center text-gray-400">No categories defined yet</div>}
    />
  )
}

export function CostCentresView() {
  const [costCentres, setCostCentres] = useState<CostCentre[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [archiveTarget, setArchiveTarget] = useState<CostCentre | null>(null)

  useEffect(() => {
    fetch('/api/inventory/cost-centres?show_archived=true')
      .then(r => r.json())
      .then(json => setCostCentres(json.data || []))
      .finally(() => setIsLoading(false))
  }, [])

  async function handleCreate() {
    if (!newName.trim()) return
    setBusy(true)
    try {
      const res = await fetch('/api/inventory/cost-centres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), description: newDescription.trim() || null }),
      })
      const json = await res.json()
      if (res.ok && json.data) {
        setCostCentres(prev => [...prev, json.data].sort((a, b) => a.name.localeCompare(b.name)))
        setNewName('')
        setNewDescription('')
      }
    } finally {
      setBusy(false)
    }
  }

  async function toggle(cc: CostCentre, reason?: string) {
    if (cc.is_active && !reason) {
      setArchiveTarget(cc)
      return
    }
    setArchiveTarget(null)
    const res = await fetch(`/api/inventory/cost-centres/${cc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !cc.is_active, reason: reason ?? null }),
    })
    const json = await res.json()
    if (res.ok && json.data) {
      setCostCentres(prev => prev.map(c => (c.id === cc.id ? json.data : c)))
    }
  }

  const columns: Column<CostCentre>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      cell: cc => <span className="font-medium">{cc.name}</span>,
    },
    {
      key: 'description',
      header: 'Description',
      cell: cc => <span className="text-gray-500">{cc.description || '—'}</span>,
    },
    {
      key: 'is_active',
      header: 'Status',
      cell: cc => (
        <div className="flex items-center gap-3">
          <span>{cc.is_active ? 'Active' : 'Archived'}</span>
          <Button variant="secondary" size="sm" onClick={() => toggle(cc)}>
            {cc.is_active ? 'Archive' : 'Restore'}
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <div className="bg-white border rounded-lg p-4 mb-4">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <input
            className="border rounded px-3 py-2 text-sm"
            placeholder="Cost centre name *"
            value={newName}
            onChange={e => setNewName(e.target.value)}
          />
          <input
            className="border rounded px-3 py-2 text-sm"
            placeholder="Description"
            value={newDescription}
            onChange={e => setNewDescription(e.target.value)}
          />
        </div>
        <Button onClick={handleCreate} disabled={busy || !newName.trim()}>
          {busy ? 'Creating...' : 'Add Cost Centre'}
        </Button>
      </div>
      <DataTable<CostCentre>
        columns={columns}
        data={costCentres}
        keyField="id"
        isLoading={isLoading}
        emptyState={<div className="p-6 text-center text-gray-400">No cost centres defined yet</div>}
      />
      <ReasonDialog
        open={archiveTarget !== null}
        title={archiveTarget ? `Archive "${archiveTarget.name}"?` : ''}
        message="The cost centre will be hidden from movement dropdowns. Historical transactions keep it."
        confirmLabel="Archive"
        confirmVariant="danger"
        onConfirm={reason => archiveTarget && toggle(archiveTarget, reason)}
        onCancel={() => setArchiveTarget(null)}
      />
    </div>
  )
}
