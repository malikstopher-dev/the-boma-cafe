'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { SupabaseOrder, TableInfo, parseOrderItems, getOrderTableNumber, PaymentMethod } from '@/types/pos'
import BackButton from '@/components/admin/BackButton'
import { STATUS_LABELS, STATUS_COLORS, requiresPaymentConfirmation } from '@/lib/order-state-machine'
import { posService } from '@/lib/pos-service'
import { createBrowserClient } from '@/lib/supabase'

const POLL_INTERVAL = 4000
const FALLBACK_POLL_INTERVAL = 30000
const TOTAL_TABLES = 20

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
}

function timeSince(iso: string) {
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ${mins % 60}m`
}

function TableGrid({
  tables,
  selectedTable,
  onSelectTable,
}: {
  tables: TableInfo[]
  selectedTable: number | null
  onSelectTable: (n: number | null) => void
}) {
  return (
    <div style={{ padding: '0.75rem' }}>
      <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Tables
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
        {tables.map((t) => {
          const isOccupied = t.status !== 'empty'
          return (
            <button
              key={t.tableNumber}
              onClick={() => onSelectTable(selectedTable === t.tableNumber ? null : t.tableNumber)}
              style={{
                padding: '0.6rem 0.4rem',
                borderRadius: '10px',
                border: selectedTable === t.tableNumber ? '2px solid #f59e0b' : isOccupied ? '2px solid rgba(59,130,246,0.4)' : '2px solid rgba(255,255,255,0.12)',
                background: selectedTable === t.tableNumber ? '#f59e0b' : '#1c1c2e',
                cursor: 'pointer',
                color: selectedTable === t.tableNumber ? '#000000' : '#ffffff',
                textAlign: 'center',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>{t.tableNumber}</div>
              {isOccupied && (
                <div style={{ fontSize: '0.55rem', fontWeight: 600, color: selectedTable === t.tableNumber ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.5)', marginTop: '0.15rem' }}>
                  R{t.total.toFixed(0)}
                </div>
              )}
              {!isOccupied && (
                <div style={{ fontSize: '0.55rem', color: selectedTable === t.tableNumber ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.3)', marginTop: '0.15rem' }}>empty</div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PaymentBadge({ paymentStatus }: { paymentStatus: string }) {
  if (paymentStatus === 'paid') {
    return <span style={{ padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, background: 'rgba(16,185,129,0.2)', color: '#10b981' }}>Paid</span>
  }
  if (paymentStatus === 'refunded') {
    return <span style={{ padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>Refunded</span>
  }
  return <span style={{ padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}>Pending Payment</span>
}

function OrderCard({
  order,
  selected,
  onClick,
  onAssignTable,
  onConfirmPayment,
  onAcceptNoPayment,
  onConfirmWaiterOrder,
  onCancel,
  tables,
}: {
  order: SupabaseOrder
  selected: boolean
  onClick: () => void
  onAssignTable: (orderId: string, table: number) => void
  onConfirmPayment: (orderId: string) => void
  onAcceptNoPayment: (orderId: string) => void
  onConfirmWaiterOrder: (orderId: string) => void
  onCancel?: (orderId: string) => void
  tables: TableInfo[]
}) {
  const [showTableDropdown, setShowTableDropdown] = useState(false)
  const items = parseOrderItems(order.items_json)
  const status = order.status as any
  const color = STATUS_COLORS[status] || '#6b7280'
  const label = STATUS_LABELS[status] || status
  const displayRef = order.order_ref || `#${order.id.slice(0, 8).toUpperCase()}`
  const tn = getOrderTableNumber(order)
  const itemCount = items.reduce((s, i) => s + i.quantity, 0)
  const availableTables = tables.filter((t) => t.status === 'empty')

  return (
    <div
      onClick={onClick}
      style={{
        background: selected ? '#1e1e38' : '#16162a',
        borderRadius: '12px',
        padding: '1rem',
        border: selected ? `2px solid ${color}` : '2px solid rgba(255,255,255,0.04)',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'monospace', color: '#fff' }}>
          {displayRef}
        </span>
        <span style={{
          padding: '0.25rem 0.6rem',
          borderRadius: '6px',
          fontSize: '0.75rem',
          fontWeight: 700,
          background: `${color}25`,
          color,
        }}>
          {label}
        </span>
      </div>
      {requiresPaymentConfirmation(order.order_type) && (
        <div style={{ marginBottom: '0.5rem' }}>
          <PaymentBadge paymentStatus={order.payment_status} />
        </div>
      )}
      <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
        <span>{order.order_type === 'pickup' ? '📦 Pickup' : order.order_type === 'delivery' ? '🚚 Delivery' : '🍽️ Dine-in'}</span>
        <span>⏱ {timeSince(order.created_at)}</span>
        {tn && <span>🪑 Table {tn}</span>}
        {order.waiter_name && <span style={{ color: '#dc2626', fontWeight: 600 }}>🍽️ {order.waiter_name}</span>}
        <span style={{ color: 'rgba(255,255,255,0.3)' }}>📋 {itemCount} item{itemCount !== 1 ? 's' : ''}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#10b981' }}>R{order.total.toFixed(2)}</span>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* Waiter order: show Confirm button for admin/FOH (kitchen can still start without confirmation) */}
          {order.source === 'waiter' && order.status === 'pending' && (
            <button
              onClick={(e) => { e.stopPropagation(); onConfirmWaiterOrder(order.id) }}
              style={{
                padding: '0.3rem 0.6rem', borderRadius: '8px', border: 'none',
                background: '#3b82f6', color: '#fff', fontSize: '0.75rem', fontWeight: 700,
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
              title="Confirm waiter order (kitchen can also start without this)"
            >
              ✅ Confirm
            </button>
          )}
          {requiresPaymentConfirmation(order.order_type) && order.payment_status === 'pending' && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onConfirmPayment(order.id) }}
                style={{
                  padding: '0.3rem 0.6rem', borderRadius: '8px', border: 'none',
                  background: '#10b981', color: '#000', fontSize: '0.75rem', fontWeight: 700,
                  cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                Confirm Payment
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onAcceptNoPayment(order.id) }}
                style={{
                  padding: '0.3rem 0.6rem', borderRadius: '8px', border: '1px solid #f59e0b',
                  background: 'transparent', color: '#f59e0b', fontSize: '0.7rem', fontWeight: 600,
                  cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                Accept (Skip Payment)
              </button>
            </>
          )}
          {!['completed', 'cancelled'].includes(order.status) && (
            <button
              onClick={(e) => { e.stopPropagation(); onCancel?.(order.id) }}
              style={{
                padding: '0.3rem 0.6rem', borderRadius: '8px', border: 'none',
                background: '#ef4444', color: '#fff', fontSize: '0.7rem', fontWeight: 700,
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              Cancel
            </button>
          )}
          {!tn && order.status === 'pending' && availableTables.length > 0 && (
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowTableDropdown(!showTableDropdown) }}
              style={{
                padding: '0.3rem 0.6rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)',
                fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              + Assign Table
            </button>
            {showTableDropdown && (
              <div style={{
                position: 'absolute', bottom: '100%', right: 0, zIndex: 100,
                background: '#2a2a3e', borderRadius: '10px', padding: '0.25rem',
                border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                minWidth: '140px', marginBottom: '4px',
              }}>
                {availableTables.map((t) => (
                  <button
                    key={t.tableNumber}
                    onClick={(e) => { e.stopPropagation(); onAssignTable(order.id, t.tableNumber); setShowTableDropdown(false) }}
                    style={{
                      display: 'block', width: '100%', padding: '0.4rem 0.75rem', border: 'none',
                      background: 'transparent', color: '#fff', fontSize: '0.8rem', fontWeight: 500,
                      cursor: 'pointer', borderRadius: '6px', textAlign: 'left',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    Table {t.tableNumber}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        </div>
      </div>
      {order.status === 'cancelled' && order.cancellation_reason && (
        <div style={{ marginTop: '0.5rem', padding: '0.4rem 0.6rem', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#fca5a5' }}>
            Cancel reason: {order.cancellation_reason}
          </span>
        </div>
      )}
    </div>
  )
}

function CheckoutPanel({
  order,
  onPay,
  onClose,
  onAssignTable,
  tables,
}: {
  order: SupabaseOrder | null
  onPay: (id: string, method: PaymentMethod) => void
  onClose: () => void
  onAssignTable: (orderId: string, table: number) => void
  tables: TableInfo[]
}) {
  const [method, setMethod] = useState<PaymentMethod>('card')
  const [paying, setPaying] = useState(false)
  const items = order ? parseOrderItems(order.items_json) : []
  const tn = order ? getOrderTableNumber(order) : undefined
  const availableTables = tables.filter((t) => t.status === 'empty')

  const handlePay = async () => {
    if (!order || paying) return
    setPaying(true)
    try {
      const body: Record<string, any> = { status: 'completed', payment_method: method }
      if (requiresPaymentConfirmation(order.order_type) && order.payment_status !== 'paid') {
        body.payment_status = 'paid'
      }
      const res = await fetch(`/api/supabase/orders?id=${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        onPay(order.id, method)
      }
    } catch (e) {
      console.error('Payment failed:', e)
    } finally {
      setPaying(false)
    }
  }

  const handlePrint = () => {
    if (!order) return
    const printWin = window.open('', '_blank')
    if (!printWin) return
    printWin.document.write(`
      <html><head><title>Receipt - ${order.order_ref || order.id.slice(0, 8)}</title>
      <style>body{font-family:monospace;padding:20px;max-width:300px;margin:auto}
      h1{font-size:18px;text-align:center}table{width:100%;border-collapse:collapse}
      th,td{padding:4px 0;text-align:left}hr{border:none;border-top:1px dashed #000}
      .total{font-size:20px;font-weight:700;text-align:right}</style></head><body>
      <h1>THE BOMA CAFE</h1>
      <p style="text-align:center">${new Date().toLocaleDateString('en-ZA')} ${formatTime(new Date().toISOString())}</p>
      <p style="text-align:center">${order.order_ref || ''}</p>
      <hr>
      <p>${order.order_type}${tn ? ' - Table ' + tn : ''}</p>
      <hr>
      <table>${items.map(i => `<tr><td>${i.quantity}x ${i.name}</td><td style="text-align:right">R${(i.price * i.quantity).toFixed(2)}</td></tr>${i.notes ? `<tr><td style="color:#999;font-size:12px;padding-left:16px">${i.notes}</td></tr>` : ''}`).join('')}</table>
      <hr>
      <div class="total">R${order.total.toFixed(2)}</div>
      <hr>
      <p style="text-align:center">Paid via ${method.toUpperCase()}</p>
      <p style="text-align:center">Thank you!</p>
      <script>window.print();window.close();</script>
      </body></html>`)
    printWin.document.close()
  }

  if (!order) return null

  const canPay = order.status === 'ready' || order.status === 'pending' || order.status === 'confirmed' || order.status === 'preparing'

  return (
    <div style={{
      width: '380px',
      background: '#12121e',
      borderLeft: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, color: '#fff' }}>
          {order.order_ref || `#${order.id.slice(0, 8).toUpperCase()}`}
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>
          <span>🕐 {formatTime(order.created_at)}</span>
          <span>📋 {order.order_type}</span>
        {tn && <span style={{ color: '#dc2626', fontWeight: 700 }}>🪑 Table {tn}</span>}
        {order.waiter_name && <span style={{ color: '#dc2626', fontWeight: 600 }}>🍽️ {order.waiter_name}</span>}
        </div>

        {!tn && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '0.3rem' }}>Assign to table</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {tables.filter(t => t.status === 'empty').map(t => (
                <button
                  key={t.tableNumber}
                  onClick={() => onAssignTable(order.id, t.tableNumber)}
                  style={{
                    padding: '0.35rem 0.6rem', borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.06)', color: '#fff',
                    fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                >
                  {t.tableNumber}
                </button>
              ))}
              {tables.filter(t => t.status === 'empty').length === 0 && (
                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>All tables occupied</span>
              )}
            </div>
          </div>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Items</p>
          {items.map((item, i) => (
            <div key={i} style={{ padding: '0.4rem 0', borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', fontSize: '0.95rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span><strong>{item.quantity}x</strong> {item.name}</span>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>R{(item.price * item.quantity).toFixed(2)}</span>
              </div>
              {item.notes && <div style={{ fontSize: '0.8rem', color: '#fbbf24', marginTop: '0.15rem' }}>⚠️ {item.notes}</div>}
            </div>
          ))}
        </div>

        <div style={{ borderTop: '2px solid rgba(255,255,255,0.1)', paddingTop: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 700 }}>
            <span>Total</span>
            <span style={{ color: '#10b981' }}>R{order.total.toFixed(2)}</span>
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Payment Method</p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(['cash', 'card', 'mobile'] as PaymentMethod[]).map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                style={{
                  flex: 1, padding: '0.6rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600,
                  border: method === m ? '2px solid #f59e0b' : '2px solid rgba(255,255,255,0.1)',
                  background: method === m ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)',
                  color: method === m ? '#f59e0b' : 'rgba(255,255,255,0.6)',
                  cursor: 'pointer', textTransform: 'capitalize',
                }}
              >
                {m === 'cash' ? '💵 Cash' : m === 'card' ? '💳 Card' : '📱 Mobile'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <button
          onClick={handlePay}
          disabled={paying || !canPay}
          style={{
            width: '100%', padding: '1rem', border: 'none', borderRadius: '10px',
            background: canPay ? '#10b981' : 'rgba(255,255,255,0.05)',
            color: canPay ? '#000' : 'rgba(255,255,255,0.3)',
            fontSize: '1.1rem', fontWeight: 800,
            cursor: canPay && !paying ? 'pointer' : 'not-allowed',
            opacity: paying ? 0.6 : 1,
          }}
        >
          {paying ? 'Processing...' : canPay ? `Mark Paid (${method.toUpperCase()})` : 'Awaiting Ready'}
        </button>
        {order.status === 'completed' && (
          <button
            onClick={handlePrint}
            style={{
              width: '100%', padding: '0.75rem', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px', background: 'transparent', color: 'rgba(255,255,255,0.7)',
              fontSize: '0.9rem', cursor: 'pointer',
            }}
          >
            🖨️ Print Receipt
          </button>
        )}
      </div>
    </div>
  )
}

export default function OrdersPOS() {
  const [orders, setOrders] = useState<SupabaseOrder[]>([])
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [selectedTable, setSelectedTable] = useState<number | null>(null)
  const [connectionError, setConnectionError] = useState(false)
  const [authExpired, setAuthExpired] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }, [])
  const prevCountRef = useRef(0)

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/supabase/orders')
      if (res.status === 401) {
        setAuthExpired(true)
        setConnectionError(false)
        return
      }
      if (!res.ok) {
        setConnectionError(true)
        return
      }
      setConnectionError(false)
      setAuthExpired(false)
      const data: SupabaseOrder[] = await res.json()
      setOrders(data)
      if (data.length > prevCountRef.current && prevCountRef.current > 0) {
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.frequency.value = 660
          osc.type = 'sine'
          gain.gain.setValueAtTime(0.15, ctx.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
          osc.start(ctx.currentTime)
          osc.stop(ctx.currentTime + 0.3)
        } catch { /* */ }
      }
      prevCountRef.current = data.length
    } catch {
      setConnectionError(true)
    }
  }, [])

  useEffect(() => { loadOrders() }, [loadOrders])

  // ── Supabase Realtime subscription ─────────────────────────
  const [realtimeConnected, setRealtimeConnected] = useState(false)

  useEffect(() => {
    if (authExpired) return

    const supabase = createBrowserClient()
    const channel = supabase
      .channel('admin-orders-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            setOrders((prev) => [{ ...payload.new as any }, ...prev])
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            setOrders((prev) =>
              prev.map((o) => (o.id === payload.new.id ? { ...o, ...payload.new as any } : o))
            )
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setOrders((prev) => prev.filter((o) => o.id !== payload.old.id))
          }
        }
      )
      .subscribe((status) => {
        setRealtimeConnected(status === 'SUBSCRIBED')
      })

    return () => { supabase.removeChannel(channel) }
  }, [authExpired])

  // ── Fallback polling (longer interval when Realtime is active) ──
  useEffect(() => {
    if (authExpired) return
    const interval = setInterval(loadOrders, realtimeConnected ? FALLBACK_POLL_INTERVAL : POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [loadOrders, authExpired, realtimeConnected])



  const activeOrders = orders.filter((o) => !['completed', 'cancelled'].includes(o.status))
  const completedOrders = orders.filter((o) => ['completed', 'cancelled'].includes(o.status))
  const selectedOrder = orders.find((o) => o.id === selectedOrderId) || null

  // Filter by selected table
  const tableFiltered = selectedTable
    ? activeOrders.filter((o) => getOrderTableNumber(o) === selectedTable)
    : activeOrders

  const historyPool = showHistory ? completedOrders : tableFiltered

  // Search filter
  const visibleOrders = searchQuery.trim()
    ? historyPool.filter((o) => {
        const q = searchQuery.toLowerCase()
        return (o.order_ref && o.order_ref.toLowerCase().includes(q)) ||
               o.customer_name.toLowerCase().includes(q) ||
               (o.phone && o.phone.toLowerCase().includes(q)) ||
               (o.waiter_name && o.waiter_name.toLowerCase().includes(q)) ||
               (o.table_number && o.table_number.toLowerCase().includes(q)) ||
               o.status.toLowerCase().includes(q) ||
               o.order_type.toLowerCase().includes(q)
      })
    : historyPool

  // Compute tables
  const tables: TableInfo[] = []
  for (let i = 1; i <= TOTAL_TABLES; i++) {
    const orderOnTable = activeOrders.find((o) => getOrderTableNumber(o) === i)
    tables.push({
      tableNumber: i,
      status: orderOnTable ? 'occupied' : 'empty',
      currentOrderId: orderOnTable?.id,
      total: orderOnTable?.total || 0,
      customerName: orderOnTable?.customer_name,
    })
  }

  const handleAssignTable = async (orderId: string, tableNumber: number) => {
    const order = orders.find((o) => o.id === orderId)
    if (!order) return
    const items = parseOrderItems(order.items_json)
    const meta: any = { tableNumber }
    const paymentStatus = (() => { try { const p = JSON.parse(order.items_json); return p.metadata?.paymentStatus } catch { return undefined } })()
    const paymentMethod = (() => { try { const p = JSON.parse(order.items_json); return p.metadata?.paymentMethod } catch { return undefined } })()
    if (paymentStatus) meta.paymentStatus = paymentStatus
    if (paymentMethod) meta.paymentMethod = paymentMethod
    const newItemsJson = JSON.stringify({ items, metadata: meta })
    try {
      await fetch(`/api/supabase/orders?id=${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items_json: newItemsJson, table_number: String(tableNumber) }),
      })
      loadOrders()
    } catch (e) {
      console.error('Failed to assign table:', e)
    }
  }

  const handlePay = async (orderId: string, method: PaymentMethod) => {
    loadOrders()
  }

  const handleConfirmPayment = async (orderId: string) => {
    try {
      const res = await fetch(`/api/supabase/orders?id=${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status: 'paid', status: 'confirmed' }),
      })
      if (res.ok) {
        showToast('Payment confirmed — order sent to kitchen', 'success')
        loadOrders()
      } else {
        const data = await res.json()
        showToast(data.error || 'Confirm payment failed', 'error')
      }
    } catch (e) {
      showToast('Failed to confirm payment', 'error')
    }
  }

  const handleAcceptNoPayment = async (orderId: string) => {
    try {
      const res = await fetch(`/api/supabase/orders?id=${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status: 'paid', status: 'confirmed' }),
      })
      if (res.ok) {
        showToast('Order accepted without payment — sent to kitchen', 'success')
        loadOrders()
      } else {
        const data = await res.json()
        showToast(data.error || 'Accept failed', 'error')
      }
    } catch (e) {
      showToast('Failed to accept order', 'error')
    }
  }

  // Confirm a waiter order (no payment involved)
  const handleConfirmWaiterOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/supabase/orders?id=${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' }),
      })
      if (res.ok) {
        showToast('Waiter order confirmed', 'success')
        loadOrders()
      } else {
        const data = await res.json()
        showToast(data.error || 'Confirm failed', 'error')
      }
    } catch (e) {
      showToast('Failed to confirm order', 'error')
    }
  }

  const handleCancelOrder = async () => {
    if (!cancelOrderId || cancelReason.trim().length < 3) return
    setCancelling(true)
    try {
      const res = await fetch(`/api/supabase/orders?id=${cancelOrderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled', cancellation_reason: cancelReason.trim() }),
      })
      if (res.ok) {
        showToast('Order cancelled', 'success')
        setCancelOrderId(null)
        setCancelReason('')
        loadOrders()
      } else {
        const data = await res.json()
        showToast(data.error || 'Cancel failed', 'error')
      }
    } catch {
      showToast('Failed to cancel order', 'error')
    } finally {
      setCancelling(false)
    }
  }

  const selectedForCheckout = selectedOrder && (selectedOrder.status === 'ready' || selectedOrder.status === 'completed')

  return (
    <>
    <div style={{
      position: 'fixed', top: 12, left: 12, zIndex: 100,
    }}>
      <BackButton />
    </div>
    <div style={{
      height: '100dvh',
      paddingTop: 60,
      display: 'flex',
      flexDirection: 'column',
      background: '#0f0f1a',
      color: '#fff',
      fontFamily: "'Inter', -apple-system, sans-serif",
      overflow: 'hidden',
      boxSizing: 'border-box',
    }}>
      {(connectionError || authExpired) && (
        <div style={{ padding: '0.5rem 1.5rem', background: 'rgba(239,68,68,0.15)', borderBottom: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: '0.85rem', textAlign: 'center', flexShrink: 0 }}>
          {authExpired ? '⚠ Session expired — please log out and log in again' : '⚠ Connection lost — showing cached data. Retrying...'}
        </div>
      )}
      {toast && (
        <div style={{
          position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
          padding: '0.75rem 1.5rem', borderRadius: '12px',
          background: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: '#000', fontSize: '0.9rem', fontWeight: 600,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          animation: 'fadeIn 0.2s ease',
        }}>
          {toast.message}
        </div>
      )}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      {/* LEFT: Table Grid */}
      <div style={{
        width: '240px',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        background: '#0a0a14',
      }}>
        <div style={{
          padding: '0.75rem 1rem',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>🪑 FOH POS</span>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
            {new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <TableGrid tables={tables} selectedTable={selectedTable} onSelectTable={(n) => { setSelectedTable(n); setSelectedOrderId(null) }} />
        <div style={{ marginTop: 'auto', padding: '0.75rem' }}>
          {selectedTable && (
            <button
              onClick={() => setSelectedTable(null)}
              style={{
                width: '100%', padding: '0.5rem', borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
                color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', cursor: 'pointer',
              }}
            >
              Show all orders
            </button>
          )}
        </div>
      </div>

      {/* CENTER: Active Orders */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '0.75rem 1rem',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                {selectedTable ? `Table ${selectedTable}` : showHistory ? 'Order History' : 'Active Orders'}
              </h2>
              <span style={{
                padding: '0.15rem 0.5rem', borderRadius: '6px',
                fontSize: '0.75rem', fontWeight: 600,
                background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
              }}>
                {visibleOrders.length}
              </span>
            </div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              style={{
                padding: '0.3rem 0.6rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                background: showHistory ? 'rgba(245,158,11,0.15)' : 'transparent',
                color: showHistory ? '#f59e0b' : 'rgba(255,255,255,0.5)',
                fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
              }}
            >
              {showHistory ? '← Active Orders' : '📜 History'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="Search by ref, name, phone, waiter, table..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                flex: 1, padding: '0.4rem 0.6rem', borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.04)', color: '#fff',
                fontSize: '0.8rem', outline: 'none',
              }}
            />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {visibleOrders.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.15)', fontSize: '0.9rem' }}>
              {searchQuery ? 'No orders match your search' : selectedTable ? 'No orders for this table' : 'No orders found'}
            </div>
          )}
          {visibleOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              selected={selectedOrderId === order.id}
              onClick={() => setSelectedOrderId(selectedOrderId === order.id ? null : order.id)}
              onAssignTable={handleAssignTable}
              onConfirmPayment={handleConfirmPayment}
              onAcceptNoPayment={handleAcceptNoPayment}
              onConfirmWaiterOrder={handleConfirmWaiterOrder}
              onCancel={(id) => { setCancelOrderId(id); setCancelReason('') }}
              tables={tables}
            />
          ))}
        </div>
      </div>

      {/* RIGHT: Checkout Panel */}
      {selectedOrder && (
        <CheckoutPanel
          order={selectedOrder}
          onPay={handlePay}
          onClose={() => setSelectedOrderId(null)}
          onAssignTable={handleAssignTable}
          tables={tables}
        />
      )}
    </div>
    </div>

    {/* Cancel Reason Modal */}
    {cancelOrderId && (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      }}>
        <div style={{
          background: '#1e1e38', borderRadius: '16px', padding: '1.5rem',
          width: '400px', maxWidth: '90vw', boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
        }}>
          <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem', color: '#fff' }}>Cancel Order</h3>
          <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
            Provide a reason for cancellation (required)
          </p>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="e.g. Customer requested cancellation, out of stock..."
            rows={3}
            style={{
              width: '100%', padding: '0.6rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)',
              background: '#16162a', color: '#fff', fontSize: '0.85rem', outline: 'none',
              resize: 'vertical', boxSizing: 'border-box',
            }}
          />
          {cancelReason.trim().length > 0 && cancelReason.trim().length < 3 && (
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.75rem', color: '#f59e0b' }}>
              Reason must be at least 3 characters
            </p>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
            <button
              onClick={() => { setCancelOrderId(null); setCancelReason('') }}
              style={{
                padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', cursor: 'pointer',
              }}
            >
              Back
            </button>
            <button
              onClick={handleCancelOrder}
              disabled={cancelling || cancelReason.trim().length < 3}
              style={{
                padding: '0.5rem 1rem', borderRadius: '10px', border: 'none',
                background: cancelling || cancelReason.trim().length < 3 ? 'rgba(239,68,68,0.3)' : '#ef4444',
                color: cancelling || cancelReason.trim().length < 3 ? 'rgba(255,255,255,0.4)' : '#fff',
                fontSize: '0.85rem', fontWeight: 700, cursor: cancelling || cancelReason.trim().length < 3 ? 'not-allowed' : 'pointer',
              }}
            >
              {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
