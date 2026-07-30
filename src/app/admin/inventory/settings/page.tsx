'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/admin/design-system/PageHeader'
import Button from '@/components/admin/design-system/Button'
import { SkeletonCard } from '@/components/admin/design-system/Skeleton'

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

  return (
    <div>
      <PageHeader title="Inventory Settings" description="Manage UOMs and categories" />

      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setTab('uoms')}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === 'uoms' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500'}`}
        >Units of Measure</button>
        <button
          onClick={() => setTab('categories')}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === 'categories' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500'}`}
        >Categories</button>
      </div>

      {isLoading ? <SkeletonCard /> : tab === 'uoms' ? (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">Symbol</th>
                <th className="text-left p-3 font-medium">Category</th>
              </tr>
            </thead>
            <tbody>
              {uoms.map(uom => (
                <tr key={uom.id} className="border-b">
                  <td className="p-3 font-medium">{uom.name}</td>
                  <td className="p-3 text-gray-500">{uom.symbol || '—'}</td>
                  <td className="p-3 capitalize">{uom.category}</td>
                </tr>
              ))}
              {uoms.length === 0 && (
                <tr><td colSpan={3} className="p-6 text-center text-gray-400">No UOMs defined yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">Parent</th>
                <th className="text-left p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(cat => (
                <tr key={cat.id} className="border-b">
                  <td className="p-3 font-medium">{cat.name}</td>
                  <td className="p-3 text-gray-500">{cat.parent_id || '—'}</td>
                  <td className="p-3">{cat.is_active ? 'Active' : 'Archived'}</td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr><td colSpan={3} className="p-6 text-center text-gray-400">No categories defined yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
