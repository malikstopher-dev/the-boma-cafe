'use client'

import { useState, useEffect, useMemo } from 'react'
import { PageHeader } from '@/components/admin/design-system/PageHeader'
import Button from '@/components/admin/design-system/Button'
import { Input, Select } from '@/components/admin/design-system/Input'
import Badge from '@/components/admin/design-system/Badge'
import { SkeletonCard } from '@/components/admin/design-system/Skeleton'
import EmptyState from '@/components/admin/design-system/EmptyState'
import ConfirmDialog from '@/components/admin/design-system/ConfirmDialog'
import { useToast } from '@/components/admin/design-system/Toast'

const STATUSES = ['draft', 'quote_sent', 'awaiting_deposit', 'deposit_paid', 'confirmed', 'in_progress', 'completed', 'cancelled', 'refunded'] as const

interface BookingFull {
  id: string
  name: string
  phone: string
  email: string
  booking_date: string
  booking_time: string
  guests: number
  adults: number | null
  children: number
  notes: string | null
  special_requests: string | null
  status: string
  source: string
  duration_hours: number | null
  created_at: string
  booking_type?: { name: string; slug: string } | null
  venue_area?: { name: string } | null
  customer?: { id: string; total_bookings: number; total_spend: number } | null
  quote?: { id: string; quote_number: string; total: number; status: string } | null
}

const STATUS_VARIANTS: Record<string, 'warning' | 'success' | 'danger' | 'default' | 'info'> = {
  draft: 'default',
  quote_sent: 'warning',
  awaiting_deposit: 'warning',
  deposit_paid: 'info',
  confirmed: 'success',
  in_progress: 'info',
  completed: 'success',
  cancelled: 'danger',
  refunded: 'danger',
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['quote_sent', 'cancelled'],
  quote_sent: ['awaiting_deposit', 'cancelled'],
  awaiting_deposit: ['deposit_paid', 'cancelled'],
  deposit_paid: ['confirmed', 'cancelled', 'refunded'],
  confirmed: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: ['refunded'],
  refunded: [],
}

