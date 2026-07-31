'use client'

import { useState, useEffect } from 'react'
import AdminPage from '@/components/admin/design-system/AdminPage'
import DataTable from '@/components/admin/design-system/DataTable'
import type { Column } from '@/components/admin/design-system/DataTable'
import Button from '@/components/admin/design-system/Button'

interface Uom {
  id: string
  name: string
  symbol: string | null
  category: string
}

interface Category {
  id: string
  name: string
  parent_id: string | null
  is_active: boolean
  children?: Category[]
}

interface CostCentre {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
}

export default function SettingsPage() {
  const [uoms, setUoms] = useState<Uom[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [costCentres, setCostCentres] = useState<CostCentre[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [tab, setTab] = useState<'uoms' | 'categories' | 'cost-centres'>('uoms')
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/inventory/uoms').then(r => r.json()),
      fetch('/api/inventory/categories').then(r => r.json()),
      fetch('/api/inventory/cost-centres?show_archived=true').then(r => r.json()),
    ]).then(([uomData, catData, ccData]) => {
      setUoms(uomData.data || [])
      setCategories(catData.data || [])
      setCostCentres(ccData.data || [])
    }).finally(() => setIsLoading(false))
  }, [])

  async function handleCreateCostCentre() {
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

  async function toggleCostCentre(cc: CostCentre) {
    const res = await fetch(`/api/inventory/cost-centres/${cc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !cc.is_active }),
    })
    const json = await res.json()
    if (res.ok && json.data) {
      setCostCentres(prev => prev.map(c => (c.id === cc.id ? json.data : c)))
    }
  }

  const uomColumns: Column<Uom>[] = [
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

  const catColumns: Column<Category>[] = [
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

  const ccColumns: Column<CostCentre>[] = [
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
          <Button variant="secondary" size="sm" onClick={() => toggleCostCentre(cc)}>
            {cc.is_active ? 'Archive' : 'Restore'}
          </Button>
        </div>
      ),
    },
  ]

  const tabStyle = (active: boolean) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      active ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'
    }`

  return (
    <AdminPage title="Inventory Settings" description="Manage UOMs, categories, and cost centres">
      <div className="flex gap-2 mb-6 border-b">
        <button onClick={() => setTab('uoms')} className={tabStyle(tab === 'uoms')}>Units of Measure</button>
        <button onClick={() => setTab('categories')} className={tabStyle(tab === 'categories')}>Categories</button>
        <button onClick={() => setTab('cost-centres')} className={tabStyle(tab === 'cost-centres')}>Cost Centres</button>
      </div>

      {tab === 'uoms' ? (
        <DataTable<Uom>
          columns={uomColumns}
          data={uoms}
          keyField="id"
          isLoading={isLoading}
          emptyState={<div className="p-6 text-center text-gray-400">No UOMs defined yet</div>}
        />
      ) : tab === 'categories' ? (
        <DataTable<Category>
          columns={catColumns}
          data={categories}
          keyField="id"
          isLoading={isLoading}
          emptyState={<div className="p-6 text-center text-gray-400">No categories defined yet</div>}
        />
      ) : (
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
            <Button onClick={handleCreateCostCentre} disabled={busy || !newName.trim()}>
              {busy ? 'Creating...' : 'Add Cost Centre'}
            </Button>
          </div>
          <DataTable<CostCentre>
            columns={ccColumns}
            data={costCentres}
            keyField="id"
            isLoading={isLoading}
            emptyState={<div className="p-6 text-center text-gray-400">No cost centres defined yet</div>}
          />
        </div>
      )}
    </AdminPage>
  )
}
