'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import styles from './page.module.css'

interface QuoteData {
  payments_enabled: boolean
  quote: {
    id: string
    quote_number: string
    status: string
    subtotal: number
    tax_rate: number
    tax_amount: number
    total: number
    deposit_percentage: number
    deposit_amount: number
    balance_amount: number
    valid_until: string
    issued_at: string
    is_expired: boolean
    pdf_version: number | null
  }
  booking: {
    id: string
    name: string
    phone: string
    email: string
    booking_type: string
    venue_area: string
    booking_date: string
    booking_time: string
    guests: number
    status: string
  } | null
  items: Array<{
    label: string
    description: string | null
    item_type: string
    quantity: number
    unit_price: number
    total_price: number
  }>
  formatted: {
    total: string
    subtotal: string
    tax: string
    deposit: string
    balance: string
  }
}

interface TimelineStage {
  key: string
  label: string
  status: 'done' | 'active' | 'pending'
}

const STAGES: TimelineStage[] = [
  { key: 'created', label: 'Quotation Created', status: 'done' },
  { key: 'sent', label: 'Email Sent', status: 'done' },
  { key: 'viewed', label: 'Viewed', status: 'done' },
  { key: 'accepted', label: 'Accepted', status: 'pending' },
  { key: 'deposit', label: 'Deposit', status: 'pending' },
  { key: 'confirmed', label: 'Booking Confirmed', status: 'pending' },
  { key: 'completed', label: 'Event Completed', status: 'pending' },
]

function buildTimeline(quoteStatus: string, bookingStatus: string): TimelineStage[] {
  const stages = STAGES.map(s => ({ ...s }))

  const isAccepted = quoteStatus === 'accepted' || quoteStatus === 'converted'
  const isDepositPaid = ['deposit_paid', 'confirmed', 'in_progress', 'completed'].includes(bookingStatus)
  const isConfirmed = ['confirmed', 'in_progress', 'completed'].includes(bookingStatus)
  const isCompleted = bookingStatus === 'completed'

  for (const stage of stages) {
    if (stage.key === 'created') stage.status = 'done'
    else if (stage.key === 'sent') stage.status = quoteStatus !== 'draft' ? 'done' : 'pending'
    else if (stage.key === 'viewed') stage.status = 'done'
    else if (stage.key === 'accepted') stage.status = isAccepted ? 'done' : 'active'
    else if (stage.key === 'deposit') stage.status = isDepositPaid ? 'done' : isAccepted ? 'active' : 'pending'
    else if (stage.key === 'confirmed') stage.status = isConfirmed ? 'done' : isDepositPaid ? 'active' : 'pending'
    else if (stage.key === 'completed') stage.status = isCompleted ? 'done' : isConfirmed ? 'active' : 'pending'
  }

  return stages
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  quote_sent: 'Quote Sent',
  awaiting_deposit: 'Awaiting Deposit',
  deposit_paid: 'Deposit Paid',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
}

function StatusBadge({ status, isExpired }: { status: string; isExpired: boolean }) {
  if (isExpired || status === 'expired') {
    return <span className={`${styles.badge} ${styles.badgeExpired}`}>Expired</span>
  }
  switch (status) {
    case 'draft': return <span className={`${styles.badge} ${styles.badgeDraft}`}>Draft</span>
    case 'sent': return <span className={`${styles.badge} ${styles.badgeSent}`}>Valid</span>
    case 'accepted': return <span className={`${styles.badge} ${styles.badgeAccepted}`}>Accepted</span>
    case 'converted': return <span className={`${styles.badge} ${styles.badgeAccepted}`}>Confirmed</span>
    case 'cancelled': return <span className={`${styles.badge} ${styles.badgeExpired}`}>Cancelled</span>
    default: return <span className={styles.badge}>{status}</span>
  }
}

