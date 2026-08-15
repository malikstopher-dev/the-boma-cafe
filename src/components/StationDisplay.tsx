'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import StatusBadge from '@/components/pos/StatusBadge'
import StationBadge from '@/components/pos/StationBadge'
import OrderTypeBadge from '@/components/pos/OrderTypeBadge'
import Timer from '@/components/pos/Timer'
import CountBadge from '@/components/pos/CountBadge'
import CancelModal from '@/components/pos/CancelModal'
import PrepTimeSelector from '@/components/pos/PrepTimeSelector'
import PrepTimeCountdown from '@/components/pos/PrepTimeCountdown'
import { posTokens as t } from '@/components/pos/DesignSystem'
import { useRealtimeRefresh } from '@/inventory/lib/use-realtime-refresh'
import { ORDER_BOARD_EVENTS } from '@/inventory/lib/order-status'

export interface StationDisplayProps {
  station: 'kitchen' | 'bar'
  title: string
  icon: string
  primaryColor: string
  loginRole: string
  accentBgLight: string
}

interface Order {
  id: string
  order_ref: string | null
  customer_name: string
  phone: string
  order_type: string
  requested_time: string
  items_json: string
  total: number
  status: string
  payment_status: string
  waiter_name: string | null
  table_number: number | null
  created_at: string
  preparation_time_minutes: number | null
  source?: string
  estimated_prep_minutes: number | null
  prep_started_at: string | null
  estimated_ready_at: string | null
  actual_ready_at: string | null
}

const READY_CLEANUP_MS = 5 * 60 * 1000
const STALE_ORDER_MS = 24 * 60 * 60 * 1000

const COLUMNS = [
  { key: 'pending',   label: 'NEW',      icon: '🆕', color: '#f59e0b', bg: 'rgba(245,158,11,0.04)' },
  { key: 'confirmed', label: 'CONFIRMED', icon: '✅', color: '#3b82f6', bg: 'rgba(59,130,246,0.04)' },
  { key: 'preparing', label: 'PREPARING', icon: '🔥', color: '#eab308', bg: 'rgba(234,179,8,0.04)' },
  { key: 'packing',   label: 'PACKING',  icon: '📦', color: '#f97316', bg: 'rgba(249,115,22,0.04)' },
  { key: 'ready',     label: 'READY',    icon: '✅', color: '#10b981', bg: 'rgba(16,185,129,0.04)' },
]

function playDing() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.4)
  } catch { /* audio not available */ }
}

function playReadyChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 660
    osc.type = 'triangle'
    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.6)
  } catch { /* audio not available */ }
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
}

