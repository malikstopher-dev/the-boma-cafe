'use client'

import { useState, useEffect, useCallback } from 'react'
import PosButton from '@/components/pos/PosButton'
import {
  BOOKING_LIVE_EVENTS,
  applyBookingStatusToFeed,
  bookingEventNeedsFetch,
  sanitizeWaiterBooking,
  subscribeToBookingEvents,
  upsertWaiterBooking,
  type WaiterBooking,
} from '@/inventory/lib/booking-status'

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  confirmed: { label: 'Confirmed', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  in_progress: { label: 'In Progress', color: '#60a5fa', bg: 'rgba(59,130,246,0.15)' },
  completed: { label: 'Completed', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
}

export default function WaiterBookingsPage() {
  const [bookings, setBookings] = useState<WaiterBooking[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadBookings = useCallback(async () => {
    try {
      const res = await fetch('/api/staff/bookings')
      if (res.status === 401) {
        setError('Sign in to view bookings')
        return
      }
      if (!res.ok) return
      const data = await res.json()
      setBookings((data.bookings || []).map((b: any) => sanitizeWaiterBooking(b)).filter(Boolean))
    } catch { /* keep last feed */ }
  }, [])

  const fetchOne = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/staff/bookings?id=${encodeURIComponent(id)}`)
      if (!res.ok) return
      const data = await res.json()
      if (!data.booking) return
      const row = sanitizeWaiterBooking(data.booking)
      if (row) setBookings((prev) => upsertWaiterBooking(prev, row))
    } catch { /* keep last feed */ }
  }, [])

  // E1-3: realtime is the PRIMARY mechanism — no polling.
  // Mount fetch + visibility-return refetch + manual Refresh are the
  // conservative fallbacks if realtime is unavailable.
  useEffect(() => {
    setLoading(true)
    void loadBookings().finally(() => setLoading(false))

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void loadBookings()
    }
    document.addEventListener('visibilitychange', onVisibility)

    const sub = subscribeToBookingEvents({
      channel: 'e1-waiter-bookings',
      events: BOOKING_LIVE_EVENTS,
      onEvent: (eventName, entityId) => {
        if (!entityId) return
        setBookings((prev) => applyBookingStatusToFeed(prev, eventName, entityId))
        if (bookingEventNeedsFetch(eventName)) void fetchOne(entityId)
      },
    })

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      sub.unsubscribe()
    }
  }, [loadBookings, fetchOne])

  const sorted = [...bookings].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1
    if (a.time !== b.time) return a.time < b.time ? -1 : 1
    return 0
  })

  return (
    <div style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto', fontFamily: 'var(--pos-font)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--pos-text)' }}>📅 Upcoming Bookings</h2>
        <PosButton variant="ghost" size="sm" onClick={loadBookings}>Refresh</PosButton>
      </div>

      {error && (
        <div style={{ padding: '0.6rem', marginBottom: '0.75rem', borderRadius: 'var(--pos-radius-md)', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: '0.8rem', textAlign: 'center' }}>{error}</div>
      )}

      {loading && bookings.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--pos-text-dim)', fontSize: '0.85rem' }}>
          Loading bookings...
        </div>
      )}

      {!loading && bookings.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--pos-text-dim)', fontSize: '0.85rem' }}>
          No confirmed bookings yet — they&apos;ll appear here as soon as a manager confirms them.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {sorted.map((b) => {
          const label = STATUS_LABELS[b.status] || { label: b.status, color: 'var(--pos-text-dim)', bg: 'var(--pos-border)' }
          return (
            <div key={b.id} style={{
              background: 'var(--pos-card)', borderRadius: 'var(--pos-radius-lg)', padding: '0.75rem',
              border: '1px solid var(--pos-border)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontFamily: 'var(--pos-font-mono)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--pos-amber)' }}>
                  #{b.reference}
                </span>
                <span style={{ padding: '0.15rem 0.5rem', borderRadius: 'var(--pos-radius-full)', background: label.bg, color: label.color, fontSize: '0.7rem', fontWeight: 700 }}>
                  {label.label}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--pos-text-secondary)' }}>
                <span>📅 {b.date}</span>
                <span>🕐 {b.time}</span>
                <span>👥 {b.guests} guest{b.guests !== 1 ? 's' : ''}</span>
                {b.location && <span>📍 {b.location}</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}