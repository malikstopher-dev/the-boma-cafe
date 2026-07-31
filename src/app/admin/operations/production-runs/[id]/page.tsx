'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Button from '@/components/admin/design-system/Button'
import Badge from '@/components/admin/design-system/Badge'

interface RunItem {
  id: string
  product_name?: string
  direction: 'consumed' | 'produced'
  quantity: number
  wastage_pct: number
  transaction_id: string | null
}

interface RunDetail {
  id: string
  recipe_id: string
  recipe_name?: string
  location_id: string
  status: string
  quantity_planned: number
  quantity_completed: number | null
  started_at: string | null
  completed_at: string | null
  notes: string | null
  items: RunItem[]
}

const statusBadge: Record<string, { variant: 'info' | 'warning' | 'success' | 'danger'; label: string }> = {
  planned: { variant: 'info', label: 'Planned' },
  in_progress: { variant: 'warning', label: 'In Progress' },
  completed: { variant: 'success', label: 'Completed' },
  cancelled: { variant: 'danger', label: 'Cancelled' },
}

export default function ProductionRunDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [run, setRun] = useState<RunDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [completeQty, setCompleteQty] = useState('')

  useEffect(() => {
    fetchRun()
  }, [])

  async function fetchRun() {
    try {
      const res = await fetch(`/api/inventory/production-runs/${id}`)
      const json = await res.json()
      setRun(json.data ?? null)
      if (json.data) setCompleteQty(String(json.data.quantity_planned ?? ''))
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }

  async function action(path: string, body?: object) {
    setBusy(true)
    try {
      await fetch(`/api/inventory/production-runs/${id}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body ?? {}),
      })
      await fetchRun()
    } catch {
      // ignore
    } finally {
      setBusy(false)
    }
  }

  if (isLoading) return <AdminPage title="Production Run"><div className="p-8 text-gray-400">Loading...</div></AdminPage>
  if (!run) return <AdminPage title="Production Run"><div className="p-8 text-gray-400">Run not found</div></AdminPage>

  const badge = statusBadge[run.status] ?? { variant: 'info' as const, label: run.status }
  const consumed = run.items.filter(i => i.direction === 'consumed')
  const produced = run.items.filter(i => i.direction === 'produced')

  return (
    <AdminPage
      title={run.recipe_name ?? 'Production Run'}
      description={`${run.quantity_completed ?? run.quantity_planned} units planned`}
      actions={
        <div className="flex gap-2">
          {run.status === 'planned' && (
            <Button onClick={() => action('start')} disabled={busy} size="sm">
              Start Run
            </Button>
          )}
          {(run.status === 'planned' || run.status === 'in_progress') && (
            <Button onClick={() => action('complete', { quantity_completed: parseFloat(completeQty) || run.quantity_planned })} disabled={busy} size="sm">
              Complete & Auto-Deduct
            </Button>
          )}
          {(run.status === 'planned' || run.status === 'in_progress') && (
            <Button onClick={() => action('cancel')} disabled={busy} variant="danger" size="sm">
              Cancel
            </Button>
          )}
        </div>
      }
    >
      <div className="p-6 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <Badge variant={badge.variant}>{badge.label}</Badge>
          {run.completed_at && (
            <span className="text-xs text-gray-500">
              Completed {new Date(run.completed_at).toLocaleString('en-ZA')}
            </span>
          )}
        </div>

        {(run.status === 'planned' || run.status === 'in_progress') && (
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 mb-6">
            <label className="block text-sm text-gray-400 mb-2">Completion Quantity (scales ingredient deduction)</label>
            <input
              type="number"
              value={completeQty}
              onChange={e => setCompleteQty(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white w-40"
            />
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">Consumed Ingredients ({consumed.length})</h2>
          <div className="space-y-2">
            {consumed.map(item => (
              <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-red-900/10 border border-red-800/30">
                <span className="text-white font-medium flex-1">{item.product_name}</span>
                <span className="text-red-400">-{item.quantity}</span>
                {item.wastage_pct > 0 && <Badge variant="warning">{item.wastage_pct}% waste</Badge>}
                {item.transaction_id && <span className="text-xs text-green-500">Ô£ô ledger</span>}
              </div>
            ))}
            {consumed.length === 0 && <p className="text-gray-500 text-sm">No ingredients</p>}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">Produced Outputs ({produced.length})</h2>
          <div className="space-y-2">
            {produced.map(item => (
              <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-green-900/10 border border-green-800/30">
                <span className="text-white font-medium flex-1">{item.product_name}</span>
                <span className="text-green-400">+{item.quantity}</span>
                {item.transaction_id && <span className="text-xs text-green-500">Ô£ô ledger</span>}
              </div>
            ))}
            {produced.length === 0 && <p className="text-gray-500 text-sm">No outputs</p>}
          </div>
        </div>

        {run.notes && (
          <div className="text-sm text-gray-400 bg-gray-800/50 border border-gray-700/50 rounded-lg p-3">
            {run.notes}
          </div>
        )}
      </div>
    </AdminPage>
  )
}