export default function StationDisplay({ station, title, icon, primaryColor, loginRole }: StationDisplayProps) {
  const [authed, setAuthed] = useState(false)
  const [checkingCookie, setCheckingCookie] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [updating, setUpdating] = useState<string | null>(null)
  const [soundOn, setSoundOn] = useState(true)
  const [focusedCol, setFocusedCol] = useState(0)
  const [focusedIdx, setFocusedIdx] = useState(0)
  const [connectionError, setConnectionError] = useState(false)
  const [authExpired, setAuthExpired] = useState(false)
  const [prepTimeInputs, setPrepTimeInputs] = useState<Record<string, string>>({})
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({})
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [showPasswordGate, setShowPasswordGate] = useState(false)
  const [mobileTab, setMobileTab] = useState(0)
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null)
  const [cancelOrderRef, setCancelOrderRef] = useState<string>('')
  const [cancelling, setCancelling] = useState(false)
  const [prepSelectorOpen, setPrepSelectorOpen] = useState(false)
  const [prepSelectorOrderId, setPrepSelectorOrderId] = useState<string | null>(null)
  const [prepSelectorRef, setPrepSelectorRef] = useState<string>('')
  const [prepSelectorLoading, setPrepSelectorLoading] = useState(false)
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cardErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevIdsRef = useRef<Set<string>>(new Set())
  const readyTimesRef = useRef<Map<string, number>>(new Map())
  const inputRef = useRef<HTMLInputElement>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const apiUrl = `/api/supabase/orders?station=${station}`

  useEffect(() => { inputRef.current?.focus() }, [showPasswordGate])

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch(apiUrl)
      if (res.status === 401) { setAuthExpired(true); setConnectionError(false); return }
      if (!res.ok) {
        console.error('[StationDisplay] fetch failed:', res.status, res.statusText)
        setConnectionError(true); return
      }
      setConnectionError(false)
      setAuthExpired(false)
      const text = await res.text()
      const data: Order[] = text ? JSON.parse(text) : []

      const safeOrders = Array.isArray(data) ? data : []
      const currentIds = new Set(safeOrders.map((o) => o.id))
      const prevIds = prevIdsRef.current

      if (prevIds.size > 0 && soundOn) {
        for (const id of Array.from(currentIds)) {
          if (!prevIds.has(id)) {
            const order = safeOrders.find((o) => o.id === id)
            if (order && order.status === 'pending') playDing()
          }
        }
      }

      for (const order of safeOrders) {
        if (order.status === 'ready' && !readyTimesRef.current.has(order.id)) {
          readyTimesRef.current.set(order.id, Date.now())
          if (soundOn) playReadyChime()
        }
        if (order.status !== 'ready') readyTimesRef.current.delete(order.id)
      }

      prevIdsRef.current = currentIds
      setOrders(safeOrders)
    } catch (err) {
      console.error('[StationDisplay] loadOrders error:', err)
      setConnectionError(true)
    }
  }, [soundOn, apiUrl])

  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    fetch('/api/admin/auth', { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        clearTimeout(timeout)
        if (data.authenticated) setAuthed(true)
        else { setShowPasswordGate(true); setAuthExpired(true) }
      })
      .catch(() => {
        clearTimeout(timeout)
        setShowPasswordGate(true)
        setAuthExpired(true)
      })
      .finally(() => setCheckingCookie(false))

    return () => { clearTimeout(timeout); controller.abort() }
  }, [])

  // E1-5: orders is RLS-blocked for the anon browser key, so the old
  // postgres_changes subscription on `orders` never fired. Subscribe to
  // the anon-readable realtime_events signal table instead and refetch
  // (loadOrders keeps the ding + ready chime + 24h stale filtering).
  // The poll stays as the fallback (15s when realtime is down, 30s up).
  const { subscribed: realtimeActive } = useRealtimeRefresh({
    channel: `e1-station-${station}`,
    events: [...ORDER_BOARD_EVENTS],
    enabled: authed && !authExpired,
    onRefresh: () => { void loadOrders() },
  })

  useEffect(() => {
    if (!authed || authExpired) return
    loadOrders()

    const fallbackInterval = setInterval(loadOrders, realtimeActive ? 30000 : 15000)
    return () => clearInterval(fallbackInterval)
  }, [authed, authExpired, loadOrders, realtimeActive])

  const displayOrders = useMemo(() => {
    const safeOrders = Array.isArray(orders) ? orders : []
    return safeOrders.filter((o) => {
      // Auto-archive orders older than 24h (stale/zombie orders) so boards
      // only ever reflect the current shift.
      if (o.created_at && Date.now() - new Date(o.created_at).getTime() > STALE_ORDER_MS) return false
      if (o.status !== 'ready') return true
      const readyTs = readyTimesRef.current.get(o.id)
      return !readyTs || Date.now() - readyTs < READY_CLEANUP_MS
    })
  }, [orders])

  useEffect(() => {
    const safeOrders = Array.isArray(orders) ? orders : []
    const readyIds = new Set(safeOrders.filter((o) => o.status === 'ready').map((o) => o.id))
    Array.from(readyTimesRef.current.keys()).forEach((id) => { if (!readyIds.has(id)) readyTimesRef.current.delete(id) })
  }, [orders])

  const showCardError = (orderId: string, msg: string) => {
    setCardErrors(prev => ({ ...prev, [orderId]: msg }))
    if (cardErrorTimerRef.current) clearTimeout(cardErrorTimerRef.current)
    cardErrorTimerRef.current = setTimeout(() => setCardErrors({}), 6000)
  }

  const showError = (msg: string) => {
    setErrorMessage(msg)
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
    errorTimerRef.current = setTimeout(() => setErrorMessage(null), 5000)
  }

  const updateStatus = async (id: string, status: string, prepTimeMinutes?: number) => {
    setUpdating(id)
    try {
      const body: Record<string, any> = { status }
      if (prepTimeMinutes !== undefined) {
        body.preparation_time_minutes = prepTimeMinutes
        body.estimated_prep_minutes = prepTimeMinutes
      }
      if (status === 'ready') {
        body.actual_ready_at = new Date().toISOString()
      }
      const res = await fetch(`/api/supabase/orders?id=${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (res.ok) {
        setCardErrors(prev => { const n = { ...prev }; delete n[id]; return n })
        setOrders(prev => prev.map(o => {
          if (o.id !== id) return o
          const updated = { ...o, status, preparation_time_minutes: prepTimeMinutes ?? o.preparation_time_minutes }
          if (prepTimeMinutes !== undefined) {
            updated.estimated_prep_minutes = prepTimeMinutes
            updated.prep_started_at = new Date().toISOString()
            updated.estimated_ready_at = new Date(Date.now() + prepTimeMinutes * 60 * 1000).toISOString()
          }
          if (status === 'ready') {
            updated.actual_ready_at = new Date().toISOString()
          }
          return updated
        }))
      } else {
        const errData = await res.json().catch(() => ({}))
        showError(errData?.error || `Failed to update order (${res.status})`)
        showCardError(id, errData?.error || `Error ${res.status}`)
      }
    } catch {
      showError('Network error — please try again')
      showCardError(id, 'Network error')
    } finally {
      setUpdating(null)
    }
  }

  const cancelOrder = async (reason: string) => {
    if (!cancelOrderId) return
    setCancelling(true)
    try {
      const res = await fetch(`/api/supabase/orders?id=${cancelOrderId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled', cancellation_reason: reason }),
      })
      if (res.ok) {
        setOrders(prev => prev.map(o => o.id === cancelOrderId ? { ...o, status: 'cancelled', cancellation_reason: reason } : o))
        setCancelModalOpen(false)
        setCancelOrderId(null)
        setCancelOrderRef('')
      } else {
        const errData = await res.json().catch(() => ({}))
        showError(errData?.error || 'Failed to cancel order')
      }
    } catch { showError('Network error — try again') }
    finally { setCancelling(false) }
  }

  const openCancelModal = (id: string, ref: string) => {
    setCancelOrderId(id)
    setCancelOrderRef(ref)
    setCancelModalOpen(true)
  }

  const openPrepSelector = (id: string, ref: string) => {
    setPrepSelectorOrderId(id)
    setPrepSelectorRef(ref)
    setPrepSelectorOpen(true)
  }

  const handlePrepTimeSelect = async (minutes: number) => {
    if (!prepSelectorOrderId) return
    setPrepSelectorLoading(true)
    await updateStatus(prepSelectorOrderId, 'preparing', minutes)
    setPrepSelectorLoading(false)
    setPrepSelectorOpen(false)
    setPrepSelectorOrderId(null)
    setPrepSelectorRef('')
  }

  const handlePrepTimeSkip = async () => {
    if (!prepSelectorOrderId) return
    setPrepSelectorLoading(true)
    await updateStatus(prepSelectorOrderId, 'preparing')
    setPrepSelectorLoading(false)
    setPrepSelectorOpen(false)
    setPrepSelectorOrderId(null)
    setPrepSelectorRef('')
  }

  const safeDisplayOrders = Array.isArray(displayOrders) ? displayOrders : []
  const pending = safeDisplayOrders.filter(o => o.status === 'pending')
  const confirmed = safeDisplayOrders.filter(o => o.status === 'confirmed')
  const preparing = safeDisplayOrders.filter(o => o.status === 'preparing')
  const packing = safeDisplayOrders.filter(o => o.status === 'packing')
  const readyOrders = safeDisplayOrders.filter(o => o.status === 'ready')
  const allColumns = [pending, confirmed, preparing, packing, readyOrders]

  // Auto-collapse empty columns on desktop so active columns get the full width.
  const visibleColumns = COLUMNS
    .map((col, i) => ({ ...col, items: allColumns[i] }))
    .filter(c => c.items.length > 0)

  useEffect(() => { setFocusedIdx(0) }, [focusedCol, visibleColumns.length])

  // Clamp keyboard column focus to the currently visible (non-empty) columns.
  useEffect(() => {
    setFocusedCol(p => {
      if (visibleColumns.length === 0) return 0
      if (p >= visibleColumns.length) return visibleColumns.length - 1
      return p
    })
  }, [visibleColumns.length])

  useEffect(() => {
    if (!authed) return
    const handler = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return
      if (e.key === 'ArrowRight') { setFocusedCol(p => Math.min(p + 1, Math.max(visibleColumns.length - 1, 0))); return }
      if (e.key === 'ArrowLeft') { setFocusedCol(p => Math.max(p - 1, 0)); return }
      if (e.key === 'ArrowDown') { const col = visibleColumns[focusedCol]; if (col) setFocusedIdx(p => Math.min(p + 1, col.items.length - 1)); return }
      if (e.key === 'ArrowUp') { setFocusedIdx(p => Math.max(p - 1, 0)); return }
      const col = visibleColumns[focusedCol]
      if (!col || !col.items || col.items.length === 0) return
      const order = col.items[focusedIdx]
      if (!order || updating === order.id) return
      const displayRef = order.order_ref || `#${order.id.slice(0, 8).toUpperCase()}`
      if (e.key === '1' && (order.status === 'confirmed' || (order.status === 'pending' && order.source === 'waiter'))) { openPrepSelector(order.id, displayRef); return }
      if (e.key === '2' && order.status === 'preparing') { updateStatus(order.id, 'ready'); return }
      if (e.key === '3' && order.status === 'packing') { updateStatus(order.id, 'ready'); return }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [authed, focusedCol, focusedIdx, orders, updating, prepTimeInputs, openPrepSelector, visibleColumns])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordLoading(true)
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, role: loginRole }),
      })
      if (res.ok) { setShowPasswordGate(false); setAuthed(true); setAuthExpired(false); setPassword('') }
      else { setPasswordError(`Invalid ${title} password`) }
    } catch { setPasswordError('Connection error') }
    finally { setPasswordLoading(false) }
  }

  const handleLogout = () => { window.location.href = '/api/admin/auth?action=logout' }

  if (checkingCookie) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: t.colors.bg.primary, color: t.colors.text.muted, fontFamily: t.typography.fontFamily, gap: 16 }}>
        <div style={{ width: 32, height: 32, border: `3px solid ${t.colors.border.default}`, borderTopColor: primaryColor, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ fontSize: t.typography.fontSize.sm }}>Checking session...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!authed || showPasswordGate || authExpired) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.colors.bg.primary, padding: 24 }}>
        <form onSubmit={handleLogin} style={{
          background: t.colors.bg.surface, borderRadius: 24, padding: '3rem 2rem',
          width: '100%', maxWidth: 400, border: `1px solid ${t.colors.border.default}`,
          boxShadow: t.shadow.lg, display: 'flex', flexDirection: 'column', gap: 20,
        }}>
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
            <h1 style={{ fontSize: 24, fontWeight: t.typography.fontWeight.bold, color: t.colors.text.primary, margin: 0, fontFamily: t.typography.fontFamily }}>{title}</h1>
            <p style={{ color: t.colors.text.muted, fontSize: t.typography.fontSize.sm, marginTop: 8 }}>
              {authExpired ? 'Session expired — please log in again' : `Enter ${title} password`}
            </p>
          </div>
          <input ref={inputRef} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={`${title} password`}
            style={{
              width: '100%', padding: '14px 16px', borderRadius: t.radius.lg,
              border: `2px solid ${t.colors.border.default}`,
              background: 'rgba(255,255,255,0.05)', color: t.colors.text.primary,
              fontSize: t.typography.fontSize.lg, textAlign: 'center', outline: 'none',
              boxSizing: 'border-box', fontFamily: t.typography.fontFamily,
              transition: 'border-color 0.15s',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = primaryColor)}
            onBlur={e => (e.currentTarget.style.borderColor = t.colors.border.default)}
            required autoComplete="off" />
          {passwordError && <div style={{ color: '#ef4444', fontSize: t.typography.fontSize.sm, textAlign: 'center' }}>{passwordError}</div>}
          <button type="submit" disabled={passwordLoading}
            style={{
              width: '100%', padding: '14px 16px', border: 'none', borderRadius: t.radius.lg,
              background: passwordLoading ? 'rgba(255,255,255,0.1)' : primaryColor,
              color: passwordLoading ? t.colors.text.muted : '#000',
              fontSize: t.typography.fontSize.lg, fontWeight: t.typography.fontWeight.bold,
              cursor: passwordLoading ? 'not-allowed' : 'pointer',
              opacity: passwordLoading ? 0.6 : 1, fontFamily: t.typography.fontFamily,
              transition: 'opacity 0.15s',
            }}>
            {passwordLoading ? 'Verifying...' : `Enter ${title}`}
          </button>
        </form>
      </div>
    )
  }

  const columnData = COLUMNS.map((col, i) => ({ ...col, items: allColumns[i] }))

  const activeCol = isMobile ? mobileTab : focusedCol
  const activeColData = columnData[activeCol]

  return (
    <div style={{ minHeight: '100vh', background: t.colors.bg.primary, color: t.colors.text.primary, fontFamily: t.typography.fontFamily, display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes flash-border { 0%, 100% { border-color: ${primaryColor}; } 50% { border-color: ${primaryColor}00; } }
        @keyframes fade-out { to { opacity: 0; transform: scale(0.96); } }
        .pos-new-flash { animation: flash-border 1s ease-in-out 3; }
        .pos-fade-ready { animation: fade-out 2s ease-in forwards; }
        @media (max-width: 768px) { .pos-kanban-desktop { display: none !important; } .pos-kanban-mobile { display: flex !important; } }
        @media (min-width: 769px) { .pos-kanban-desktop { display: grid !important; } .pos-kanban-mobile { display: none !important; } }
      `}</style>

      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 16px', background: t.colors.bg.surface,
        borderBottom: `1px solid ${t.colors.border.default}`, flexShrink: 0,
        gap: 8, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: t.typography.fontSize.sm, fontWeight: t.typography.fontWeight.bold,
            color: primaryColor, textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: primaryColor, display: 'inline-block' }} />
            {icon} {title.toUpperCase()}
          </span>
          <span style={{ fontSize: t.typography.fontSize.xs, color: t.colors.text.dim, fontFamily: t.typography.fontFamilyMono }}>
            {new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <CountBadge count={pending.length} color={primaryColor} size="sm" />
          {!isMobile && <span style={{ fontSize: t.typography.fontSize.xs, color: t.colors.text.dim }}>←→ nav · 1 Prep · 2 Ready</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setSoundOn(!soundOn)} title={soundOn ? 'Sound on' : 'Sound off'}
            style={{ padding: '6px 10px', border: `1px solid ${t.colors.border.default}`, borderRadius: t.radius.sm, background: 'rgba(255,255,255,0.05)', color: soundOn ? '#10b981' : t.colors.text.dim, fontSize: 16, cursor: 'pointer' }}>
            {soundOn ? '🔊' : '🔇'}
          </button>
          <button onClick={handleLogout}
            style={{ padding: '6px 10px', border: '1px solid rgba(239,68,68,0.3)', borderRadius: t.radius.sm, background: 'transparent', color: '#ef4444', fontSize: t.typography.fontSize.sm, cursor: 'pointer', fontFamily: t.typography.fontFamily }}>
            Logout
          </button>
        </div>
      </div>

      {/* Error banners */}
      {connectionError && <div style={{ padding: '6px 16px', background: 'rgba(239,68,68,0.15)', borderBottom: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: t.typography.fontSize.sm, textAlign: 'center', flexShrink: 0 }}>⚠ Connection lost — retrying...</div>}
      {errorMessage && <div style={{ padding: '6px 16px', background: 'rgba(239,68,68,0.12)', borderBottom: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5', fontSize: t.typography.fontSize.sm, textAlign: 'center', flexShrink: 0 }}>{errorMessage}</div>}

      {/* Empty state */}
      {!connectionError && displayOrders.length === 0 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16, opacity: 0.5 }}>{icon}</div>
          <h2 style={{ fontSize: 20, fontWeight: t.typography.fontWeight.bold, color: t.colors.text.primary, margin: '0 0 8px' }}>No {station === 'bar' ? 'drink' : 'food'} orders yet</h2>
          <p style={{ color: t.colors.text.dim, fontSize: t.typography.fontSize.md, margin: '0 0 24px', maxWidth: 320 }}>
            {station === 'bar' ? 'Drink orders from waiters will appear here.' : 'Food orders from waiters will appear here.'}
          </p>
          <button onClick={loadOrders}
            style={{ padding: '10px 24px', borderRadius: t.radius.md, border: `1px solid ${primaryColor}`, background: 'transparent', color: primaryColor, fontSize: t.typography.fontSize.md, fontWeight: t.typography.fontWeight.bold, cursor: 'pointer', fontFamily: t.typography.fontFamily }}>
            🔄 Refresh
          </button>
        </div>
      )}

      {/* Mobile tab bar */}
      {isMobile && displayOrders.length > 0 && (
        <div style={{ display: 'flex', background: t.colors.bg.surface, borderBottom: `1px solid ${t.colors.border.default}`, overflowX: 'auto', flexShrink: 0 }}>
          {columnData.map((col, i) => (
            <button key={col.key} onClick={() => setMobileTab(i)}
              style={{
                flex: 1, minWidth: 0, padding: '8px 4px', border: 'none',
                borderBottom: i === mobileTab ? `3px solid ${col.color}` : '3px solid transparent',
                background: i === mobileTab ? col.bg : 'transparent',
                color: i === mobileTab ? col.color : t.colors.text.muted,
                fontSize: t.typography.fontSize.xs, fontWeight: t.typography.fontWeight.bold,
                cursor: 'pointer', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 2, fontFamily: t.typography.fontFamily, whiteSpace: 'nowrap',
              }}>
              <span style={{ fontSize: 18 }}>{col.icon}</span>
              {col.label}
              {col.items.length > 0 && <CountBadge count={col.items.length} color={col.color} size="sm" />}
            </button>
          ))}
        </div>
      )}

      {/* Desktop kanban — empty columns auto-collapse, active columns expand */}
      {displayOrders.length > 0 && (
        <div className="pos-kanban-desktop" style={{ flex: 1, display: 'grid', gridTemplateColumns: `repeat(${Math.max(visibleColumns.length, 1)}, minmax(0, 1fr))`, gap: 0, overflow: 'hidden' }}>
          {visibleColumns.map((col, colIdx) => (
            <Column key={col.key} col={col} colIdx={colIdx} focusedCol={isMobile ? mobileTab : focusedCol} focusedIdx={focusedIdx}
              orders={col.items} updating={updating} updateStatus={updateStatus} prepTimeInputs={prepTimeInputs} setPrepTimeInputs={setPrepTimeInputs}
              cardErrors={cardErrors} readyTimesRef={readyTimesRef} station={station} isMobile={false} openCancelModal={openCancelModal} openPrepSelector={openPrepSelector} primaryColor={primaryColor} />
          ))}
        </div>
      )}

      {/* Mobile single-column view */}
      {isMobile && displayOrders.length > 0 && activeColData && (
        <div className="pos-kanban-mobile" style={{ flex: 1, flexDirection: 'column', overflow: 'hidden', background: activeColData.bg }}>
          <Column col={activeColData} colIdx={activeCol} focusedCol={activeCol} focusedIdx={0}
            orders={activeColData.items} updating={updating} updateStatus={updateStatus} prepTimeInputs={prepTimeInputs} setPrepTimeInputs={setPrepTimeInputs}
            cardErrors={cardErrors} readyTimesRef={readyTimesRef} station={station} isMobile={true} openCancelModal={openCancelModal} openPrepSelector={openPrepSelector} primaryColor={primaryColor} />
        </div>
      )}

      <PrepTimeSelector
        open={prepSelectorOpen}
        station={station}
        orderRef={prepSelectorRef}
        onSelect={handlePrepTimeSelect}
        onSkip={handlePrepTimeSkip}
        onClose={() => { setPrepSelectorOpen(false); setPrepSelectorOrderId(null); setPrepSelectorRef('') }}
        loading={prepSelectorLoading}
      />

      <CancelModal open={cancelModalOpen} onClose={() => { setCancelModalOpen(false); setCancelOrderId(null); setCancelOrderRef('') }}
        onConfirm={cancelOrder} orderRef={cancelOrderRef} loading={cancelling} />
    </div>
  )
}

/* ── Column sub-component ── */
function Column({ col, colIdx, focusedCol, focusedIdx, orders, updating, updateStatus, prepTimeInputs, setPrepTimeInputs, cardErrors, readyTimesRef, station, isMobile, openCancelModal, openPrepSelector, primaryColor }: {
  col: typeof COLUMNS[number] & { items: Order[] }
  colIdx: number
  focusedCol: number
  focusedIdx: number
  orders: Order[]
  updating: string | null
  updateStatus: (id: string, status: string, prepTime?: number) => Promise<void>
  prepTimeInputs: Record<string, string>
  setPrepTimeInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>
  cardErrors: Record<string, string>
  readyTimesRef: React.MutableRefObject<Map<string, number>>
  station: string
  isMobile: boolean
  openCancelModal: (id: string, ref: string) => void
  openPrepSelector: (id: string, ref: string) => void
  primaryColor: string
}) {
  const isActive = colIdx === focusedCol

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', background: col.bg,
      borderRight: !isMobile ? `1px solid ${t.colors.border.default}` : 'none',
      outline: isActive && !isMobile ? `2px solid ${col.color}40` : 'none',
      outlineOffset: '-2px', overflow: 'hidden',
    }}>
      {/* Column header */}
      <div style={{ padding: '8px 12px', borderBottom: `2px solid ${col.color}30`, flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: t.typography.fontSize.sm, fontWeight: t.typography.fontWeight.bold, color: col.color, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: t.typography.fontFamily }}>
          {col.icon} {col.label}
        </h2>
        <span style={{ padding: '2px 8px', borderRadius: t.radius.full, fontSize: t.typography.fontSize.sm, fontWeight: t.typography.fontWeight.bold, background: `${col.color}20`, color: col.color }}>{col.items.length}</span>
      </div>

      {/* Cards */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {col.items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 8px', color: t.colors.text.dim, fontSize: t.typography.fontSize.sm }}>
            {col.key === 'pending' ? 'No new orders' : col.key === 'confirmed' ? 'No accepted' : col.key === 'preparing' ? 'Nothing in prep' : 'No orders'}
          </div>
        )}
        {col.items.map((order, idx) => (
          <OrderCard key={order.id} order={order} col={col} colIdx={colIdx} focusedCol={focusedCol} focusedIdx={idx}
            updating={updating} updateStatus={updateStatus} prepTimeInputs={prepTimeInputs} setPrepTimeInputs={setPrepTimeInputs}
            cardErrors={cardErrors} readyTimesRef={readyTimesRef} station={station} isMobile={isMobile} openCancelModal={openCancelModal} openPrepSelector={openPrepSelector} primaryColor={primaryColor} />
        ))}
      </div>
    </div>
  )
}

/* ── Order Card sub-component ── */
function OrderCard({ order, col, colIdx, focusedCol, focusedIdx, updating, updateStatus, prepTimeInputs, setPrepTimeInputs, cardErrors, readyTimesRef, station, isMobile, openCancelModal, openPrepSelector, primaryColor }: {
  order: Order
  col: typeof COLUMNS[number]
  colIdx: number
  focusedCol: number
  focusedIdx: number
  updating: string | null
  updateStatus: (id: string, status: string, prepTime?: number) => Promise<void>
  prepTimeInputs: Record<string, string>
  setPrepTimeInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>
  cardErrors: Record<string, string>
  readyTimesRef: React.MutableRefObject<Map<string, number>>
  station: string
  isMobile: boolean
  openCancelModal: (id: string, ref: string) => void
  openPrepSelector: (id: string, ref: string) => void
  primaryColor: string
}) {
  const isFocused = colIdx === focusedCol
  const isNew = order.status === 'pending'
  const readyTs = readyTimesRef.current.get(order.id)
  const readyAge = readyTs ? Date.now() - readyTs : 0
  const fading = order.status === 'ready' && readyAge > READY_CLEANUP_MS - 30000

  let parsed: any = []
  try { parsed = JSON.parse(order.items_json) } catch { /* */ }
  const items: any[] = Array.isArray(parsed) ? parsed : (parsed?.items || [])
  const metadata = parsed?.metadata || {}
  const hasNotes = items.some((i: any) => i.notes) || !!metadata.orderNotes
  const displayRef = order.order_ref || `#${order.id.slice(0, 8).toUpperCase()}`
  const itemCount = items.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0)

  return (
    <div className={isNew ? 'pos-new-flash' : fading ? 'pos-fade-ready' : ''} style={{
      background: t.colors.bg.card, borderRadius: t.radius.lg, padding: isMobile ? 12 : 14,
      border: isFocused ? `2px solid ${col.color}` : `1px solid ${col.color}30`,
      boxShadow: isFocused ? `0 0 16px ${col.color}25` : t.shadow.sm,
      transition: 'opacity 0.3s, transform 0.3s', opacity: fading ? 0 : 1, position: 'relative', overflow: 'hidden',
    }}>
      {/* Colored left accent */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: col.color, borderRadius: '3px 0 0 3px' }} />

      {/* Row 1: Ref + Timer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, paddingLeft: 6 }}>
        <span style={{ fontSize: isMobile ? t.typography.fontSize.lg : t.typography.fontSize.xl, fontWeight: t.typography.fontWeight.extrabold, fontFamily: t.typography.fontFamilyMono, color: t.colors.text.primary, lineHeight: 1.2 }}>{displayRef}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Timer startTime={order.created_at} targetMinutes={station === 'bar' ? 5 : 15} size="sm" fixedUrgency />
          <PrepTimeCountdown
            estimatedReadyAt={order.estimated_ready_at}
            prepStartedAt={order.prep_started_at}
            estimatedPrepMinutes={order.estimated_prep_minutes}
            status={order.status}
            size="sm"
          />
        </div>
      </div>

      {/* Row 2: Badges */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap', paddingLeft: 6 }}>
        <OrderTypeBadge type={order.order_type as any} size="sm" />
        <StationBadge station={station as any} size="sm" />
        {order.order_type !== 'dine-in' && (
          <span style={{
            padding: '2px 6px', borderRadius: t.radius.sm, fontSize: t.typography.fontSize.xs, fontWeight: t.typography.fontWeight.bold,
            background: order.payment_status === 'paid' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
            color: order.payment_status === 'paid' ? '#10b981' : '#f59e0b',
            border: `1px solid ${order.payment_status === 'paid' ? '#10b98130' : '#f59e0b30'}`,
          }}>
            {order.payment_status === 'paid' ? '✅ Paid' : '⏳ Pay'}
          </span>
        )}
      </div>

      {/* Row 3: Meta info */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6, paddingLeft: 6, fontSize: t.typography.fontSize.sm, color: t.colors.text.secondary }}>
        {order.table_number && <span style={{ fontWeight: t.typography.fontWeight.bold, color: '#ef4444' }}>🪑 T{order.table_number}</span>}
        {order.waiter_name && <span style={{ fontWeight: t.typography.fontWeight.semibold }}>👤 {order.waiter_name}</span>}
        <span>📦 {itemCount} item{itemCount !== 1 ? 's' : ''}</span>
        <span style={{ fontWeight: t.typography.fontWeight.bold, color: t.colors.text.primary }}>R{order.total.toFixed(0)}</span>
      </div>

      {/* Items */}
      {items.length > 0 && (
        <div style={{ marginBottom: 6, paddingLeft: 6 }}>
          {items.map((item: any, idx: number) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '3px 0', fontSize: t.typography.fontSize.md, borderBottom: idx < items.length - 1 ? `1px solid ${t.colors.border.default}` : 'none' }}>
              <span>
                <strong style={{ color: t.colors.text.primary }}>{item.quantity}x</strong>{' '}
                <span style={{ color: t.colors.text.secondary }}>{item.name}</span>
              </span>
              {item.notes && <span style={{ fontSize: t.typography.fontSize.xs, color: '#fbbf24', fontWeight: t.typography.fontWeight.semibold, marginLeft: 8, flexShrink: 0 }}>⚠️ {item.notes}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Special instructions */}
      {hasNotes && (
        <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: t.radius.md, padding: 8, marginBottom: 6, marginLeft: 6 }}>
          <span style={{ fontSize: t.typography.fontSize.xs, fontWeight: t.typography.fontWeight.bold, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.05em' }}>⚠️ Notes</span>
          {items.filter((i: any) => i.notes).map((item: any, idx: number) => (
            <div key={idx} style={{ fontSize: t.typography.fontSize.sm, color: '#fde68a', marginTop: 2 }}><strong>{item.name}:</strong> {item.notes}</div>
          ))}
        </div>
      )}

      {metadata.orderNotes && (
        <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: t.radius.md, padding: 8, marginBottom: 6, marginLeft: 6 }}>
          <span style={{ fontSize: t.typography.fontSize.xs, fontWeight: t.typography.fontWeight.extrabold, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>⚠️ Order Note</span>
          <div style={{ fontSize: t.typography.fontSize.sm, color: '#fca5a5', marginTop: 2 }}>{metadata.orderNotes}</div>
        </div>
      )}

      {/* Card error */}
      {cardErrors[order.id] && (
        <div style={{ padding: '4px 8px', marginBottom: 6, borderRadius: t.radius.sm, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: t.typography.fontSize.sm, fontWeight: t.typography.fontWeight.semibold, textAlign: 'center', marginLeft: 6 }}>
          ⚠ {cardErrors[order.id]}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ paddingLeft: 6 }}>
        {order.status === 'pending' && order.source === 'waiter' && (
          <button onClick={() => openPrepSelector(order.id, displayRef)} disabled={updating === order.id}
            style={{
              width: '100%', padding: isMobile ? 14 : 12, border: 'none', borderRadius: t.radius.md,
              background: t.colors.accent.purple, color: '#fff',
              fontSize: isMobile ? t.typography.fontSize.lg : t.typography.fontSize.md,
              fontWeight: t.typography.fontWeight.bold, cursor: updating === order.id ? 'not-allowed' : 'pointer',
              opacity: updating === order.id ? 0.5 : 1, fontFamily: t.typography.fontFamily, touchAction: 'manipulation',
            }}>
            {updating === order.id ? '...' : '🔥 START PREP'}
          </button>
        )}
        {order.status === 'pending' && order.source !== 'waiter' && (
          <>
            <div style={{ width: '100%', padding: 10, borderRadius: t.radius.md, background: 'rgba(245,158,11,0.08)', color: '#f59e0b', fontSize: t.typography.fontSize.sm, fontWeight: t.typography.fontWeight.semibold, textAlign: 'center', border: '1px solid rgba(245,158,11,0.2)' }}>
              ⏳ Awaiting admin confirmation
            </div>
            <button onClick={() => openCancelModal(order.id, displayRef)} style={{ width: '100%', marginTop: 4, padding: 8, border: '1px solid rgba(239,68,68,0.3)', borderRadius: t.radius.sm, background: 'transparent', color: '#ef4444', fontSize: t.typography.fontSize.xs, fontWeight: t.typography.fontWeight.semibold, cursor: 'pointer', fontFamily: t.typography.fontFamily }}>
              ❌ Cancel
            </button>
          </>
        )}
        {order.status === 'confirmed' && (
          <>
            {order.preparation_time_minutes && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6, paddingLeft: 6 }}>
                <span style={{ fontSize: t.typography.fontSize.xs, color: t.colors.text.dim }}>Est: {order.preparation_time_minutes}m</span>
              </div>
            )}
            <button onClick={() => openPrepSelector(order.id, displayRef)} disabled={updating === order.id}
              style={{
                width: '100%', padding: isMobile ? 14 : 12, border: 'none', borderRadius: t.radius.md,
                background: t.colors.accent.purple, color: '#fff',
                fontSize: isMobile ? t.typography.fontSize.lg : t.typography.fontSize.md,
                fontWeight: t.typography.fontWeight.bold, cursor: updating === order.id ? 'not-allowed' : 'pointer',
                opacity: updating === order.id ? 0.5 : 1, fontFamily: t.typography.fontFamily, touchAction: 'manipulation',
              }}>
              {updating === order.id ? '...' : '🔥 START PREP'}
            </button>
          </>
        )}
        {(order.status === 'preparing' || order.status === 'packing') && (
          <>
            {order.status === 'preparing' && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                <input type="number" min="1" max="999" placeholder="Remaining (min)"
                  value={prepTimeInputs[order.id] || ''}
                  onChange={e => { e.stopPropagation(); setPrepTimeInputs(prev => ({ ...prev, [order.id]: e.target.value })) }}
                  onKeyDown={e => { if (e.key === 'Enter') { const mins = prepTimeInputs[order.id] ? parseInt(prepTimeInputs[order.id]) : undefined; if (mins) updateStatus(order.id, order.status, mins) } }}
                  style={{ flex: 1, padding: '6px 8px', borderRadius: t.radius.sm, border: `1px solid ${t.colors.border.default}`, background: 'rgba(255,255,255,0.08)', color: t.colors.text.primary, fontSize: t.typography.fontSize.sm, fontWeight: t.typography.fontWeight.semibold, textAlign: 'center', outline: 'none', fontFamily: t.typography.fontFamily }} />
                <button onClick={() => { const mins = prepTimeInputs[order.id] ? parseInt(prepTimeInputs[order.id]) : undefined; if (mins) updateStatus(order.id, order.status, mins) }}
                  disabled={updating === order.id}
                  style={{ padding: '6px 10px', borderRadius: t.radius.sm, border: `1px solid ${t.colors.border.default}`, background: 'rgba(255,255,255,0.1)', color: t.colors.text.secondary, fontSize: t.typography.fontSize.xs, fontWeight: t.typography.fontWeight.semibold, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: t.typography.fontFamily }}>Set</button>
              </div>
            )}
            <button onClick={() => updateStatus(order.id, 'ready')} disabled={updating === order.id}
              style={{
                width: '100%', padding: isMobile ? 14 : 12, border: 'none', borderRadius: t.radius.md,
                background: '#10b981', color: '#000',
                fontSize: isMobile ? t.typography.fontSize.lg : t.typography.fontSize.md,
                fontWeight: t.typography.fontWeight.extrabold, cursor: updating === order.id ? 'not-allowed' : 'pointer',
                opacity: updating === order.id ? 0.5 : 1, fontFamily: t.typography.fontFamily, touchAction: 'manipulation',
              }}>
              {updating === order.id ? '...' : '✅ MARK READY'}
            </button>
          </>
        )}
        {order.status === 'ready' && (
          <div style={{ textAlign: 'center', fontSize: t.typography.fontSize.sm, color: t.colors.text.dim, padding: '4px 0' }}>
            {readyAge > 0 && <span>Auto-clear in {Math.ceil((READY_CLEANUP_MS - readyAge) / 60000)}m</span>}
          </div>
        )}
      </div>
    </div>
  )
}
