'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import StatusBadge from '@/components/pos/StatusBadge'
import StationBadge from '@/components/pos/StationBadge'
import OrderTypeBadge from '@/components/pos/OrderTypeBadge'
import Timer from '@/components/pos/Timer'
import CountBadge from '@/components/pos/CountBadge'

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
}

const READY_CLEANUP_MS = 5 * 60 * 1000

const COLUMNS = [
  { key: 'pending',   label: 'NEW',      icon: '🆕', color: '#f59e0b', bg: 'rgba(245,158,11,0.06)' },
  { key: 'confirmed', label: 'CONFIRMED', icon: '✅', color: '#3b82f6', bg: 'rgba(59,130,246,0.06)' },
  { key: 'preparing', label: 'PREPARING', icon: '🔥', color: '#eab308', bg: 'rgba(234,179,8,0.06)' },
  { key: 'packing',   label: 'PACKING',  icon: '📦', color: '#f97316', bg: 'rgba(249,115,22,0.06)' },
  { key: 'ready',     label: 'READY',    icon: '✅', color: '#10b981', bg: 'rgba(16,185,129,0.06)' },
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

function parseItems(json: string): any[] {
  try {
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? parsed : (parsed?.items || [])
  } catch { return [] }
}

function parseMetadata(json: string): any {
  try {
    const parsed = JSON.parse(json)
    return parsed && !Array.isArray(parsed) ? (parsed.metadata || {}) : {}
  } catch { return {} }
}

function formatCurrency(amount: number) {
  return `R${amount.toFixed(0)}`
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
      if (!res.ok) { setConnectionError(true); return }
      setConnectionError(false)
      setAuthExpired(false)
      const data: Order[] = await res.json()

      const currentIds = new Set(data.map((o) => o.id))
      const prevIds = prevIdsRef.current

      if (prevIds.size > 0 && soundOn) {
        for (const id of Array.from(currentIds)) {
          if (!prevIds.has(id)) {
            const order = data.find((o) => o.id === id)
            if (order && order.status === 'pending') playDing()
          }
        }
      }

      for (const order of data) {
        if (order.status === 'ready' && !readyTimesRef.current.has(order.id)) {
          readyTimesRef.current.set(order.id, Date.now())
          if (soundOn) playReadyChime()
        }
        if (order.status !== 'ready') readyTimesRef.current.delete(order.id)
      }

      prevIdsRef.current = currentIds
      setOrders(data)
    } catch {
      setConnectionError(true)
    }
  }, [soundOn, apiUrl])

  useEffect(() => {
    fetch('/api/admin/auth')
      .then(r => r.json())
      .then(data => { if (data.authenticated) setAuthed(true); else setShowPasswordGate(true) })
      .catch(() => setShowPasswordGate(true))
      .finally(() => setCheckingCookie(false))
  }, [])

  useEffect(() => {
    if (!authed || authExpired) return
    loadOrders()

    let supabase: ReturnType<typeof createBrowserClient> | null = null
    let channel: ReturnType<ReturnType<typeof createBrowserClient>['channel']> | null = null

    try {
      supabase = createBrowserClient()
      channel = supabase
        .channel(`${station}-orders`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `station=eq.${station}` }, (payload) => {
          const newOrder = payload.new as Order
          if (newOrder && newOrder.status === 'pending') {
            setOrders(prev => [...prev, newOrder])
            if (soundOn) playDing()
          }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `station=eq.${station}` }, (payload) => {
          const updated = payload.new as Order
          if (updated) {
            setOrders(prev => prev.map(o => o.id === updated.id ? updated : o))
            if (updated.status === 'ready' && soundOn) playReadyChime()
          }
        })
        .subscribe()
    } catch {
      const fallback = setInterval(loadOrders, 5000)
      return () => clearInterval(fallback)
    }

    return () => { if (channel && supabase) supabase.removeChannel(channel) }
  }, [authed, authExpired, loadOrders, soundOn, station])

  const displayOrders = useMemo(() => {
    return orders.filter((o) => {
      if (o.status !== 'ready') return true
      const readyTs = readyTimesRef.current.get(o.id)
      return !readyTs || Date.now() - readyTs < READY_CLEANUP_MS
    })
  }, [orders])

  useEffect(() => {
    const readyIds = new Set(orders.filter((o) => o.status === 'ready').map((o) => o.id))
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
      if (prepTimeMinutes !== undefined) body.preparation_time_minutes = prepTimeMinutes
      const res = await fetch(`/api/supabase/orders?id=${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (res.ok) {
        setCardErrors(prev => { const n = { ...prev }; delete n[id]; return n })
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status, preparation_time_minutes: prepTimeMinutes ?? o.preparation_time_minutes } : o))
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

  const pending = displayOrders.filter(o => o.status === 'pending')
  const confirmed = displayOrders.filter(o => o.status === 'confirmed')
  const preparing = displayOrders.filter(o => o.status === 'preparing')
  const packing = displayOrders.filter(o => o.status === 'packing')
  const readyOrders = displayOrders.filter(o => o.status === 'ready')
  const allColumns = [pending, confirmed, preparing, packing, readyOrders]

  useEffect(() => { setFocusedIdx(0) }, [focusedCol])

  useEffect(() => {
    if (!authed) return
    const handler = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return
      if (e.key === 'ArrowRight') { setFocusedCol(p => Math.min(p + 1, 4)); return }
      if (e.key === 'ArrowLeft') { setFocusedCol(p => Math.max(p - 1, 0)); return }
      if (e.key === 'ArrowDown') { const col = allColumns[focusedCol]; if (col) setFocusedIdx(p => Math.min(p + 1, col.length - 1)); return }
      if (e.key === 'ArrowUp') { setFocusedIdx(p => Math.max(p - 1, 0)); return }
      const col = allColumns[focusedCol]
      if (!col || col.length === 0) return
      const order = col[focusedIdx]
      if (!order || updating === order.id) return
      if (e.key === '1' && order.status === 'confirmed') { updateStatus(order.id, 'preparing'); return }
      if (e.key === '1' && order.status === 'pending' && order.source === 'waiter') { updateStatus(order.id, 'preparing'); return }
      if (e.key === '2' && order.status === 'preparing') { updateStatus(order.id, 'ready'); return }
      if (e.key === '3' && order.status === 'packing') { updateStatus(order.id, 'ready'); return }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [authed, focusedCol, focusedIdx, orders, updating, prepTimeInputs])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordLoading(true)
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, role: loginRole }),
      })
      if (res.ok) { setShowPasswordGate(false); setAuthed(true) }
      else { setPasswordError(`Invalid ${title} password`) }
    } catch { setPasswordError('Connection error') }
    finally { setPasswordLoading(false) }
  }

  const handleLogout = () => { setAuthed(false); setShowPasswordGate(true) }

  if (checkingCookie) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--pos-bg)', color: 'var(--pos-text-muted)', fontFamily: 'var(--pos-font)' }}>
        Checking session...
      </div>
    )
  }

  if (!authed || showPasswordGate) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a14', padding: '2rem' }}>
        <form onSubmit={handleLogin} style={{ background: 'var(--pos-surface)', borderRadius: '24px', padding: '3rem', width: '100%', maxWidth: '400px', border: '1px solid var(--pos-border)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>{icon}</div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--pos-text)', margin: 0, fontFamily: 'var(--pos-font)' }}>{title}</h1>
            <p style={{ color: 'var(--pos-text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>Enter {title} password</p>
          </div>
          <input ref={inputRef} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={`${title} password`}
            style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '2px solid var(--pos-border)', background: 'rgba(255,255,255,0.05)', color: 'var(--pos-text)', fontSize: '1.1rem', textAlign: 'center', outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--pos-font)' }}
            required autoComplete="off" />
          {passwordError && <div style={{ marginTop: '0.75rem', color: '#ef4444', fontSize: '0.9rem', textAlign: 'center' }}>{passwordError}</div>}
          <button type="submit" disabled={passwordLoading}
            style={{ width: '100%', marginTop: '1.5rem', padding: '1rem', border: 'none', borderRadius: '12px', background: passwordLoading ? 'rgba(255,255,255,0.1)' : primaryColor, color: passwordLoading ? 'var(--pos-text-muted)' : '#000', fontSize: '1.1rem', fontWeight: 700, cursor: passwordLoading ? 'not-allowed' : 'pointer', opacity: passwordLoading ? 0.6 : 1, fontFamily: 'var(--pos-font)' }}>
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
    <div style={{ minHeight: '100vh', background: 'var(--pos-bg)', color: 'var(--pos-text)', fontFamily: 'var(--pos-font)', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes flash-border { 0%, 100% { border-color: ${primaryColor}; } 50% { border-color: ${primaryColor}00; } }
        @keyframes fade-out { to { opacity: 0; transform: scale(0.96); } }
        .pos-new-flash { animation: flash-border 1s ease-in-out 3; }
        .pos-fade-ready { animation: fade-out 2s ease-in forwards; }
        @media (max-width: 768px) { .pos-kanban-desktop { display: none !important; } .pos-kanban-mobile { display: flex !important; } }
        @media (min-width: 769px) { .pos-kanban-desktop { display: grid !important; } .pos-kanban-mobile { display: none !important; } }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 1rem', background: 'var(--pos-surface)', borderBottom: '1px solid var(--pos-border)', flexShrink: 0, gap: '0.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 700, color: primaryColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: primaryColor, display: 'inline-block' }} />
            {icon} {title.toUpperCase()}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--pos-text-dim)', fontFamily: 'var(--pos-font-mono)' }}>
            {new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <CountBadge count={pending.length} color={primaryColor} size="sm" />
          {!isMobile && <span style={{ fontSize: '0.65rem', color: 'var(--pos-text-dim)' }}>←→ nav · 1 Prep · 2 Ready</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={() => setSoundOn(!soundOn)} title={soundOn ? 'Sound on' : 'Sound off'}
            style={{ padding: '0.35rem 0.6rem', border: '1px solid var(--pos-border)', borderRadius: 'var(--pos-radius-sm)', background: 'rgba(255,255,255,0.05)', color: soundOn ? '#10b981' : 'var(--pos-text-dim)', fontSize: '0.95rem', cursor: 'pointer' }}>
            {soundOn ? '🔊' : '🔇'}
          </button>
          <button onClick={handleLogout}
            style={{ padding: '0.35rem 0.6rem', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--pos-radius-sm)', background: 'transparent', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'var(--pos-font)' }}>
            Logout
          </button>
        </div>
      </div>

      {/* Error banners */}
      {connectionError && <div style={{ padding: '0.4rem 1rem', background: 'rgba(239,68,68,0.15)', borderBottom: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: '0.8rem', textAlign: 'center', flexShrink: 0 }}>⚠ Connection lost — retrying...</div>}
      {authExpired && <div style={{ padding: '0.4rem 1rem', background: 'rgba(239,68,68,0.15)', borderBottom: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: '0.8rem', textAlign: 'center', flexShrink: 0 }}>⚠ Session expired — please log in again</div>}
      {errorMessage && <div style={{ padding: '0.4rem 1rem', background: 'rgba(239,68,68,0.12)', borderBottom: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5', fontSize: '0.8rem', textAlign: 'center', flexShrink: 0 }}>{errorMessage}</div>}

      {/* Mobile tab bar */}
      {isMobile && (
        <div style={{ display: 'flex', background: 'var(--pos-surface)', borderBottom: '1px solid var(--pos-border)', overflowX: 'auto', flexShrink: 0 }}>
          {columnData.map((col, i) => (
            <button key={col.key} onClick={() => setMobileTab(i)}
              style={{ flex: 1, minWidth: 0, padding: '0.6rem 0.25rem', border: 'none', borderBottom: i === mobileTab ? `3px solid ${col.color}` : '3px solid transparent', background: i === mobileTab ? col.bg : 'transparent', color: i === mobileTab ? col.color : 'var(--pos-text-muted)', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', fontFamily: 'var(--pos-font)', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: '1rem' }}>{col.icon}</span>
              {col.label}
              {col.items.length > 0 && <CountBadge count={col.items.length} color={col.color} size="sm" />}
            </button>
          ))}
        </div>
      )}

      {/* Desktop kanban */}
      <div className="pos-kanban-desktop" style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 0, overflow: 'hidden' }}>
        {columnData.map((col, colIdx) => (
          <Column key={col.key} col={col} colIdx={colIdx} focusedCol={isMobile ? mobileTab : focusedCol} focusedIdx={focusedIdx}
            orders={col.items} updating={updating} updateStatus={updateStatus} prepTimeInputs={prepTimeInputs} setPrepTimeInputs={setPrepTimeInputs}
            cardErrors={cardErrors} readyTimesRef={readyTimesRef} station={station} isMobile={false} />
        ))}
      </div>

      {/* Mobile single-column view */}
      {isMobile && activeColData && (
        <div className="pos-kanban-mobile" style={{ flex: 1, flexDirection: 'column', overflow: 'hidden', background: activeColData.bg }}>
          <Column col={activeColData} colIdx={activeCol} focusedCol={activeCol} focusedIdx={0}
            orders={activeColData.items} updating={updating} updateStatus={updateStatus} prepTimeInputs={prepTimeInputs} setPrepTimeInputs={setPrepTimeInputs}
            cardErrors={cardErrors} readyTimesRef={readyTimesRef} station={station} isMobile={true} />
        </div>
      )}
    </div>
  )
}

/* ── Column sub-component ── */
function Column({ col, colIdx, focusedCol, focusedIdx, orders, updating, updateStatus, prepTimeInputs, setPrepTimeInputs, cardErrors, readyTimesRef, station, isMobile }: {
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
}) {
  const isActive = colIdx === focusedCol

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', background: col.bg,
      borderRight: !isMobile ? '1px solid var(--pos-border)' : 'none',
      outline: isActive && !isMobile ? `2px solid ${col.color}40` : 'none',
      outlineOffset: '-2px', overflow: 'hidden',
    }}>
      {/* Column header */}
      <div style={{ padding: '0.6rem 0.75rem', borderBottom: `2px solid ${col.color}30`, flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: col.color, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--pos-font)' }}>
          {col.icon} {col.label}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ padding: '0.15rem 0.5rem', borderRadius: 'var(--pos-radius-full)', fontSize: '0.75rem', fontWeight: 700, background: `${col.color}20`, color: col.color }}>{col.items.length}</span>
        </div>
      </div>

      {/* Cards */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {col.items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem 0.5rem', color: 'var(--pos-text-dim)', fontSize: '0.8rem' }}>
            {col.key === 'pending' ? 'No new orders' : col.key === 'confirmed' ? 'No accepted' : col.key === 'preparing' ? 'Nothing in prep' : 'No orders'}
          </div>
        )}
        {col.items.map((order, idx) => (
          <OrderCard key={order.id} order={order} col={col} colIdx={colIdx} focusedCol={focusedCol} focusedIdx={idx}
            updating={updating} updateStatus={updateStatus} prepTimeInputs={prepTimeInputs} setPrepTimeInputs={setPrepTimeInputs}
            cardErrors={cardErrors} readyTimesRef={readyTimesRef} station={station} isMobile={isMobile} />
        ))}
      </div>
    </div>
  )
}

/* ── Order Card sub-component ── */
function OrderCard({ order, col, colIdx, focusedCol, focusedIdx, updating, updateStatus, prepTimeInputs, setPrepTimeInputs, cardErrors, readyTimesRef, station, isMobile }: {
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
      background: 'var(--pos-card)', borderRadius: 'var(--pos-radius-lg)', padding: isMobile ? '0.75rem' : '1rem',
      border: isFocused ? `2px solid ${col.color}` : `1px solid ${col.color}30`,
      boxShadow: isFocused ? `0 0 16px ${col.color}25` : 'var(--pos-shadow-sm)',
      transition: 'opacity 0.3s, transform 0.3s', opacity: fading ? 0 : 1, position: 'relative', overflow: 'hidden',
    }}>
      {/* Colored left accent */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: col.color, borderRadius: '3px 0 0 3px' }} />

      {/* Row 1: Ref + Timer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', paddingLeft: '6px' }}>
        <span style={{ fontSize: isMobile ? '1.1rem' : '1.3rem', fontWeight: 800, fontFamily: 'var(--pos-font-mono)', color: 'var(--pos-text)', lineHeight: 1.2 }}>{displayRef}</span>
        <Timer startTime={order.created_at} targetMinutes={station === 'bar' ? 5 : 15} size="sm" />
      </div>

      {/* Row 2: Badges */}
      <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.5rem', flexWrap: 'wrap', paddingLeft: '6px' }}>
        <OrderTypeBadge type={order.order_type as any} size="sm" />
        <StationBadge station={station as any} size="sm" />
        {order.order_type !== 'dine-in' && (
          <span style={{ padding: '2px 6px', borderRadius: 'var(--pos-radius-sm)', fontSize: '0.65rem', fontWeight: 700,
            background: order.payment_status === 'paid' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
            color: order.payment_status === 'paid' ? '#10b981' : '#f59e0b', border: `1px solid ${order.payment_status === 'paid' ? '#10b98130' : '#f59e0b30'}` }}>
            {order.payment_status === 'paid' ? '✅ Paid' : '⏳ Pay'}
          </span>
        )}
      </div>

      {/* Row 3: Meta info */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem', paddingLeft: '6px', fontSize: '0.75rem', color: 'var(--pos-text-secondary)' }}>
        {order.table_number && <span style={{ fontWeight: 700, color: '#ef4444' }}>🪑 T{order.table_number}</span>}
        {order.waiter_name && <span style={{ fontWeight: 600 }}>👤 {order.waiter_name}</span>}
        <span>📦 {itemCount} item{itemCount !== 1 ? 's' : ''}</span>
        <span style={{ fontWeight: 700, color: 'var(--pos-text)' }}>R{order.total.toFixed(0)}</span>
      </div>

      {/* Items */}
      {items.length > 0 && (
        <div style={{ marginBottom: '0.5rem', paddingLeft: '6px' }}>
          {items.map((item: any, idx: number) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0.2rem 0', fontSize: '0.85rem', borderBottom: idx < items.length - 1 ? '1px solid var(--pos-border)' : 'none' }}>
              <span>
                <strong style={{ color: 'var(--pos-text)' }}>{item.quantity}x</strong>{' '}
                <span style={{ color: 'var(--pos-text-secondary)' }}>{item.name}</span>
              </span>
              {item.notes && <span style={{ fontSize: '0.65rem', color: '#fbbf24', fontWeight: 600, marginLeft: '0.5rem', flexShrink: 0 }}>⚠️ {item.notes}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Special instructions */}
      {hasNotes && (
        <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 'var(--pos-radius-md)', padding: '0.5rem', marginBottom: '0.5rem', marginLeft: '6px' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.05em' }}>⚠️ Notes</span>
          {items.filter((i: any) => i.notes).map((item: any, idx: number) => (
            <div key={idx} style={{ fontSize: '0.8rem', color: '#fde68a', marginTop: '0.15rem' }}><strong>{item.name}:</strong> {item.notes}</div>
          ))}
        </div>
      )}

      {metadata.orderNotes && (
        <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 'var(--pos-radius-md)', padding: '0.5rem', marginBottom: '0.5rem', marginLeft: '6px' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>⚠️ Order Note</span>
          <div style={{ fontSize: '0.85rem', color: '#fca5a5', marginTop: '0.2rem' }}>{metadata.orderNotes}</div>
        </div>
      )}

      {/* Card error */}
      {cardErrors[order.id] && (
        <div style={{ padding: '0.3rem 0.5rem', marginBottom: '0.4rem', borderRadius: 'var(--pos-radius-sm)', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: '0.75rem', fontWeight: 600, textAlign: 'center', marginLeft: '6px' }}>
          ⚠ {cardErrors[order.id]}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ paddingLeft: '6px' }}>
        {order.status === 'pending' && order.source === 'waiter' && (
          <button onClick={() => updateStatus(order.id, 'preparing')} disabled={updating === order.id}
            style={{ width: '100%', padding: isMobile ? '0.9rem' : '0.75rem', border: 'none', borderRadius: 'var(--pos-radius-md)', background: 'var(--pos-purple)', color: '#fff', fontSize: isMobile ? '1rem' : '0.9rem', fontWeight: 700, cursor: updating === order.id ? 'not-allowed' : 'pointer', opacity: updating === order.id ? 0.5 : 1, fontFamily: 'var(--pos-font)', touchAction: 'manipulation' }}>
            {updating === order.id ? '...' : '🔥 START PREP'}
          </button>
        )}
        {order.status === 'pending' && order.source !== 'waiter' && (
          <div style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--pos-radius-md)', background: 'rgba(245,158,11,0.08)', color: '#f59e0b', fontSize: '0.8rem', fontWeight: 600, textAlign: 'center', border: '1px solid rgba(245,158,11,0.2)' }}>
            ⏳ Awaiting admin confirmation
          </div>
        )}
        {order.status === 'confirmed' && (
          <>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginBottom: '0.4rem' }}>
              <input type="number" min="1" max="999" placeholder="Prep time (min)"
                value={prepTimeInputs[order.id] || ''}
                onChange={e => { e.stopPropagation(); setPrepTimeInputs(prev => ({ ...prev, [order.id]: e.target.value })) }}
                onKeyDown={e => { if (e.key === 'Enter') { const mins = prepTimeInputs[order.id] ? parseInt(prepTimeInputs[order.id]) : undefined; if (mins) updateStatus(order.id, order.status, mins) } }}
                style={{ flex: 1, padding: '0.35rem 0.4rem', borderRadius: 'var(--pos-radius-sm)', border: '1px solid var(--pos-border)', background: 'rgba(255,255,255,0.08)', color: 'var(--pos-text)', fontSize: '0.75rem', fontWeight: 600, textAlign: 'center', outline: 'none', fontFamily: 'var(--pos-font)' }} />
              {order.preparation_time_minutes && <span style={{ fontSize: '0.65rem', color: 'var(--pos-text-dim)', whiteSpace: 'nowrap' }}>Current: {order.preparation_time_minutes}m</span>}
            </div>
            <button onClick={() => updateStatus(order.id, 'preparing')} disabled={updating === order.id}
              style={{ width: '100%', padding: isMobile ? '0.9rem' : '0.75rem', border: 'none', borderRadius: 'var(--pos-radius-md)', background: 'var(--pos-purple)', color: '#fff', fontSize: isMobile ? '1rem' : '0.9rem', fontWeight: 700, cursor: updating === order.id ? 'not-allowed' : 'pointer', opacity: updating === order.id ? 0.5 : 1, fontFamily: 'var(--pos-font)', touchAction: 'manipulation' }}>
              {updating === order.id ? '...' : '🔥 START PREP'}
            </button>
          </>
        )}
        {(order.status === 'preparing' || order.status === 'packing') && (
          <>
            {order.status === 'preparing' && (
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginBottom: '0.4rem' }}>
                <input type="number" min="1" max="999" placeholder="Remaining (min)"
                  value={prepTimeInputs[order.id] || ''}
                  onChange={e => { e.stopPropagation(); setPrepTimeInputs(prev => ({ ...prev, [order.id]: e.target.value })) }}
                  onKeyDown={e => { if (e.key === 'Enter') { const mins = prepTimeInputs[order.id] ? parseInt(prepTimeInputs[order.id]) : undefined; if (mins) updateStatus(order.id, order.status, mins) } }}
                  style={{ flex: 1, padding: '0.35rem 0.4rem', borderRadius: 'var(--pos-radius-sm)', border: '1px solid var(--pos-border)', background: 'rgba(255,255,255,0.08)', color: 'var(--pos-text)', fontSize: '0.75rem', fontWeight: 600, textAlign: 'center', outline: 'none', fontFamily: 'var(--pos-font)' }} />
                <button onClick={() => { const mins = prepTimeInputs[order.id] ? parseInt(prepTimeInputs[order.id]) : undefined; if (mins) updateStatus(order.id, order.status, mins) }}
                  disabled={updating === order.id}
                  style={{ padding: '0.35rem 0.5rem', borderRadius: 'var(--pos-radius-sm)', border: '1px solid var(--pos-border)', background: 'rgba(255,255,255,0.1)', color: 'var(--pos-text-secondary)', fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'var(--pos-font)' }}>Set</button>
              </div>
            )}
            <button onClick={() => updateStatus(order.id, 'ready')} disabled={updating === order.id}
              style={{ width: '100%', padding: isMobile ? '0.9rem' : '0.75rem', border: 'none', borderRadius: 'var(--pos-radius-md)', background: '#10b981', color: '#000', fontSize: isMobile ? '1rem' : '0.9rem', fontWeight: 800, cursor: updating === order.id ? 'not-allowed' : 'pointer', opacity: updating === order.id ? 0.5 : 1, fontFamily: 'var(--pos-font)', touchAction: 'manipulation' }}>
              {updating === order.id ? '...' : '✅ MARK READY'}
            </button>
          </>
        )}
        {order.status === 'ready' && (
          <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--pos-text-dim)', padding: '0.3rem 0' }}>
            {readyAge > 0 && <span>Auto-clear in {Math.ceil((READY_CLEANUP_MS - readyAge) / 60000)}m</span>}
          </div>
        )}
      </div>
    </div>
  )
}
