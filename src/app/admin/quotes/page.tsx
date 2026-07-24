'use client'

import { useState, useEffect, useMemo } from 'react'
import { PageHeader } from '@/components/admin/design-system/PageHeader'
import Button from '@/components/admin/design-system/Button'
import { Input, Select } from '@/components/admin/design-system/Input'
import Badge from '@/components/admin/design-system/Badge'
import { SkeletonCard } from '@/components/admin/design-system/Skeleton'
import EmptyState from '@/components/admin/design-system/EmptyState'

const STATUSES = ['draft', 'sent', 'accepted', 'expired', 'converted', 'cancelled'] as const

const STATUS_VARIANTS: Record<string, 'warning' | 'success' | 'danger' | 'default' | 'info'> = {
  draft: 'default',
  sent: 'warning',
  accepted: 'success',
  expired: 'danger',
  converted: 'info',
  cancelled: 'danger',
}

interface QuoteWithBooking {
  id: string
  quote_number: string
  status: string
  total: number
  deposit_amount: number
  valid_until: string
  created_at: string
  booking: {
    id: string
    name: string
    email: string
    phone: string
    booking_date: string
    booking_time: string
  } | null
}

export default function AdminQuotes() {
  const [quotes, setQuotes] = useState<QuoteWithBooking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    fetch('/api/admin/quotes')
      .then(r => r.json())
      .then(result => {
        setQuotes(result.data || [])
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let result = quotes
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(qt =>
        qt.quote_number.toLowerCase().includes(q) ||
        qt.booking?.name.toLowerCase().includes(q) ||
        qt.booking?.email.toLowerCase().includes(q)
      )
    }
    if (statusFilter) {
      result = result.filter(qt => qt.status === statusFilter)
    }
    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [quotes, search, statusFilter])

  return (
    <div>
      <PageHeader title="Quotes" description={`${filtered.length} quotation${filtered.length !== 1 ? 's' : ''}`} />

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <Input placeholder="Search by quote # or customer..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ minWidth: 160 }}>
          <Select
            options={[{ value: '', label: 'All Statuses' }, ...STATUSES.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))]}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gap: 12 }}><SkeletonCard /><SkeletonCard /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="📄" title="No quotes yet" description="Quotations will appear here when customers submit booking requests" />
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {filtered.map(quote => (
            <div key={quote.id} style={{
              background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12, padding: 20,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#0F172A' }}>#{quote.quote_number}</span>
                    <Badge variant={STATUS_VARIANTS[quote.status] || 'default'}>{quote.status}</Badge>
                  </div>
                  {quote.booking && (
                    <span style={{ fontSize: 13, color: '#94A3B8' }}>
                      {quote.booking.name} · {quote.booking.email}
                    </span>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>
                    R {Number(quote.total).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 12, color: '#94A3B8' }}>
                    Deposit: R {Number(quote.deposit_amount).toLocaleString()}
                  </div>
                </div>
              </div>

              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: 8, marginBottom: 12, fontSize: 13, color: '#475569',
              }}>
                {quote.booking && (
                  <>
                    <div><strong>Date:</strong> {quote.booking.booking_date}</div>
                    <div><strong>Time:</strong> {quote.booking.booking_time}</div>
                  </>
                )}
                <div><strong>Valid until:</strong> {quote.valid_until}</div>
                <div><strong>Created:</strong> {new Date(quote.created_at).toLocaleDateString()}</div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="primary" size="sm">View Details</Button>
                <Button variant="ghost" size="sm">Resend</Button>
                {quote.status === 'draft' && (
                  <Button variant="ghost" size="sm" onClick={async () => {
                    await fetch(`/api/admin/quotes?id=${quote.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ status: 'sent' }),
                    })
                    setQuotes(quotes.map(q => q.id === quote.id ? { ...q, status: 'sent' } : q))
                  }}>
                    Mark Sent
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}