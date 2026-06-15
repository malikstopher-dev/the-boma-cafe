'use client'

import BackButton from '@/components/admin/BackButton'
import { useState, useEffect, useMemo } from 'react'

interface Booking {
  id: string
  name: string
  phone: string
  email: string
  booking_date: string
  booking_time: string
  guests: number
  notes: string | null
  status: string
  created_at: string
}

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    loadBookings()
  }, [])

  const loadBookings = async () => {
    try {
      const res = await fetch('/api/supabase/bookings')
      if (res.ok) {
        const data = await res.json()
        setBookings(data)
      }
    } catch (err) {
      console.error('Error loading bookings:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const filtered = useMemo(() => {
    let result = bookings
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(b => b.name.toLowerCase().includes(q))
    }
    if (statusFilter) {
      result = result.filter(b => b.status === statusFilter)
    }
    return result
  }, [bookings, search, statusFilter])

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/supabase/bookings?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        setBookings(bookings.map(b => b.id === id ? { ...b, status } : b))
      }
    } catch (err) {
      console.error('Error updating booking:', err)
    }
  }

  const deleteBooking = async (id: string) => {
    if (!confirm('Delete this booking?')) return
    try {
      const res = await fetch(`/api/supabase/bookings?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setBookings(bookings.filter(b => b.id !== id))
      }
    } catch (err) {
      console.error('Error deleting booking:', err)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b'
      case 'confirmed': return '#10b981'
      case 'cancelled': return '#ef4444'
      case 'completed': return '#6b7280'
      default: return '#6b7280'
    }
  }

  const statuses = ['pending', 'confirmed', 'cancelled', 'completed']

  if (isLoading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <BackButton />
        <h1 style={{ fontSize: '2rem', color: 'var(--dark-brown)' }}>Table Bookings</h1>
        <p style={{ color: 'var(--text-light)' }}>{filtered.length} booking{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', maxWidth: '300px', boxSizing: 'border-box',
            padding: '0.75rem 1rem', borderRadius: '10px',
            border: '2px solid var(--beige-dark)', background: 'var(--white)',
            fontSize: '0.95rem',
          }}
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{
            padding: '0.75rem 1rem', borderRadius: '10px',
            border: '2px solid var(--beige-dark)', background: 'var(--white)',
            fontSize: '0.95rem',
          }}
        >
          <option value="">All statuses</option>
          {statuses.map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: 'var(--white)', padding: '3rem', borderRadius: '16px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-light)' }}>
            {bookings.length === 0
              ? 'No bookings yet. Bookings from the website will appear here.'
              : 'No bookings match your search or filter.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {filtered.map(booking => (
            <div key={booking.id} style={{ background: 'var(--white)', padding: '1.5rem', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--dark-brown)', marginBottom: '0.25rem' }}>{booking.name}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>{booking.email} • {booking.phone}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, background: `${getStatusColor(booking.status)}20`, color: getStatusColor(booking.status) }}>
                    {booking.status}
                  </span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
                <div><strong>Date:</strong> {booking.booking_date}</div>
                <div><strong>Time:</strong> {booking.booking_time}</div>
                <div><strong>Guests:</strong> {booking.guests}</div>
                <div><strong>Booked:</strong> {new Date(booking.created_at).toLocaleDateString()}</div>
              </div>
              {booking.notes && <p style={{ fontSize: '0.9rem', color: 'var(--text)', fontStyle: 'italic', marginBottom: '1rem' }}>Notes: {booking.notes}</p>}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {booking.status === 'pending' && (
                  <>
                    <button onClick={() => updateStatus(booking.id, 'confirmed')} style={{ padding: '0.5rem 1rem', background: '#d1fae5', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#065f46', fontSize: '0.85rem', fontWeight: 600 }}>Confirm</button>
                    <button onClick={() => updateStatus(booking.id, 'cancelled')} style={{ padding: '0.5rem 1rem', background: '#fee2e2', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#dc2626', fontSize: '0.85rem', fontWeight: 600 }}>Cancel</button>
                  </>
                )}
                {booking.status === 'confirmed' && (
                  <button onClick={() => updateStatus(booking.id, 'completed')} style={{ padding: '0.5rem 1rem', background: '#e5e7eb', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#374151', fontSize: '0.85rem', fontWeight: 600 }}>Mark Completed</button>
                )}
                <button onClick={() => deleteBooking(booking.id)} style={{ padding: '0.5rem 1rem', background: '#fee2e2', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#dc2626', fontSize: '0.85rem' }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
