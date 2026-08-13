'use client'

import { useState, useEffect, useMemo } from 'react'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Button from '@/components/admin/design-system/Button'
import { Input, Select } from '@/components/admin/design-system/Input'
import Badge from '@/components/admin/design-system/Badge'
import { SkeletonCard } from '@/components/admin/design-system/Skeleton'
import EmptyState from '@/components/admin/design-system/EmptyState'
import { useToast } from '@/components/admin/design-system/Toast'

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
  pdf_path: string | null
  storage_path: string | null
  pdf_version: number | null
  version: number
  version_count: number
  is_expired: boolean
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
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const { success, error: showError } = useToast()

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

  const regeneratePdf = async (quoteId: string) => {
    setActionLoading(`regenerate-${quoteId}`)
    try {
      const res = await fetch(`/api/admin/quotes/${quoteId}/regenerate-pdf`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        if (data.queued) {
          setQuotes(quotes.map(q => q.id === quoteId ? {
            ...q,
            pdf_version: data.pdf_version,
            version: data.version,
          } : q))
          success('PDF regeneration queued — it will appear here shortly')
        } else {
          setQuotes(quotes.map(q => q.id === quoteId ? {
            ...q,
            ...(data.pdf_path ? { pdf_path: data.pdf_path } : {}),
            ...(data.storage_path ? { storage_path: data.storage_path } : {}),
            pdf_version: data.pdf_version ?? q.pdf_version,
            version: data.version ?? q.version,
          } : q))
          success('PDF regenerated successfully')
        }
      } else {
        showError(data.error || 'Failed to regenerate PDF')
      }
    } catch {
      showError('Failed to regenerate PDF')
    }
    setActionLoading(null)
  }

  const resendQuotation = async (quoteId: string) => {
    setActionLoading(`resend-${quoteId}`)
    try {
      const res = await fetch(`/api/admin/quotes/${quoteId}/resend`, { method: 'POST' })
      const data = await res.json()
      if (data.customer_email_sent || data.admin_email_sent) {
        setQuotes(quotes.map(q => q.id === quoteId ? { ...q, status: 'sent' } : q))
        success('Quotation resent')
      } else {
        showError(data.error || 'Failed to resend quotation')
      }
    } catch {
      showError('Failed to resend quotation')
    }
    setActionLoading(null)
  }

  const downloadPdf = (quoteId: string) => {
    window.open(`/api/admin/quotes/${quoteId}/download`, '_blank')
  }

  return (
    <AdminPage title="Quotes" description={`${filtered.length} quotation${filtered.length !== 1 ? 's' : ''}`}>

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
              background: '#12121A', border: '1px solid #1E1E2A', borderRadius: 12, padding: 20,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#F0EDE8' }}>#{quote.quote_number}</span>
                    <Badge variant={STATUS_VARIANTS[quote.status] || 'default'}>{quote.status}</Badge>
                    {quote.storage_path && (
                      <span style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(212,168,67,0.08)', color: '#D4A843', fontSize: 11, fontWeight: 500 }}>
                        PDF v{quote.pdf_version || 1}
                      </span>
                    )}
                  </div>
                  {quote.booking && (
                    <span style={{ fontSize: 13, color: '#5A5666' }}>
                      {quote.booking.name} · {quote.booking.email}
                    </span>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                    {quote.is_expired && quote.status === 'sent' && (
                      <span style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(248,113,113,0.08)', color: '#F87171', fontSize: 11, fontWeight: 500 }}>
                        EXPIRED
                      </span>
                    )}
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#F0EDE8' }}>
                      R {Number(quote.total).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#5A5666' }}>
                    Deposit: R {Number(quote.deposit_amount).toLocaleString()}
                  </div>
                </div>
              </div>

              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: 8, marginBottom: 12, fontSize: 13, color: '#8A8694',
              }}>
                {quote.booking && (
                  <>
                    <div><strong>Date:</strong> {quote.booking.booking_date}</div>
                    <div><strong>Time:</strong> {quote.booking.booking_time}</div>
                  </>
                )}
                <div>
                  <strong>Valid until:</strong> {quote.valid_until}
                  {quote.is_expired && <span style={{ color: '#F87171', fontWeight: 600 }}> (expired)</span>}
                </div>
                <div><strong>Created:</strong> {new Date(quote.created_at).toLocaleDateString()}</div>
                {quote.version_count > 0 && (
                  <div><strong>Versions:</strong> {quote.version_count} PDF(s) generated</div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button variant="primary" size="sm" onClick={() => downloadPdf(quote.id)} disabled={!quote.storage_path}>
                  {quote.storage_path ? 'View PDF' : 'No PDF'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => downloadPdf(quote.id)} disabled={!quote.storage_path}>
                  Download
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => resendQuotation(quote.id)}
                  disabled={actionLoading === `resend-${quote.id}`}
                >
                  {actionLoading === `resend-${quote.id}` ? 'Sending...' : 'Email PDF'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => regeneratePdf(quote.id)}
                  disabled={actionLoading === `regenerate-${quote.id}`}
                >
                  {actionLoading === `regenerate-${quote.id}` ? 'Generating...' : 'Regenerate PDF'}
                </Button>
                {quote.status === 'draft' && (
                  <Button variant="ghost" size="sm" onClick={async () => {
                    try {
                      const res = await fetch(`/api/admin/quotes?id=${quote.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'sent' }),
                      })
                      if (!res.ok) {
                        const err = await res.json().catch(() => null)
                        showError(err?.error?.message || 'Failed to mark as sent')
                        return
                      }
                      setQuotes(quotes.map(q => q.id === quote.id ? { ...q, status: 'sent' } : q))
                    } catch {
                      showError('Failed to mark as sent')
                    }
                  }}>
                    Mark Sent
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminPage>
  )
}
