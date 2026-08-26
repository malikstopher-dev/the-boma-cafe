'use client'

import { useState, useEffect, useRef, FormEvent } from 'react'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string; desc: string }> = {
  pending:    { label: 'Order Placed',    color: '#f59e0b', icon: '📋', desc: 'We received your order' },
  confirmed:  { label: 'Confirmed',       color: '#3b82f6', icon: '✅', desc: 'Your order has been accepted' },
  preparing:  { label: 'Preparing',       color: '#8b5cf6', icon: '👨‍🍳', desc: 'Chef is working on it' },
  packing:    { label: 'Packing',         color: '#f97316', icon: '📦', desc: 'Getting your order ready' },
  ready:      { label: 'Ready',           color: '#10b981', icon: '✨', desc: 'Your order is ready!' },
  completed:  { label: 'Completed',       color: '#6b7280', icon: '🎉', desc: 'Enjoy your meal!' },
  cancelled:  { label: 'Cancelled',       color: '#ef4444', icon: '❌', desc: 'This order was cancelled' },
}

const WORKFLOW = ['pending', 'confirmed', 'preparing', 'packing', 'ready', 'completed']

interface TrackResult {
  order_ref: string
  customer_name: string
  total: number
  status: string
  payment_status: string
  order_type: string
  waiter_name: string | null
  table_number: number | null
  preparation_time_minutes: number | null
  items_json: string | null
  status_label: string
  created_at: string
}

interface OrderItem {
  name?: string
  quantity?: number
  price?: number
  id?: string
}

