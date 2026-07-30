'use client'

import { useState, useEffect } from 'react'
import AdminPage from '@/components/admin/design-system/AdminPage'
import DataTable from '@/components/admin/design-system/DataTable'
import type { Column } from '@/components/admin/design-system/DataTable'

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

export default function SettingsPage() {
  const [uoms, setUoms] = useState<Uom[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [tab, setTab] = useState<'uoms' | 'categories'>('uoms')

  useEffect(() => {
    Promise.all([
      fetch('/api/inventory/uoms').then(r => r.json()),
      fetch('/api/inventory/categories').then(r => r.json()),
    ]).then(([uomData, catData]) => {
      setUoms(uomData.data || [])
      setCategories(catData.data || [])
    }).finally(() => setIsLoading(false))
  }, [])

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

  const tabStyle = (active: boolean) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      active ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'
    }`

  return (
    <AdminPage title="Inventory Settings" description="Manage UOMs and categories">
      <div className="flex gap-2 mb-6 border-b">
        <button onClick={() => setTab('uoms')} className={tabStyle(tab === 'uoms')}>Units of Measure</button>
        <button onClick={() => setTab('categories')} className={tabStyle(tab === 'categories')}>Categories</button>
      </div>

      {tab === 'uoms' ? (
        <DataTable<Uom>
          columns={uomColumns}
          data={uoms}
          keyField="id"
          isLoading={isLoading}
          emptyState={<div className="p-6 text-center text-gray-400">No UOMs defined yet</div>}
        />
      ) : (
        <DataTable<Category>
          columns={catColumns}
          data={categories}
          keyField="id"
          isLoading={isLoading}
          emptyState={<div className="p-6 text-center text-gray-400">No categories defined yet</div>}
        />
      )}
    </AdminPage>
  )
}
