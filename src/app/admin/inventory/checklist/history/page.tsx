'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Badge from '@/components/admin/design-system/Badge'

interface HistoryEntry {
  id: string
  location_id: string
  checklist_date: string
  status: string
  opened_at: string
  completed_at: string | null
  manager_notes: string | null
}

const statusBadge: Record<string, { variant: 'success' | 'warning' | 'info'; label: string }> = {
  completed: { variant: 'success', label: 'Completed' },
  in_progress: { variant: 'warning', label: 'In Progress' },
  skipped: { variant: 'info', label: 'Skipped' },
}

export default function ChecklistHistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/inventory/checklist/history?location_id=main&limit=60')
      .then(r => r.json())
      .then(json => setEntries(json.data ?? []))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <AdminPage title="Checklist History" subtitle="Past opening checklists">
      <div className="p-6">
        {isLoading ? (
          <div className="text-gray-400">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="text-gray-500 text-center py-12">No checklists found</div>
        ) : (
          <div className="space-y-2">
            {entries.map(entry => {
              const badge = statusBadge[entry.status] ?? { variant: 'info' as const, label: entry.status }
              return (
                <Link
                  key={entry.id}
                  href={`/admin/inventory/checklist`}
                  className="flex items-center gap-4 p-3 rounded-lg bg-gray-800/50 border border-gray-700/50 hover:bg-gray-700/50 transition-colors"
                >
                  <span className="text-white font-medium w-32">
                    {new Date(entry.checklist_date).toLocaleDateString('en-ZA')}
                  </span>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                  <span className="text-xs text-gray-500">
                    {entry.completed_at
                      ? `Completed ${new Date(entry.completed_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}`
                      : `Opened ${new Date(entry.opened_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}`
                    }
                  </span>
                  {entry.manager_notes && (
                    <span className="text-xs text-gray-400 truncate flex-1 ml-2">{entry.manager_notes}</span>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </AdminPage>
  )
}