export default function AdminBookings() {
  const [bookings, setBookings] = useState<BookingFull[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [deleteTarget, setDeleteTarget] = useState<BookingFull | null>(null)
  const [statusTarget, setStatusTarget] = useState<{ booking: BookingFull; status: string } | null>(null)
  const { success, error: showError } = useToast()

  useEffect(() => {
    fetch('/api/supabase/bookings')
      .then(r => r.json())
      .then((data) => {
        setBookings(Array.isArray(data) ? data : [])
      })
      .catch(() => showError('Failed to load bookings'))
      .finally(() => setIsLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let result = bookings
    if (activeTab !== 'all') {
      result = result.filter(b => b.status === activeTab)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(b =>
        b.name.toLowerCase().includes(q) ||
        b.email.toLowerCase().includes(q) ||
        b.phone.includes(q)
      )
    }
    if (statusFilter) {
      result = result.filter(b => b.status === statusFilter)
    }
    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [bookings, search, statusFilter, activeTab])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const b of bookings) {
      counts[b.status] = (counts[b.status] || 0) + 1
    }
    return counts
  }, [bookings])

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch('/api/booking/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: id, new_status: newStatus }),
      })
      if (res.ok) {
        setBookings(bookings.map(b => b.id === id ? { ...b, status: newStatus } : b))
        success(`Booking ${newStatus.replace('_', ' ')}`)
      } else {
        const data = await res.json()
        showError(data.error || 'Failed to update')
      }
    } catch {
      showError('Failed to update booking')
    }
    setStatusTarget(null)
  }

  const deleteBooking = async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/supabase/bookings?id=${deleteTarget.id}`, { method: 'DELETE' })
      if (res.ok) {
        setBookings(bookings.filter(b => b.id !== deleteTarget.id))
        success('Booking deleted')
      }
    } catch {
      showError('Failed to delete')
    }
    setDeleteTarget(null)
  }

  const tabs = [
    { id: 'all', label: 'All', count: bookings.length },
    ...STATUSES.map(s => ({
      id: s,
      label: s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      count: statusCounts[s] || 0,
    })),
  ]

  return (
    <div>
      <PageHeader title="Bookings" description={`${filtered.length} booking${filtered.length !== 1 ? 's' : ''}`} />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: activeTab === tab.id ? '#0F766E' : '#F1F3F7',
              color: activeTab === tab.id ? '#fff' : '#475569',
              fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {tab.label}
            <span style={{
              background: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : '#E5E7EB',
              padding: '1px 6px', borderRadius: 9999, fontSize: 11,
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <Input placeholder="Search by name, email, phone..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ minWidth: 160 }}>
          <Select
            options={[{ value: '', label: 'Filter by status' }, ...STATUSES.map(s => ({ value: s, label: s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) }))]}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gap: 12 }}><SkeletonCard /><SkeletonCard /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="📅"
          title={bookings.length === 0 ? 'No bookings yet' : 'No matches'}
          description={bookings.length === 0 ? 'Bookings from the website will appear here' : 'Try adjusting your search'}
        />
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {filtered.map(booking => {
            const transitions = VALID_TRANSITIONS[booking.status] || []
            return (
              <div key={booking.id} style={{
                background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12, padding: 20,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: '#0F172A' }}>{booking.name}</span>
                      <Badge variant={STATUS_VARIANTS[booking.status] || 'default'}>
                        {booking.status.replace(/_/g, ' ')}
                      </Badge>
                      {booking.quote && (
                        <span style={{ padding: '2px 8px', borderRadius: 4, background: '#EFF6FF', color: '#1E40AF', fontSize: 12, fontWeight: 500 }}>
                          #{booking.quote.quote_number}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 13, color: '#94A3B8' }}>
                      {booking.email} · {booking.phone}
                      {booking.source && ` · via ${booking.source}`}
                    </span>
                  </div>
                  {booking.quote && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
                        R {Number(booking.quote.total).toLocaleString()}
                      </div>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>
                        {booking.quote.status}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: 8, marginBottom: 12, fontSize: 13, color: '#475569',
                }}>
                  <div><strong>Date:</strong> {booking.booking_date}</div>
                  <div><strong>Time:</strong> {booking.booking_time}{booking.duration_hours ? ` (${booking.duration_hours}h)` : ''}</div>
                  <div><strong>Guests:</strong> {booking.guests}{booking.adults ? ` (${booking.adults} adults, ${booking.children} children)` : ''}</div>
                  <div><strong>Type:</strong> {booking.booking_type?.name || '—'}</div>
                  <div><strong>Area:</strong> {booking.venue_area?.name || '—'}</div>
                  <div><strong>Booked:</strong> {new Date(booking.created_at).toLocaleDateString()}</div>
                </div>

                {(booking.notes || booking.special_requests) && (
                  <p style={{ fontSize: 13, color: '#475569', fontStyle: 'italic', marginBottom: 12 }}>
                    Notes: {booking.special_requests || booking.notes}
                  </p>
                )}

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {transitions.map(status => (
                    <Button
                      key={status}
                      variant={status === 'cancelled' ? 'ghost' : 'primary'}
                      size="sm"
                      onClick={() => setStatusTarget({ booking, status })}
                      style={status === 'cancelled' ? { color: '#EF4444' } : undefined}
                    >
                      {status === 'cancelled' ? 'Cancel' :
                       status === 'refunded' ? 'Refund' :
                       `Mark ${status.replace(/_/g, ' ')}`}
                    </Button>
                  ))}
                  <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(booking)} style={{ color: '#EF4444', marginLeft: 'auto' }}>
                    Delete
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!statusTarget}
        title={`Update Booking Status`}
        message={`Change "${statusTarget?.booking.name}" status to "${statusTarget?.status.replace(/_/g, ' ')}"?`}
        confirmLabel="Update"
        onConfirm={() => statusTarget && updateStatus(statusTarget.booking.id, statusTarget.status)}
        onCancel={() => setStatusTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Booking"
        message={`Delete booking for "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={deleteBooking}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}