function Timeline({ stages }: { stages: TimelineStage[] }) {
  return (
    <div className={styles.timeline}>
      {stages.map((stage, i) => (
        <div key={stage.key} className={`${styles.timelineStep} ${styles[`step_${stage.status}`]}`}>
          <div className={styles.timelineIcon}>
            {stage.status === 'done' ? (
              <span className={styles.timelineCheck}>✓</span>
            ) : stage.status === 'active' ? (
              <span className={styles.timelineDot}>●</span>
            ) : (
              <span className={styles.timelineCircle}>○</span>
            )}
          </div>
          {i < STAGES.length - 1 && (
            <div className={`${styles.timelineLine} ${styles[`line_${stage.status}`]}`} />
          )}
          <span className={`${styles.timelineLabel} ${styles[`label_${stage.status}`]}`}>{stage.label}</span>
        </div>
      ))}
    </div>
  )
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${m} ${ampm}`
}

export default function BookingPortalPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const quoteNumber = params?.quoteNumber as string
  const token = searchParams?.get('token')

  const [data, setData] = useState<QuoteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [acceptError, setAcceptError] = useState<string | null>(null)

  useEffect(() => {
    if (!quoteNumber || !token) {
      setError('Invalid link. Please use the link from your email.')
      setLoading(false)
      return
    }
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/booking/portal?quoteNumber=${encodeURIComponent(quoteNumber)}&token=${encodeURIComponent(token)}`)
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || 'Failed to load quotation')
        }
        const json = await res.json()
        setData(json)
        if (json.quote.status === 'accepted' || json.quote.status === 'converted') {
          setAccepted(true)
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load quotation')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [quoteNumber, token])

  const handleAccept = useCallback(async () => {
    if (!quoteNumber || !token || !data) return
    setAccepting(true)
    setAcceptError(null)
    try {
      const res = await fetch('/api/booking/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteNumber, token }),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Failed to accept quotation')
      }
      setAccepted(true)
      setData(prev => prev ? { ...prev, quote: { ...prev.quote, status: 'accepted' } } : prev)
    } catch (err: any) {
      setAcceptError(err.message || 'Failed to accept quotation')
    } finally {
      setAccepting(false)
    }
  }, [quoteNumber, token, data])

  if (loading) {
    return (
      <>
        <Header />
        <main className={styles.main}>
          <div className={styles.container}>
            <div className={styles.loadingSpinner} />
            <p className={styles.loadingText}>Loading your quotation...</p>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  if (error) {
    return (
      <>
        <Header />
        <main className={styles.main}>
          <div className={styles.container}>
            <div className={styles.errorCard}>
              <div className={styles.errorIcon}>!</div>
              <h1 className={styles.errorTitle}>Unable to Load Quotation</h1>
              <p className={styles.errorMessage}>{error}</p>
              <p className={styles.errorHint}>If you believe this is an error, please contact The Boma Café.</p>
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  if (!data) return null

  const { quote, booking, items, formatted, payments_enabled } = data
  const canAccept = quote.status === 'sent' && !quote.is_expired && !accepted
  const bookingStatus = booking?.status || 'draft'
  const timeline = buildTimeline(quote.status, bookingStatus)
  const isAccepted = quote.status === 'accepted' || quote.status === 'converted'

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.headerSection}>
            <div className={styles.headerTop}>
              <h1 className={styles.quoteNumber}>{quote.quote_number}</h1>
              <StatusBadge status={quote.status} isExpired={!!quote.is_expired} />
            </div>
            {quote.is_expired && (
              <div className={styles.expiredBanner}>
                This quotation has expired. Please contact The Boma Café for an updated quotation.
              </div>
            )}
          </div>

          <div className={styles.timelineSection}>
            <Timeline stages={timeline} />
          </div>

          <div className={styles.grid}>
            <div className={styles.gridMain}>
              {booking && (
                <div className={styles.card}>
                  <h2 className={styles.cardTitle}>Event Details</h2>
                  <div className={styles.detailGrid}>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Event Type</span>
                      <span className={styles.detailValue}>{booking.booking_type}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Venue Area</span>
                      <span className={styles.detailValue}>{booking.venue_area}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Date</span>
                      <span className={styles.detailValue}>{formatDate(booking.booking_date)}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Time</span>
                      <span className={styles.detailValue}>{formatTime(booking.booking_time)}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Guests</span>
                      <span className={styles.detailValue}>{booking.guests}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Status</span>
                      <span className={styles.detailValue}>{STATUS_LABELS[booking.status] || booking.status.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                </div>
              )}

              {items.length > 0 && (
                <div className={styles.card}>
                  <h2 className={styles.cardTitle}>Price Breakdown</h2>
                  <div className={styles.tableHeader}>
                    <span className={styles.tableColDesc}>Description</span>
                    <span className={styles.tableColQty}>Qty</span>
                    <span className={styles.tableColPrice}>Unit Price</span>
                    <span className={styles.tableColTotal}>Total</span>
                  </div>
                  {items.map((item, i) => (
                    <div key={i} className={`${styles.tableRow} ${i % 2 === 1 ? styles.tableRowAlt : ''}`}>
                      <span className={styles.tableColDesc}>{item.label}</span>
                      <span className={styles.tableColQty}>{item.quantity}</span>
                      <span className={styles.tableColPrice}>R {item.unit_price.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
                      <span className={styles.tableColTotal}>R {item.total_price.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
              )}

              {quote.pdf_version && (
                <div className={styles.card}>
                  <div className={styles.pdfInfo}>
                    <span className={styles.pdfIcon}>PDF</span>
                    <div>
                      <p className={styles.pdfLabel}>Quotation PDF v{quote.pdf_version}</p>
                      <p className={styles.pdfHint}>Download the full quotation with branding and terms.</p>
                    </div>
                    <a
                      href={`/api/admin/quotes/${quote.id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`btn btn-secondary ${styles.downloadBtn}`}
                    >
                      Download PDF
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.gridSide}>
              <div className={styles.totalCard}>
                <div className={styles.totalAmount}>{formatted.total}</div>
                <div className={styles.totalLabel}>Estimated Total</div>
                <div className={styles.totalDivider} />
                <div className={styles.totalRow}>
                  <span>Subtotal</span>
                  <span>{formatted.subtotal}</span>
                </div>
                {quote.tax_amount > 0 && (
                  <div className={styles.totalRow}>
                    <span>Tax ({quote.tax_rate}%)</span>
                    <span>{formatted.tax}</span>
                  </div>
                )}
                <div className={styles.totalDivider} />
                <div className={`${styles.totalRow} ${styles.depositRow}`}>
                  <span>Deposit ({quote.deposit_percentage}%)</span>
                  <span className={styles.depositAmount}>{formatted.deposit}</span>
                </div>
                <div className={`${styles.totalRow} ${styles.balanceRow}`}>
                  <span>Balance Due</span>
                  <span className={styles.balanceAmount}>{formatted.balance}</span>
                </div>
              </div>

              {canAccept && (
                <div className={styles.acceptCard}>
                  <p className={styles.acceptText}>
                    By accepting this quotation, you agree to the terms and conditions outlined in the document.
                    A {quote.deposit_percentage}% deposit ({formatted.deposit}) will be required to secure your booking.
                  </p>
                  <button
                    onClick={handleAccept}
                    disabled={accepting}
                    className={`btn btn-primary ${styles.acceptBtn} ${accepting ? styles.acceptBtnLoading : ''}`}
                  >
                    {accepting ? 'Accepting...' : 'Accept Quotation'}
                  </button>
                  {acceptError && <p className={styles.acceptError}>{acceptError}</p>}
                </div>
              )}

              {isAccepted && (
                <div className={styles.acceptedCard}>
                  <div className={styles.acceptedIcon}>✓</div>
                  <h3 className={styles.acceptedTitle}>Quotation Accepted</h3>
                  <p className={styles.acceptedMessage}>
                    Thank you! Your quotation has been accepted. A {quote.deposit_percentage}% deposit of {formatted.deposit} is required.
                  </p>
                  {payments_enabled ? (
                    <button className={`btn btn-primary ${styles.payBtn}`}>
                      Pay Deposit
                    </button>
                  ) : (
                    <div className={styles.pendingPayment}>
                      <span className={styles.pendingPaymentIcon}>⏳</span>
                      <p className={styles.pendingPaymentText}>
                        Awaiting Payment Instructions
                      </p>
                      <p className={styles.pendingPaymentHint}>
                        A member of The Boma Café team will contact you shortly with payment instructions.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className={styles.card}>
                <h3 className={styles.cardTitle}>Validity</h3>
                <p className={styles.validityText}>
                  This quotation is valid until <strong>{formatDate(quote.valid_until)}</strong>.
                  {quote.is_expired
                    ? ' It has expired.'
                    : ' Prices and availability are subject to change after this date.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
