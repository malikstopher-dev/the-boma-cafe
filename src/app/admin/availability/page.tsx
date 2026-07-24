'use client'

import { useState, useEffect, useMemo } from 'react'
import { PageHeader } from '@/components/admin/design-system/PageHeader'
import Button from '@/components/admin/design-system/Button'
import { Input, Select } from '@/components/admin/design-system/Input'
import { SkeletonCard } from '@/components/admin/design-system/Skeleton'
import EmptyState from '@/components/admin/design-system/EmptyState'
import ConfirmDialog from '@/components/admin/design-system/ConfirmDialog'
import { useToast } from '@/components/admin/design-system/Toast'

interface BlockedDate {
  id: string
  venue_area_id: string | null
  start_date: string
  end_date: string
  reason: string | null
  is_recurring: boolean
  recurring_pattern: string | null
  venue_area?: { name: string } | null
}

interface VenueArea {
  id: string
  name: string
}

export default function AdminAvailability() {
  const [activeView, setActiveView] = useState<'calendar' | 'blocked'>('blocked')
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([])
  const [venueAreas, setVenueAreas] = useState<VenueArea[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<BlockedDate | null>(null)
  const { success, error: showError } = useToast()

  const [form, setForm] = useState({
    venue_area_id: '',
    start_date: '',
    end_date: '',
    reason: '',
    is_recurring: false,
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/blocked-dates').then(r => r.json()),
      fetch('/api/booking/config').then(r => r.json()),
    ])
      .then(([blocked, config]) => {
        setBlockedDates(Array.isArray(blocked) ? blocked : [])
        setVenueAreas(config.venue_areas || [])
      })
      .catch(() => showError('Failed to load data'))
      .finally(() => setIsLoading(false))
  }, [])

  const handleCreate = async () => {
    if (!form.start_date || !form.end_date) return
    try {
      const res = await fetch('/api/admin/blocked-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const newBlock = await res.json()
        setBlockedDates(prev => [newBlock, ...prev])
        setShowForm(false)
        setForm({ venue_area_id: '', start_date: '', end_date: '', reason: '', is_recurring: false })
        success('Blocked date created')
      }
    } catch {
      showError('Failed to create')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/admin/blocked-dates?id=${deleteTarget.id}`, { method: 'DELETE' })
      if (res.ok) {
        setBlockedDates(blockedDates.filter(d => d.id !== deleteTarget.id))
        success('Blocked date removed')
      }
    } catch {
      showError('Failed to delete')
    }
    setDeleteTarget(null)
  }

  const sortedDates = useMemo(() =>
    [...blockedDates].sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()),
    [blockedDates]
  )

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Blocked Dates" description="Manage venue availability" />
        <div style={{ display: 'grid', gap: 12, marginTop: 20 }}><SkeletonCard /><SkeletonCard /></div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Blocked Dates" description="Block dates when venue areas are unavailable"
        actions={<Button variant="primary" size="sm" onClick={() => setShowForm(true)}>+ Block Date</Button>}
      />

      {/* Create form */}
      {showForm && (
        <div style={{
          background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12, padding: 20, marginBottom: 20,
        }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 16 }}>New Blocked Date</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 4 }}>Venue Area</label>
              <select
                value={form.venue_area_id}
                onChange={e => setForm(prev => ({ ...prev, venue_area_id: e.target.value }))}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #E5E7EB',
                  fontSize: 13, background: '#F8F9FB',
                }}
              >
                <option value="">All Areas</option>
                {venueAreas.map(area => (
                  <option key={area.id} value={area.id}>{area.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 4 }}>Start Date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => setForm(prev => ({ ...prev, start_date: e.target.value }))}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #E5E7EB',
                  fontSize: 13, background: '#F8F9FB', boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 4 }}>End Date</label>
              <input
                type="date"
                value={form.end_date}
                onChange={e => setForm(prev => ({ ...prev, end_date: e.target.value }))}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #E5E7EB',
                  fontSize: 13, background: '#F8F9FB', boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 4 }}>Reason</label>
              <input
                type="text"
                value={form.reason}
                onChange={e => setForm(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="e.g. Private event, maintenance"
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #E5E7EB',
                  fontSize: 13, background: '#F8F9FB', boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={handleCreate} disabled={!form.start_date || !form.end_date}>Create</Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {sortedDates.length === 0 ? (
        <EmptyState icon="🗓️" title="No blocked dates" description="Add blocked dates to prevent bookings on specific days" />
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {sortedDates.map(date => (
            <div key={date.id} style={{
              background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12, padding: 16,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>
                    {new Date(date.start_date).toLocaleDateString()} – {new Date(date.end_date).toLocaleDateString()}
                  </span>
                  {date.venue_area && (
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, background: '#F1F3F7',
                      fontSize: 11, color: '#475569',
                    }}>
                      {date.venue_area.name}
                    </span>
                  )}
                  {!date.venue_area && (
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, background: '#FEF2F2',
                      fontSize: 11, color: '#EF4444',
                    }}>
                      All Areas
                    </span>
                  )}
                </div>
                {date.reason && <p style={{ fontSize: 13, color: '#475569' }}>{date.reason}</p>}
                {date.is_recurring && <p style={{ fontSize: 12, color: '#94A3B8' }}>Recurring: {date.recurring_pattern || 'Weekly'}</p>}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(date)} style={{ color: '#EF4444' }}>
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove Blocked Date"
        message={`Remove this blocked date?`}
        confirmLabel="Remove"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}