function parseItems(itemsJson?: string): OrderItem[] {
  if (!itemsJson) return []
  try {
    const parsed = JSON.parse(itemsJson)
    const arr = parsed?.items ?? parsed ?? []
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
}

function elapsedMinutes(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
}

export default function TrackOrderPage() {
  const [ref, setRef] = useState('')
  const [trackingToken, setTrackingToken] = useState('')
  const [result, setResult] = useState<TrackResult | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const activeRef = useRef('')
  const activeTokenRef = useRef('')

  useEffect(() => {
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [])

  const stopPolling = () => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null }
  }

  const startPolling = (orderRef: string, token: string) => {
    stopPolling()
    activeRef.current = orderRef
    activeTokenRef.current = token
    pollingRef.current = setInterval(async () => {
      const cur = activeRef.current
      if (!cur) return
      try {
        const res = await fetch(`/api/track-order?ref=${encodeURIComponent(cur)}`, {
          headers: activeTokenRef.current ? { 'X-Order-Tracking-Token': activeTokenRef.current } : {},
        })
        if (!res.ok) return
        const data: TrackResult = await res.json()
        setResult(data)
        setItems(parseItems(data.items_json))
        setLastUpdated(new Date())
        if (data.status === 'completed' || data.status === 'cancelled') stopPolling()
      } catch { /* silent */ }
    }, 30000)
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const initialRef = params.get('ref')?.trim().toUpperCase() || ''
    const initialToken = hash.get('token') || ''
    if (!initialRef || !initialToken) return

    setRef(initialRef)
    setTrackingToken(initialToken)
    setLoading(true)
    fetch(`/api/track-order?ref=${encodeURIComponent(initialRef)}`, {
      headers: { 'X-Order-Tracking-Token': initialToken },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Secure tracking link is invalid or expired')
        const data: TrackResult = await response.json()
        setResult(data)
        setItems(parseItems(data.items_json))
        setLastUpdated(new Date())
        if (data.status !== 'completed' && data.status !== 'cancelled') startPolling(initialRef, initialToken)
      })
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'Unable to track order'))
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = ref.trim()
    if (!trimmed) return
    setLoading(true); setError(''); setResult(null); setItems([])
    stopPolling()
    try {
      const res = await fetch(`/api/track-order?ref=${encodeURIComponent(trimmed)}`, {
        headers: trackingToken ? { 'X-Order-Tracking-Token': trackingToken } : {},
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        setError(res.status === 401
          ? 'Use the secure tracking link provided when the order was placed. The reference alone cannot open an order.'
          : (errData?.error || 'Something went wrong. Please try again.'))
        return
      }
      const data = await res.json()
      setResult(data)
      setItems(parseItems(data.items_json))
      setLastUpdated(new Date())
      if (data.status !== 'completed' && data.status !== 'cancelled') startPolling(trimmed, trackingToken)
    } catch {
      setError('Unable to look up order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const canCancel = result && ['pending', 'confirmed'].includes(result.status) && result.payment_status !== 'paid'

  const handleCancel = async () => {
    if (!result || !canCancel) return
    if (!window.confirm('Are you sure you want to cancel this order?')) return
    setCancelling(true)
    try {
      const res = await fetch('/api/track-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(trackingToken ? { 'X-Order-Tracking-Token': trackingToken } : {}),
        },
        body: JSON.stringify({ ref: result.order_ref }),
      })
      if (res.ok) {
        setResult({ ...result, status: 'cancelled', status_label: 'Cancelled' })
        stopPolling()
      } else {
        const errData = await res.json().catch(() => ({}))
        setError(errData?.error || 'Failed to cancel order')
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setCancelling(false)
    }
  }

  const isCancelled = result?.status === 'cancelled'
  const currentStepIdx = result ? WORKFLOW.indexOf(result.status === 'cancelled' ? 'pending' : result.status) : -1

  const orderTypeLabel: Record<string, string> = {
    'dine-in': 'Dine In',
    'pickup': 'Pickup',
    'delivery': 'Delivery',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8f5f2 0%, #f0ebe5 50%, #e8e0d5 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.3); opacity: 1; }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 8px rgba(245,158,11,0.3); }
          50% { box-shadow: 0 0 20px rgba(245,158,11,0.6); }
        }
        .track-card { animation: slide-up 0.4s ease-out; }
        .step-active .step-dot { animation: pulse-dot 1.5s ease-in-out infinite; }
        .step-active { animation: glow-pulse 2s ease-in-out infinite; }
        @media (max-width: 480px) {
          .track-form-row { flex-direction: column; }
          .track-form-row button { width: 100%; min-width: unset !important; }
        }
      `}</style>

      <div style={{ width: '100%', maxWidth: '520px' }}>

        {/* ── Brand Header ── */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, #92400e, #d97706)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem', fontSize: '1.5rem',
            boxShadow: '0 4px 16px rgba(146,64,14,0.3)',
          }}>
            🏆
          </div>
          <h1 style={{
            fontSize: '1.8rem', fontWeight: 800,
            background: 'linear-gradient(135deg, #451a03, #92400e)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            margin: 0, letterSpacing: '-0.02em',
          }}>
            Track Your Order
          </h1>
          <p style={{ color: '#78716c', fontSize: '0.9rem', marginTop: '0.25rem' }}>
             Use the secure link provided when you placed your order
          </p>
        </div>

        {/* ── Search Form ── */}
        <form onSubmit={handleSubmit}>
          <div className="track-form-row" style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="text"
                placeholder="20260706-001"
                value={ref}
                onChange={e => {
                  setRef(e.target.value.toUpperCase())
                  setTrackingToken('')
                }}
                style={{
                  width: '100%', padding: '0.9rem 1rem 0.9rem 2.6rem',
                  borderRadius: '14px', border: '2px solid #d6d3d1',
                  background: '#fff', fontSize: '0.95rem', fontFamily: 'monospace',
                  outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = '#92400e'}
                onBlur={e => e.target.style.borderColor = '#d6d3d1'}
              />
              <span style={{
                position: 'absolute', left: '0.85rem', top: '50%',
                transform: 'translateY(-50%)', fontSize: '1.1rem',
                opacity: 0.4, pointerEvents: 'none',
              }}>
                🔍
              </span>
            </div>
            <button
              type="submit"
              disabled={loading || !ref.trim()}
              style={{
                padding: '0.9rem 1.5rem', borderRadius: '14px', border: 'none',
                background: loading ? '#a8a29e' : 'linear-gradient(135deg, #92400e, #d97706)',
                color: '#fff', fontSize: '1rem', fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                minWidth: '110px', transition: 'opacity 0.2s',
                opacity: loading || !ref.trim() ? 0.6 : 1,
                boxShadow: loading ? 'none' : '0 4px 12px rgba(146,64,14,0.3)',
              }}
            >
              {loading ? 'Searching...' : 'Track'}
            </button>
          </div>
        </form>

        {/* ── Error ── */}
        {error && (
          <div style={{
            marginTop: '1rem', background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: '12px', padding: '0.9rem 1.25rem',
          }}>
            <p style={{ color: '#dc2626', fontSize: '0.9rem', margin: 0, fontWeight: 500 }}>
              {error}
            </p>
          </div>
        )}

        {/* ── Result Card ── */}
        {result && (
          <div className="track-card" style={{ marginTop: '1.5rem' }}>

            {/* Order Reference Header */}
            <div style={{
              background: 'linear-gradient(135deg, #451a03, #92400e)',
              borderRadius: '16px 16px 0 0', padding: '1.25rem 1.5rem',
              textAlign: 'center',
            }}>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Order Reference
              </p>
              <p style={{
                fontSize: '1.4rem', fontWeight: 800, fontFamily: 'monospace',
                color: '#fff', margin: '0.25rem 0 0',
                letterSpacing: '0.02em',
              }}>
                {result.order_ref}
              </p>
            </div>

            <div style={{
              background: '#fff', borderRadius: '0 0 16px 16px',
              padding: '1.5rem', boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            }}>

              {/* Status Badge */}
              {!isCancelled && (
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.4rem 1.25rem', borderRadius: '24px',
                    fontSize: '0.95rem', fontWeight: 700,
                    background: `${STATUS_CONFIG[result.status]?.color}15`,
                    color: STATUS_CONFIG[result.status]?.color || '#6b7280',
                    border: `1px solid ${STATUS_CONFIG[result.status]?.color}30`,
                  }}>
                    {STATUS_CONFIG[result.status]?.icon} {result.status_label}
                  </span>
                  <p style={{
                    color: '#78716c', fontSize: '0.85rem', margin: '0.5rem 0 0',
                  }}>
                    {STATUS_CONFIG[result.status]?.desc}
                  </p>
                </div>
              )}

              {/* Cancelled Banner */}
              {isCancelled && (
                <div style={{
                  background: '#fef2f2', borderRadius: '12px', padding: '1rem',
                  marginBottom: '1.5rem', textAlign: 'center',
                  border: '1px solid #fecaca',
                }}>
                  <span style={{ fontSize: '2rem' }}>❌</span>
                  <p style={{ color: '#dc2626', fontSize: '1rem', fontWeight: 700, margin: '0.5rem 0 0' }}>
                    This order has been cancelled
                  </p>
                  <p style={{ color: '#ca8a8a', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
                    If you believe this is a mistake, please contact the restaurant.
                  </p>
                </div>
              )}

              {/* Progress Tracker */}
              {!isCancelled && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ position: 'relative', padding: '0 0.25rem' }}>
                    {/* Connecting line */}
                    <div style={{
                      position: 'absolute', left: '20px', top: '18px',
                      width: '2px', height: `calc(100% - 36px)`,
                      background: 'rgba(0,0,0,0.08)',
                    }} />
                    <div style={{
                      position: 'absolute', left: '20px', top: '18px',
                      width: '2px',
                      height: currentStepIdx >= 0 ? `calc((${currentStepIdx} / ${WORKFLOW.length - 1}) * (100% - 36px))` : '0',
                      background: 'linear-gradient(180deg, #10b981, #3b82f6)',
                      transition: 'height 0.6s ease',
                    }} />

                    {WORKFLOW.map((s, i) => {
                      const done = currentStepIdx >= i
                      const active = currentStepIdx === i
                      const config = STATUS_CONFIG[s]
                      return (
                        <div
                          key={s}
                          className={active ? 'step-active' : ''}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '1rem',
                            padding: '0.75rem 0', position: 'relative',
                          }}
                        >
                          <div className="step-dot" style={{
                            width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.1rem', fontWeight: 700,
                            background: done
                              ? `linear-gradient(135deg, ${config?.color}, ${config?.color}cc)`
                              : 'rgba(0,0,0,0.05)',
                            color: done ? '#fff' : 'rgba(0,0,0,0.2)',
                            boxShadow: active ? '0 0 0 4px rgba(245,158,11,0.2)' : 'none',
                            transition: 'all 0.3s ease',
                          }}>
                            {done ? '✓' : (config?.icon || i + 1)}
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{
                              margin: 0, fontSize: '0.9rem', fontWeight: done ? 700 : 500,
                              color: done ? '#292524' : '#a8a29e',
                              transition: 'color 0.3s',
                            }}>
                              {config?.label || s}
                            </p>
                            <p style={{
                              margin: '0.1rem 0 0', fontSize: '0.75rem',
                              color: done ? '#78716c' : '#d6d3d1',
                            }}>
                              {config?.desc || ''}
                            </p>
                          </div>
                          {active && (
                            <span style={{
                              width: 8, height: 8, borderRadius: '50%',
                              background: '#f59e0b', flexShrink: 0,
                              animation: 'pulse-dot 1.5s ease-in-out infinite',
                            }} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Payment Status */}
              {result.payment_status && !isCancelled && (
                <div style={{
                  borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1rem',
                  border: `1px solid ${result.payment_status === 'paid' ? '#bbf7d0' : result.payment_status === 'refunded' ? '#fecaca' : '#fde68a'}`,
                  background: result.payment_status === 'paid' ? '#f0fdf4' : result.payment_status === 'refunded' ? '#fef2f2' : '#fffbeb',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontSize: '0.85rem', color: '#78716c' }}>Payment</span>
                  <span style={{
                    fontSize: '0.9rem', fontWeight: 700,
                    color: result.payment_status === 'paid' ? '#16a34a' : result.payment_status === 'refunded' ? '#dc2626' : '#d97706',
                  }}>
                    {result.payment_status === 'paid' ? '✅ Paid' : result.payment_status === 'refunded' ? 'Refunded' : '⏳ Pending'}
                  </span>
                </div>
              )}

              {/* Estimated Prep Time */}
              {result.preparation_time_minutes && ['pending', 'confirmed', 'preparing', 'packing'].includes(result.status) && !isCancelled && (
                <div style={{
                  borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1rem',
                  border: '1px solid #bae6fd', background: '#f0f9ff',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontSize: '0.85rem', color: '#78716c' }}>Estimated Prep Time</span>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0369a1' }}>
                    ⏱ {result.preparation_time_minutes} min
                  </span>
                </div>
              )}

              {/* Elapsed Time */}
              {result.created_at && !isCancelled && (
                <div style={{
                  borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1rem',
                  border: '1px solid rgba(0,0,0,0.06)', background: 'rgba(0,0,0,0.02)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontSize: '0.85rem', color: '#78716c' }}>Time Since Order</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#57534e' }}>
                    {elapsedMinutes(result.created_at)} min ago
                  </span>
                </div>
              )}

              {/* Cancel Order (customer) */}
              {canCancel && !cancelling && (
                <button
                  onClick={handleCancel}
                  style={{
                    width: '100%', marginBottom: '1rem', padding: '0.75rem',
                    borderRadius: '12px', border: '2px solid #fecaca',
                    background: '#fef2f2', color: '#dc2626',
                    fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fef2f2'}
                >
                  ✕ Cancel Order
                </button>
              )}
              {canCancel && cancelling && (
                <div style={{
                  width: '100%', marginBottom: '1rem', padding: '0.75rem',
                  borderRadius: '12px', border: '2px solid #fecaca',
                  background: '#fef2f2', color: '#dc2626',
                  fontSize: '0.9rem', fontWeight: 700, textAlign: 'center',
                }}>
                  Cancelling...
                </div>
              )}

              {/* Order Items */}
              {items.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    Items Ordered
                  </p>
                  {items.map((item, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '0.4rem 0', borderBottom: '1px solid rgba(0,0,0,0.04)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{
                          width: 24, height: 24, borderRadius: '6px',
                          background: 'rgba(146,64,14,0.1)', color: '#92400e',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.75rem', fontWeight: 700,
                        }}>
                          {item.quantity || 1}
                        </span>
                        <span style={{ fontSize: '0.85rem', color: '#292524', fontWeight: 500 }}>
                          {item.name || `Item ${i + 1}`}
                        </span>
                      </div>
                      {item.price != null && (
                        <span style={{ fontSize: '0.85rem', color: '#57534e', fontWeight: 600 }}>
                          R{(item.price * (item.quantity || 1)).toFixed(2)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Order Details */}
              <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#78716c' }}>Type</span>
                  <span style={{ color: '#292524', fontWeight: 600 }}>{orderTypeLabel[result.order_type] || result.order_type}</span>
                </div>
                {result.waiter_name && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                    <span style={{ color: '#78716c' }}>Waiter</span>
                    <span style={{ color: '#dc2626', fontWeight: 600 }}>{result.waiter_name}</span>
                  </div>
                )}
                {result.table_number && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                    <span style={{ color: '#78716c' }}>Table</span>
                    <span style={{ color: '#292524', fontWeight: 700 }}>Table {result.table_number}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#78716c' }}>Customer</span>
                  <span style={{ color: '#292524', fontWeight: 500 }}>{result.customer_name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#78716c' }}>Total</span>
                  <span style={{ color: '#292524', fontWeight: 700, fontSize: '1rem' }}>R{result.total}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: '#78716c' }}>Ordered</span>
                  <span style={{ color: '#57534e', fontWeight: 500 }}>
                    {new Date(result.created_at).toLocaleDateString('en-ZA', {
                      day: 'numeric', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              {/* Auto-refresh indicator */}
              {lastUpdated && result.status !== 'completed' && result.status !== 'cancelled' && (
                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                    fontSize: '0.7rem', color: 'rgba(0,0,0,0.3)',
                  }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: '#10b981', display: 'inline-block',
                    }} />
                    Auto-updating every 10s
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'rgba(0,0,0,0.25)' }}>
            The Boma Cafe © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  )
}
