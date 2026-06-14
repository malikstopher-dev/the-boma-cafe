'use client'

import { useState, useEffect, useRef, FormEvent } from 'react'

const STATUS_LABELS: Record<string, string> = {
  pending: 'New',
  confirmed: 'Accepted',
  preparing: 'Preparing',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  confirmed: '#3b82f6',
  preparing: '#8b5cf6',
  ready: '#10b981',
  completed: '#6b7280',
  cancelled: '#ef4444',
}

interface TrackResult {
  order_ref: string
  customer_name: string
  total: number
  status: string
  payment_status: string
  status_label: string
  created_at: string
}

export default function TrackOrderPage() {
  const [ref, setRef] = useState('')
  const [result, setResult] = useState<TrackResult | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const activeRef = useRef('')

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [])

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  const startPolling = (orderRef: string) => {
    stopPolling()
    activeRef.current = orderRef
    pollingRef.current = setInterval(async () => {
      const currentRef = activeRef.current
      if (!currentRef) return
      try {
        const res = await fetch(`/api/track-order?ref=${encodeURIComponent(currentRef)}`)
        if (!res.ok) return
        const data: TrackResult = await res.json()
        setResult(data)
        setLastUpdated(new Date())
        if (data.status === 'completed' || data.status === 'cancelled') {
          stopPolling()
        }
      } catch {
        // silently retry on next interval
      }
    }, 10000)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = ref.trim()
    if (!trimmed) return

    setLoading(true)
    setError('')
    setResult(null)
    stopPolling()

    try {
      const res = await fetch(`/api/track-order?ref=${encodeURIComponent(trimmed)}`)
      if (res.status === 404) {
        setError('Order not found. Please check your order reference and try again.')
        return
      }
      if (!res.ok) {
        setError('Something went wrong. Please try again.')
        return
      }
      const data = await res.json()
      setResult(data)
      setLastUpdated(new Date())
      if (data.status !== 'completed' && data.status !== 'cancelled') {
        startPolling(trimmed)
      }
    } catch {
      setError('Unable to look up order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const workflowOrder = ['pending', 'confirmed', 'preparing', 'ready', 'completed']

  return (
    <div style={{ minHeight: '100vh', background: '#f8f5f2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--dark-brown)', marginBottom: '0.5rem' }}>
            Track Your Order
          </h1>
          <p style={{ color: 'var(--text-light)', fontSize: '0.95rem' }}>
            Enter your order reference to see the current status.
          </p>
        </div>

        {/* Search form */}
        <form onSubmit={handleSubmit} style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="e.g. BOMA-250611-001"
              value={ref}
              onChange={e => setRef(e.target.value.toUpperCase())}
              style={{
                flex: 1, padding: '0.85rem 1rem', borderRadius: '12px',
                border: '2px solid var(--beige-dark)', background: 'var(--white)',
                fontSize: '1rem', fontFamily: 'monospace',
              }}
            />
            <button
              type="submit"
              disabled={loading || !ref.trim()}
              style={{
                padding: '0.85rem 1.5rem', borderRadius: '12px', border: 'none',
                background: loading ? '#ccc' : 'var(--warm)',
                color: '#fff', fontSize: '1rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                minWidth: '100px',
              }}
            >
              {loading ? '...' : 'Track'}
            </button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
            <p style={{ color: '#dc2626', fontSize: '0.9rem', margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Result */}
        {result && (
          <div>
          <div style={{ background: 'var(--white)', borderRadius: '16px', boxShadow: 'var(--shadow-md)', padding: '2rem' }}>
            {/* Order ref */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: '0.25rem' }}>Order Reference</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--dark-brown)' }}>
                {result.order_ref}
              </p>
            </div>

            {/* Status badge */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <span style={{
                padding: '0.5rem 1.5rem', borderRadius: '24px', fontSize: '1.1rem',
                fontWeight: 700, background: `${STATUS_COLORS[result.status] || '#6b7280'}20`,
                color: STATUS_COLORS[result.status] || '#6b7280',
              }}>
                {result.status_label}
              </span>
            </div>

            {/* Workflow progress */}
            <div style={{ marginBottom: '1.5rem' }}>
              {workflowOrder.map((s, i) => {
                const currentIdx = workflowOrder.indexOf(result.status)
                const done = currentIdx >= i
                const isCancelled = result.status === 'cancelled'
                return (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0' }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: isCancelled ? '#e5e7eb' : done ? STATUS_COLORS[s] : '#e5e7eb',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: done || isCancelled ? '#fff' : '#9ca3af',
                      fontSize: '0.8rem', fontWeight: 700, flexShrink: 0,
                    }}>
                      {done && result.status !== 'cancelled' ? '✓' : i + 1}
                    </div>
                    <span style={{
                      fontSize: '0.95rem', fontWeight: done && result.status !== 'cancelled' ? 600 : 400,
                      color: isCancelled ? '#9ca3af' : done ? 'var(--dark-brown)' : '#9ca3af',
                    }}>
                      {STATUS_LABELS[s]}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Cancelled notice */}
            {result.status === 'cancelled' && (
              <div style={{ background: '#fef2f2', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                <p style={{ color: '#dc2626', fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>
                  This order has been cancelled.
                </p>
              </div>
            )}

            {/* Payment section */}
            {result.payment_status && (
              <div style={{
                background: result.payment_status === 'paid' ? '#f0fdf4' : '#fffbeb',
                borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.5rem',
                border: `1px solid ${result.payment_status === 'paid' ? '#bbf7d0' : '#fde68a'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>Payment Status</span>
                  <span style={{
                    fontSize: '0.9rem', fontWeight: 700,
                    color: result.payment_status === 'paid' ? '#16a34a' : result.payment_status === 'refunded' ? '#dc2626' : '#d97706',
                  }}>
                    {result.payment_status === 'paid' ? '✅ Paid' : result.payment_status === 'refunded' ? '🔴 Refunded' : '🟠 Pending Payment'}
                  </span>
                </div>
                {result.payment_status === 'pending' && (
                  <p style={{ fontSize: '0.85rem', color: '#92400e', margin: '0.5rem 0 0' }}>
                    Your order is awaiting payment confirmation.
                  </p>
                )}
                {result.payment_status === 'paid' && (
                  <p style={{ fontSize: '0.85rem', color: '#166534', margin: '0.5rem 0 0' }}>
                    Payment received. Your order is being processed.
                  </p>
                )}
              </div>
            )}

            {/* Details */}
            <div style={{ borderTop: '1px solid var(--beige-dark)', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-light)' }}>Customer</span>
                <span style={{ color: 'var(--dark-brown)', fontWeight: 500 }}>{result.customer_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-light)' }}>Total</span>
                <span style={{ color: 'var(--dark-brown)', fontWeight: 500 }}>R{result.total}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-light)' }}>Ordered</span>
                <span style={{ color: 'var(--dark-brown)', fontWeight: 500 }}>
                  {new Date(result.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
          {lastUpdated && (
            <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'rgba(0,0,0,0.35)' }}>
                Auto-refreshing every 10s
              </span>
            </div>
          )}
        </div>
        )}
      </div>

      <style>{`
        @media (max-width: 480px) {
          form > div {
            flex-direction: column;
          }
          button[type="submit"] {
            min-width: unset;
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}
