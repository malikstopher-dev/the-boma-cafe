'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Badge from '@/components/admin/design-system/Badge'

type HistoryEntry = {
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
    <AdminPage title="Checklist History" description="Past opening checklists">
      <div className="p-6">
        {isLoading ? (
          <div style={{color:'#A09888',fontFamily:'Inter, sans-serif'}}>Loading...</div>
        ) : entries.length === 0 ? (
          <div style={{color:'#A09888',textAlign:'center',padding:'48px 0',fontFamily:'Inter, sans-serif'}}>No checklists found</div>
        ) : (
          <div className="space-y-2">
            {entries.map(entry => {
              const badge = statusBadge[entry.status] ?? { variant: 'info' as const, label: entry.status }
              return (
                <Link
                  key={entry.id}
                  href={`/admin/operations`}
                  className="flex items-center gap-4 p-3 rounded-lg transition-colors"
                  style={{background:'#242018',border:'1px solid #3A3428'}}
                >
                  <span style={{color:'#F0EBE3',fontWeight:500,width:128,fontFamily:'Inter, sans-serif'}}>
                    {new Date(entry.checklist_date).toLocaleDateString('en-ZA')}
                  </span>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                  <span style={{fontSize:12,color:'#6B6358',fontFamily:'Inter, sans-serif'}}>
                    {entry.completed_at
                      ? `Completed ${new Date(entry.completed_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}`
                      : `Opened ${new Date(entry.opened_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}`
                    }
                  </span>
                  {entry.manager_notes && (
                    <span style={{fontSize:12,color:'#A09888',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1,marginLeft:8,fontFamily:'Inter, sans-serif'}}>{entry.manager_notes}</span>
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
