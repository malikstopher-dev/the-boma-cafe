'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Button from '@/components/admin/design-system/Button'
import Badge from '@/components/admin/design-system/Badge'

type ChecklistItem = {
  id: string
  title: string
  description: string | null
  category: string
  sort_order: number
  is_required: boolean
  status: 'pending' | 'completed' | 'skipped' | 'failed'
  notes: string | null
}

type ChecklistData = {
  id: string
  location_id: string
  checklist_date: string
  status: 'in_progress' | 'completed' | 'skipped'
  opened_at: string
  completed_at: string | null
  manager_notes: string | null
  items: ChecklistItem[]
}

const categoryLabels: Record<string, string> = {
  refrigeration: 'Refrigeration',
  stock: 'Stock Levels',
  reconciliation: 'Reconciliation',
  cleanliness: 'Cleanliness',
  admin: 'Administration',
  equipment: 'Equipment',
  menu: 'Menu & Specials',
  general: 'General',
}

const categoryOrder = ['refrigeration', 'stock', 'reconciliation', 'equipment', 'cleanliness', 'menu', 'admin', 'general']
const categoryIcons: Record<string, string> = {
  refrigeration: '❄️',
  stock: '📦',
  reconciliation: '📊',
  equipment: '🔧',
  cleanliness: '🧹',
  menu: '🍽️',
  admin: '📋',
  general: '📌',
}

export default function OpeningChecklistPage() {
  const [checklist, setChecklist] = useState<ChecklistData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [managerNotes, setManagerNotes] = useState('')
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    fetchChecklist()
  }, [])

  async function fetchChecklist() {
    setIsLoading(true)
    try {
      const res = await fetch('/api/inventory/checklist?location_id=main')
      const json = await res.json()
      setChecklist(json.data)
      setManagerNotes(json.data?.manager_notes ?? '')
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }

  async function toggleItem(item: ChecklistItem) {
    const newStatus = item.status === 'completed' ? 'pending' : 'completed'
    setSaving(item.id)
    try {
      await fetch(`/api/inventory/checklist/${checklist!.id}/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      await fetchChecklist()
    } catch {
      // ignore
    } finally {
      setSaving(null)
    }
  }

  async function completeChecklist() {
    setSaving('complete')
    try {
      await fetch(`/api/inventory/checklist/${checklist!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed', manager_notes: managerNotes || null }),
      })
      await fetchChecklist()
    } catch {
      // ignore
    } finally {
      setSaving(null)
    }
  }

  async function saveNotes() {
    setSaving('notes')
    try {
      await fetch(`/api/inventory/checklist/${checklist!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manager_notes: managerNotes }),
      })
    } catch {
      // ignore
    } finally {
      setSaving(null)
    }
  }

  function groupedItems(): Record<string, ChecklistItem[]> {
    if (!checklist) return {}
    const groups: Record<string, ChecklistItem[]> = {}
    for (const item of checklist.items) {
      const cat = item.category || 'general'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(item)
    }
    return groups
  }

  const completedCount = checklist?.items.filter(i => i.status === 'completed').length ?? 0
  const totalCount = checklist?.items.length ?? 0
  const isComplete = checklist?.status === 'completed'

  if (isLoading) {
    return <AdminPage title="Opening Checklist"><div className="p-8 text-gray-400">Loading...</div></AdminPage>
  }

  return (
    <AdminPage
      title="Morning Opening Checklist"
      description={checklist ? new Date(checklist.checklist_date).toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ''}
      actions={
        <div className="flex gap-2">
          {!isComplete && (
            <Button onClick={completeChecklist} disabled={saving === 'complete'}>
              {saving === 'complete' ? 'Completing...' : 'Complete Checklist'}
            </Button>
          )}
          <Link href="/admin/operations/history" className="text-sm text-brand-400 hover:underline self-center">
            History
          </Link>
        </div>
      }
    >
      <div className="max-w-3xl mx-auto p-6">
        {isComplete ? (
          <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 mb-6 text-center">
            <p className="text-green-400 font-semibold text-lg">✓ Checklist Completed</p>
            {checklist?.completed_at && (
              <p className="text-gray-400 text-sm mt-1">Completed at {new Date(checklist.completed_at).toLocaleTimeString('en-ZA')}</p>
            )}
          </div>
        ) : (
          <div className="bg-brand-900/30 border border-brand-700 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <p className="text-gray-300">
                <span className="font-semibold">{completedCount}</span> of <span className="font-semibold">{totalCount}</span> items completed
              </p>
              <div className="w-48 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all"
                  style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {Object.entries(groupedItems()).map(([category, items]) => {
          const catItems = items.sort((a, b) => a.sort_order - b.sort_order)
          const catDone = catItems.filter(i => i.status === 'completed').length
          return (
            <div key={category} className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <span>{categoryIcons[category] ?? '📌'}</span>
                <h2 className="text-lg font-semibold text-white">{categoryLabels[category] ?? category}</h2>
                <span className="text-xs text-gray-500 ml-auto">{catDone}/{catItems.length}</span>
              </div>
              <div className="space-y-2">
                {catItems.map(item => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                      item.status === 'completed'
                        ? 'bg-green-900/20 border-green-800/50'
                        : item.status === 'skipped'
                          ? 'bg-yellow-900/20 border-yellow-800/50'
                          : 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-700/50'
                    } ${saving === item.id ? 'opacity-50' : ''}`}
                    onClick={() => toggleItem(item)}
                  >
                    <div className="mt-0.5">
                      {item.status === 'completed' ? (
                        <span className="text-green-400 text-lg">✓</span>
                      ) : (
                        <span className="text-gray-600 text-lg">○</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${item.status === 'completed' ? 'text-gray-400 line-through' : 'text-white'}`}>
                          {item.title}
                        </span>
                        {item.is_required && !isComplete && (
                          <Badge variant="warning" className="text-[10px]">Required</Badge>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                      )}
                      {item.notes && (
                        <p className="text-xs text-gray-400 mt-1 italic">{item.notes}</p>
                      )}
                    </div>
                    {item.status === 'skipped' && <Badge variant="warning">Skipped</Badge>}
                    {item.status === 'failed' && <Badge variant="danger">Failed</Badge>}
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        <div className="mt-8 border-t border-gray-700 pt-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">Manager Notes</label>
          <textarea
            value={managerNotes}
            onChange={e => setManagerNotes(e.target.value)}
            placeholder="Add any notes about today's opening..."
            rows={3}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
          />
          <div className="mt-2 flex justify-end">
            <Button onClick={saveNotes} disabled={saving === 'notes'} variant="secondary" size="sm">
              {saving === 'notes' ? 'Saving...' : 'Save Notes'}
            </Button>
          </div>
        </div>
      </div>
    </AdminPage>
  )
}
