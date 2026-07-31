'use client'

import { useState, useEffect } from 'react'

export interface MovementEventView {
  id: string
  transaction_type: string
  quantity: number
  reason_type: string | null
  reason_notes: string | null
  manager_note: string | null
  note_author: string | null
  cost_centre_name: string | null
  performed_by: string | null
  created_at: string
  reference_type: string | null
  reference_id: string | null
  notes: string | null
}

function dateLabel(iso: string): string {
  const date = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today.getTime() - 86400000)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })
}

function referenceLabel(refType: string | null, refId: string | null): string {
  if (!refType) return ''
  switch (refType) {
    case 'purchase_order': return `PO ${refId?.slice(0, 8) ?? ''}`
    case 'booking': return `Booking #${refId?.slice(0, 8) ?? ''}`
    case 'pos_order': return `Order #${refId?.slice(0, 8) ?? ''}`
    case 'production_run': return `Run #${refId?.slice(0, 8) ?? ''}`
    case 'stock_count': return `Stock count`
    default: return `${refType} #${refId?.slice(0, 8) ?? ''}`
  }
}

export default function MovementTimeline({ productId, limit = 30 }: { productId: string; limit?: number }) {
  const [events, setEvents] = useState<MovementEventView[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!productId) return
    setIsLoading(true)
    setError(null)
    fetch(`/api/inventory/products/${productId}/timeline?limit=${limit}`)
      .then(r => r.json())
      .then(json => {
        if (json.error) setError(json.error.message)
        else setEvents(json.data ?? [])
      })
      .catch(() => setError('Failed to load timeline'))
      .finally(() => setIsLoading(false))
  }, [productId, limit])

  if (isLoading) {
    return <div className="text-sm text-gray-400 py-6 text-center">Loading activity...</div>
  }

  if (error) {
    return <div className="text-sm text-red-500 py-6 text-center">{error}</div>
  }

  if (events.length === 0) {
    return <div className="text-sm text-gray-500 py-6 text-center">No activity recorded yet.</div>
  }

  const groups: Array<{ label: string; events: MovementEventView[] }> = []
  for (const ev of events) {
    const label = dateLabel(ev.created_at)
    const last = groups[groups.length - 1]
    if (last && last.label === label) {
      last.events.push(ev)
    } else {
      groups.push({ label, events: [ev] })
    }
  }

  return (
    <div className="space-y-4">
      {groups.map(group => (
        <div key={group.label}>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{group.label}</h4>
          <div className="space-y-1">
            {group.events.map(ev => {
              const qty = ev.quantity
              const isPositive = qty > 0
              const time = new Date(ev.created_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
              const reason = ev.reason_notes || (ev.reason_type ? ev.reason_type.replace('_', ' ') : '')
              const reference = referenceLabel(ev.reference_type, ev.reference_id)
              return (
                <div key={ev.id} className="flex items-baseline gap-3 text-sm py-1 border-b border-gray-100 last:border-0">
                  <span className="text-xs text-gray-400 w-12 shrink-0">{time}</span>
                  <span className={`font-mono font-semibold w-24 shrink-0 text-right ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                    {isPositive ? '+' : ''}{qty.toFixed(2)}
                  </span>
                  <span className="text-gray-800 capitalize">{ev.transaction_type.replace('_', ' ')}</span>
                  <span className="text-gray-500 truncate flex-1">
                    {reason}
                    {reference && <span className="text-gray-400"> · {reference}</span>}
                  </span>
                  {ev.cost_centre_name && (
                    <span className="text-xs text-gray-400 shrink-0">{ev.cost_centre_name}</span>
                  )}
                  {ev.performed_by && (
                    <span className="text-xs text-gray-400 shrink-0">{ev.performed_by}</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
