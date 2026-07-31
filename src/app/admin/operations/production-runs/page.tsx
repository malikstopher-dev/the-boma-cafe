'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Button from '@/components/admin/design-system/Button'
import Badge from '@/components/admin/design-system/Badge'

type Recipe = {
  id: string
  name: string
  yield_quantity: number
  category: string | null
}

type ProductionRun = {
  id: string
  recipe_id: string
  recipe_name?: string
  location_id: string
  status: string
  quantity_planned: number
  quantity_completed: number | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

const statusBadge: Record<string, { variant: 'info' | 'warning' | 'success' | 'danger'; label: string }> = {
  planned: { variant: 'info', label: 'Planned' },
  in_progress: { variant: 'warning', label: 'In Progress' },
  completed: { variant: 'success', label: 'Completed' },
  cancelled: { variant: 'danger', label: 'Cancelled' },
}

export default function ProductionRunsPage() {
  const [runs, setRuns] = useState<ProductionRun[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selRecipe, setSelRecipe] = useState('')
  const [qty, setQty] = useState('1')
  const [busy, setBusy] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    fetchRuns()
    fetch('/api/inventory/recipes')
      .then(r => r.json())
      .then(json => setRecipes(json.data ?? []))
      .catch(() => {})
  }, [])

  async function fetchRuns() {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ location_id: 'main' })
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/inventory/production-runs?${params}`)
      const json = await res.json()
      setRuns(json.data ?? [])
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRuns()
  }, [statusFilter])

  async function createRun() {
    if (!selRecipe) return
    setBusy(true)
    try {
      const res = await fetch('/api/inventory/production-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipe_id: selRecipe,
          location_id: 'main',
          quantity_planned: parseFloat(qty) || 1,
        }),
      })
      const json = await res.json()
      if (json.data) {
        setShowCreate(false)
        setSelRecipe('')
        setQty('1')
        await fetchRuns()
      }
    } catch {
      // ignore
    } finally {
      setBusy(false)
    }
  }

  return (
    <AdminPage
      title="Production Runs"
      description="Track batches of production and auto-deduct ingredients"
      actions={
        <Button onClick={() => setShowCreate(v => !v)} size="sm">
          {showCreate ? 'Cancel' : 'New Production Run'}
        </Button>
      }
    >
      <div className="p-6">
        {showCreate && (
          <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-white mb-3">Start a Production Run</h3>
            <div className="flex gap-3">
              <select
                value={selRecipe}
                onChange={e => setSelRecipe(e.target.value)}
                className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
              >
                <option value="">Select recipe...</option>
                {recipes.map(r => (
                  <option key={r.id} value={r.id}>{r.name} ({r.category ?? 'uncategorised'})</option>
                ))}
              </select>
              <input
                type="number"
                value={qty}
                onChange={e => setQty(e.target.value)}
                className="w-32 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
                placeholder="Qty"
              />
              <Button onClick={createRun} disabled={busy || !selRecipe}>
                {busy ? 'Creating...' : 'Create Run'}
              </Button>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-4">
          {['', 'planned', 'in_progress', 'completed', 'cancelled'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded text-sm ${statusFilter === s ? 'bg-brand-500/20 text-brand-400' : 'text-gray-400 hover:text-white'}`}
            >
              {s === '' ? 'All' : s.replace('_', ' ')}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-gray-400 py-12 text-center">Loading...</div>
        ) : runs.length === 0 ? (
          <div className="text-gray-500 py-12 text-center">No production runs found</div>
        ) : (
          <div className="space-y-2">
            {runs.map(run => {
              const badge = statusBadge[run.status] ?? { variant: 'info' as const, label: run.status }
              return (
                <Link
                  key={run.id}
                  href={`/admin/operations/production-runs/${run.id}`}
                  className="flex items-center gap-4 p-3 rounded-lg bg-gray-800/50 border border-gray-700/50 hover:bg-gray-700/50 transition-colors"
                >
                  <span className="text-white font-medium flex-1">{run.recipe_name ?? 'Unknown recipe'}</span>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                  <span className="text-sm text-gray-400">
                    Qty: {run.quantity_completed ?? run.quantity_planned}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(run.created_at).toLocaleDateString('en-ZA')}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </AdminPage>
  )
}
