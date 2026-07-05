'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createBrowserClient } from '@/lib/supabase'

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
}

const COLUMNS = [
  { key: 'pending', label: 'NEW ORDERS', icon: '🟡', color: '#f59e0b', bg: '#1a1500' },
  { key: 'inPrep', label: 'IN PREP', icon: '🔵', color: '#3b82f6', bg: '#001830' },
  { key: 'packing', label: 'PACKING', icon: '📦', color: '#f97316', bg: '#1a0c00' },
  { key: 'ready', label: 'READY', icon: '🟢', color: '#10b981', bg: '#003020' },
]

const READY_CLEANUP_MS = 5 * 60 * 1000

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
  } catch {
    /* audio not available */
  }
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
  } catch {
    /* audio not available */
  }
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
}

function timeSince(iso: string) {
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'just now'
  if (mins === 1) return '1 min'
  return `${mins} min`
}

function PasswordGate({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, role: 'kitchen' }),
      })
      if (res.ok) {
        onSuccess()
      } else {
        setError('Invalid kitchen password')
      }
    } catch {
      setError('Connection error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a14',
      padding: '2rem',
    }}>
      <form onSubmit={handleSubmit} style={{
        background: '#16162a',
        borderRadius: '24px',
        padding: '3rem',
        width: '100%',
        maxWidth: '400px',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>👨‍🍳</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff', margin: 0 }}>Kitchen Display</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            Enter kitchen password
          </p>
        </div>
        <input
          ref={inputRef}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Kitchen password"
          style={{
            width: '100%',
            padding: '1rem',
            borderRadius: '12px',
            border: '2px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.05)',
            color: '#fff',
            fontSize: '1.1rem',
            textAlign: 'center',
            outline: 'none',
            boxSizing: 'border-box',
          }}
          required
          autoComplete="off"
        />
        {error && (
          <div style={{
            marginTop: '0.75rem',
            color: '#ef4444',
            fontSize: '0.9rem',
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            marginTop: '1.5rem',
            padding: '1rem',
            border: 'none',
            borderRadius: '12px',
            background: loading ? 'rgba(255,255,255,0.1)' : '#f59e0b',
            color: loading ? 'rgba(255,255,255,0.5)' : '#000',
            fontSize: '1.1rem',
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Verifying...' : 'Enter Kitchen'}
        </button>
      </form>
    </div>
  )
}

export default function KitchenDisplay() {
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
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cardErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevIdsRef = useRef<Set<string>>(new Set())
  const readyTimesRef = useRef<Map<string, number>>(new Map())

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
      const data: Order[] = await res.json()

      const currentIds = new Set(data.map((o) => o.id))
      const prevIds = prevIdsRef.current

      if (prevIds.size > 0 && soundOn) {
        for (const id of Array.from(currentIds)) {
          if (!prevIds.has(id)) {
            const order = data.find((o) => o.id === id)
            if (order && order.status === 'pending') {
              playDing()
            }
          }
        }
      }

      for (const order of data) {
        if (order.status === 'ready' && !readyTimesRef.current.has(order.id)) {
          readyTimesRef.current.set(order.id, Date.now())
          if (soundOn) playReadyChime()
        }
        if (order.status !== 'ready') {
          readyTimesRef.current.delete(order.id)
        }
      }

      prevIdsRef.current = currentIds
      setOrders(data)
    } catch {
      setConnectionError(true)
    }
  }, [soundOn])

  // Check for existing auth cookie on mount (so refresh doesn't show password gate)
  useEffect(() => {
    fetch('/api/admin/auth')
      .then(r => r.json())
      .then(data => {
        if (data.authenticated) setAuthed(true)
      })
      .catch(() => {})
      .finally(() => setCheckingCookie(false))
  }, [])

  // Initial load + Supabase realtime subscription
  useEffect(() => {
    if (!authed || authExpired) return

    loadOrders()

    let supabase: ReturnType<typeof createBrowserClient> | null = null
    let channel: ReturnType<ReturnType<typeof createBrowserClient>['channel']> | null = null

    try {
      supabase = createBrowserClient()
      channel = supabase
        .channel('kitchen-orders')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'orders' },
          (payload) => {
            const newOrder = payload.new as Order
            if (newOrder && newOrder.status === 'pending') {
              setOrders(prev => [...prev, newOrder])
              if (soundOn) playDing()
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'orders' },
          (payload) => {
            const updated = payload.new as Order
            if (updated) {
              setOrders(prev => prev.map(o => o.id === updated.id ? updated : o))
              if (updated.status === 'ready' && soundOn) playReadyChime()
            }
          }
        )
        .subscribe()
    } catch {
      // Fallback to polling if client creation fails
      const fallback = setInterval(loadOrders, 5000)
      return () => clearInterval(fallback)
    }

    return () => {
      if (channel && supabase) supabase.removeChannel(channel)
    }
  }, [authed, authExpired, loadOrders, soundOn])

  // Auto-cleanup ready orders
  useEffect(() => {
    if (!authed) return
    const cleanup = setInterval(async () => {
      const now = Date.now()
      for (const [id, ts] of Array.from(readyTimesRef.current.entries())) {
        if (now - ts > READY_CLEANUP_MS) {
          readyTimesRef.current.delete(id)
          try {
            await fetch(`/api/supabase/orders?id=${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'completed' }),
            })
            setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: 'completed' } : o))
          } catch { /* silent */ }
        }
      }
    }, 10000)
    return () => clearInterval(cleanup)
  }, [authed])

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
      }
      console.log('updateStatus sending:', { id, status, prepTimeMinutes })
      const res = await fetch(`/api/supabase/orders?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setCardErrors(prev => { const n = { ...prev }; delete n[id]; return n })
        setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status, preparation_time_minutes: prepTimeMinutes ?? o.preparation_time_minutes } : o))
      } else {
        const errData = await res.json().catch(() => ({}))
        console.error('Failed to update order:', res.status, errData)
        showError(errData?.error || `Failed to update order (${res.status})`)
        showCardError(id, errData?.error || `Error ${res.status}`)
      }
    } catch (e) {
      console.error('Failed to update order status:', e)
      showError('Network error — please try again')
      showCardError(id, 'Network error')
    } finally {
      setUpdating(null)
    }
  }

  // Build flat list of actionable orders for keyboard nav
  const pending = orders.filter((o) => o.status === 'pending')
  const inPrep = orders.filter((o) => o.status === 'confirmed' || o.status === 'preparing')
  const packing = orders.filter((o) => o.status === 'packing')
  const readyOrders = orders.filter((o) => o.status === 'ready')
  const allColumns = [pending, inPrep, packing, readyOrders]

  // Reset focus index when column changes
  useEffect(() => {
    setFocusedIdx(0)
  }, [focusedCol])

  // Keyboard shortcuts (bump-bar mode)
  useEffect(() => {
    if (!authed) return
    const handler = (e: KeyboardEvent) => {
      // Skip shortcuts when focus is on an input (e.g. prep time field)
      if (document.activeElement?.tagName === 'INPUT') return
      // Arrow keys to navigate
      if (e.key === 'ArrowRight') {
        setFocusedCol((p) => Math.min(p + 1, 3))
        return
      }
      if (e.key === 'ArrowLeft') {
        setFocusedCol((p) => Math.max(p - 1, 0))
        return
      }
      if (e.key === 'ArrowDown') {
        const col = allColumns[focusedCol]
        if (col) setFocusedIdx((p) => Math.min(p + 1, col.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        setFocusedIdx((p) => Math.max(p - 1, 0))
        return
      }

      const col = allColumns[focusedCol]
      if (!col || col.length === 0) return
      const order = col[focusedIdx]
      if (!order || updating === order.id) return

      // 1 = Start Prep (confirmed → preparing)
      if (e.key === '1' && order.status === 'confirmed') {
        updateStatus(order.id, 'preparing')
        return
      }
      // 2 = Start Packing (preparing → packing)
      if (e.key === '2' && order.status === 'preparing') {
        updateStatus(order.id, 'packing')
        return
      }
      // 3 = Mark Ready (packing → ready)
      if (e.key === '3' && order.status === 'packing') {
        updateStatus(order.id, 'ready')
        return
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [authed, focusedCol, focusedIdx, orders, updating, prepTimeInputs])

  const handleLogout = () => {
    setAuthed(false)
  }

  if (checkingCookie) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f0f1a',
        color: 'rgba(255,255,255,0.5)',
        fontSize: '1rem',
      }}>
        Checking session...
      </div>
    )
  }

  if (!authed) {
    return <PasswordGate onSuccess={() => setAuthed(true)} />
  }



  const columnData = [
    { ...COLUMNS[0], items: pending, key: 'pending' },
    { ...COLUMNS[1], items: inPrep, key: 'inPrep' },
    { ...COLUMNS[2], items: packing, key: 'packing' },
    { ...COLUMNS[3], items: readyOrders, key: 'ready' },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f0f1a',
      color: '#fff',
      fontFamily: "'Inter', -apple-system, sans-serif",
      display: 'flex',
      flexDirection: 'column',
    }}>
      <style>{`
        @keyframes flash-border {
          0%, 100% { border-color: #f59e0b; }
          50% { border-color: #f59e0b00; }
        }
        @keyframes fade-out {
          to { opacity: 0; transform: scale(0.96); }
        }
        .new-flash {
          animation: flash-border 1s ease-in-out 3;
        }
        .fade-ready {
          animation: fade-out 2s ease-in forwards;
        }
      `}</style>

      {/* Top Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.75rem 1.5rem',
        background: '#16162a',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: '#10b981',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#10b981', display: 'inline-block',
            }} />
            LIVE ORDERS
          </span>
          <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.3)' }}>
            {new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <span style={{
            padding: '0.2rem 0.6rem',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 600,
            background: pending.length > 0 ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)',
            color: pending.length > 0 ? '#f59e0b' : '#10b981',
          }}>
            {pending.length} new
          </span>
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', marginLeft: '0.5rem' }}>
            [←→] nav · [1] Prep · [2] Pack · [3] Ready
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => setSoundOn(!soundOn)}
            title={soundOn ? 'Sound on' : 'Sound off'}
            style={{
              padding: '0.4rem 0.75rem',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.05)',
              color: soundOn ? '#10b981' : 'rgba(255,255,255,0.4)',
              fontSize: '1rem',
              cursor: 'pointer',
            }}
          >
            {soundOn ? '🔊' : '🔇'}
          </button>
          <button
            onClick={handleLogout}
            style={{
              padding: '0.4rem 0.75rem',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '8px',
              background: 'transparent',
              color: '#ef4444',
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {connectionError && (
        <div style={{ padding: '0.5rem 1.5rem', background: 'rgba(239,68,68,0.15)', borderBottom: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: '0.85rem', textAlign: 'center', flexShrink: 0 }}>
          ⚠ Connection lost — showing cached orders. Retrying...
        </div>
      )}
      {authExpired && (
        <div style={{ padding: '0.5rem 1.5rem', background: 'rgba(239,68,68,0.15)', borderBottom: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: '0.85rem', textAlign: 'center', flexShrink: 0 }}>
          ⚠ Session expired — please log out and log in again
        </div>
      )}

      {errorMessage && (
        <div style={{ padding: '0.5rem 1.5rem', background: 'rgba(239,68,68,0.12)', borderBottom: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5', fontSize: '0.85rem', textAlign: 'center', flexShrink: 0 }}>
          {errorMessage}
        </div>
      )}

      {/* 4-Column Layout */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr 1fr',
        gap: '0',
        overflow: 'hidden',
      }}>
        {columnData.map((col, colIdx) => (
          <div
            key={col.key}
            style={{
              display: 'flex',
              flexDirection: 'column',
              background: col.bg,
              borderRight: '1px solid rgba(255,255,255,0.04)',
              outline: colIdx === focusedCol ? `2px solid ${col.color}40` : 'none',
              outlineOffset: '-2px',
              overflow: 'hidden',
            }}
          >
            {/* Column Header */}
            <div style={{
              padding: '1rem 1.25rem',
              borderBottom: `2px solid ${col.color}40`,
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{
                  margin: 0,
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: col.color,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}>
                  {col.icon} {col.label}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    onClick={() => {
                      const el = document.getElementById(`col-scroll-${col.key}`)
                      if (el) el.scrollBy({ top: -200, behavior: 'smooth' })
                    }}
                    title="Scroll up"
                    style={{
                      padding: '0.25rem 0.5rem', borderRadius: '6px', border: `1px solid ${col.color}40`,
                      background: 'transparent', color: col.color, fontSize: '0.85rem', cursor: 'pointer', lineHeight: 1,
                    }}
                  >▲</button>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '999px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    background: `${col.color}20`,
                    color: col.color,
                  }}>
                    {col.items.length}
                  </span>
                  <button
                    onClick={() => {
                      const el = document.getElementById(`col-scroll-${col.key}`)
                      if (el) el.scrollBy({ top: 200, behavior: 'smooth' })
                    }}
                    title="Scroll down"
                    style={{
                      padding: '0.25rem 0.5rem', borderRadius: '6px', border: `1px solid ${col.color}40`,
                      background: 'transparent', color: col.color, fontSize: '0.85rem', cursor: 'pointer', lineHeight: 1,
                    }}
                  >▼</button>
                </div>
              </div>
            </div>

            {/* Cards */}
            <div
              id={`col-scroll-${col.key}`}
              style={{
              flex: 1,
              overflowY: 'auto',
              padding: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}>
              {col.items.length === 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: '3rem 1rem',
                  color: 'rgba(255,255,255,0.15)',
                  fontSize: '0.9rem',
                }}>
                  {col.key === 'pending' ? 'No new orders' : col.key === 'inPrep' ? 'Nothing in progress' : 'No completed orders'}
                </div>
              )}
              {col.items.map((order, idx) => {
                const isFocused = colIdx === focusedCol && idx === focusedIdx
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

                return (
                  <div
                    key={order.id}
                    className={isNew ? 'new-flash' : fading ? 'fade-ready' : ''}
                    style={{
                      background: '#1c1c30',
                      borderRadius: '14px',
                      padding: '1.25rem',
                      border: isFocused ? `3px solid ${col.color}` : `2px solid ${col.color}30`,
                      boxShadow: isFocused ? `0 0 20px ${col.color}30` : 'none',
                      transition: 'opacity 0.3s, transform 0.3s',
                      opacity: fading ? 0 : 1,
                    }}
                  >
                    {/* Order Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'monospace', color: '#fff' }}>
                        {displayRef}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
                        {formatTime(order.created_at)}
                      </span>
                    </div>

                    {/* Order Meta */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        background: order.order_type === 'delivery' ? 'rgba(139,92,246,0.2)' : 'rgba(59,130,246,0.2)',
                        color: order.order_type === 'delivery' ? '#a78bfa' : '#60a5fa',
                      }}>
                        {order.order_type === 'pickup' ? '📦 Pickup' : order.order_type === 'delivery' ? '🚚 Delivery' : '🍽️ Dine-in'}
                      </span>
                      {/* Payment status badge */}
                      {order.order_type !== 'dine-in' && (
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: order.payment_status === 'paid' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)',
                          color: order.payment_status === 'paid' ? '#10b981' : '#f59e0b',
                        }}>
                          {order.payment_status === 'paid' ? '🟢 Paid' : '🟠 Awaiting Payment'}
                        </span>
                      )}
                      <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                        <span style={{ color: 'rgba(255,255,255,0.3)' }}>⏱</span> {timeSince(order.created_at)}
                      </span>
                      {order.customer_name && (
                        <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                          👤 {order.customer_name}
                        </span>
                      )}
                      {order.waiter_name && (
                        <span style={{ fontSize: '0.85rem', color: '#dc2626', fontWeight: 600 }}>
                          🍽️ {order.waiter_name}
                        </span>
                      )}
                      {order.table_number && (
                        <span style={{ fontSize: '0.85rem', color: '#dc2626', fontWeight: 700 }}>
                          🪑 Table {order.table_number}
                        </span>
                      )}
                    </div>

                    {/* Items */}
                    {items.length > 0 && (
                      <div style={{ marginBottom: '0.75rem' }}>
                        {items.map((item: any, idx: number) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'baseline',
                              padding: '0.35rem 0',
                              fontSize: '1.05rem',
                              borderBottom: idx < items.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                            }}
                          >
                            <span>
                              <strong style={{ color: '#fff', fontSize: '1.1rem' }}>{item.quantity}x</strong>{' '}
                              <span style={{ color: 'rgba(255,255,255,0.85)' }}>{item.name}</span>
                              {item.description && (
                                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', marginTop: '0.1rem', lineHeight: 1.3 }}>
                                  {item.description}
                                </div>
                              )}
                            </span>
                            {item.notes && (
                              <span style={{
                                fontSize: '0.75rem',
                                color: '#fbbf24',
                                fontWeight: 600,
                                marginLeft: '0.5rem',
                                flexShrink: 0,
                              }}>
                                ⚠️ {item.notes}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Special Notes Section */}
                    {hasNotes && (
                      <div style={{
                        background: 'rgba(251,191,36,0.08)',
                        border: '1px solid rgba(251,191,36,0.2)',
                        borderRadius: '10px',
                        padding: '0.6rem 0.75rem',
                        marginBottom: '0.75rem',
                      }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          ⚠️ Special Instructions
                        </span>
                        {items.filter((i: any) => i.notes).map((item: any, idx: number) => (
                          <div key={idx} style={{ fontSize: '0.9rem', color: '#fde68a', marginTop: '0.25rem' }}>
                            <strong>{item.name}:</strong> {item.notes}
                          </div>
                        ))}
                      </div>
                    )}

                    {metadata.orderNotes && (
                      <div style={{
                        background: 'rgba(239,68,68,0.12)',
                        border: '2px solid rgba(239,68,68,0.5)',
                        borderRadius: '10px',
                        padding: '0.75rem',
                        marginBottom: '0.75rem',
                      }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          ⚠️ Special Instructions
                        </span>
                        <div style={{ fontSize: '1rem', color: '#fca5a5', marginTop: '0.35rem', lineHeight: 1.4 }}>
                          {metadata.orderNotes}
                        </div>
                      </div>
                    )}

                    {/* Card-level error */}
                    {cardErrors[order.id] && (
                      <div style={{
                        padding: '0.4rem 0.6rem', marginBottom: '0.5rem',
                        borderRadius: '8px', background: 'rgba(239,68,68,0.15)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        color: '#fca5a5', fontSize: '0.8rem', fontWeight: 600, textAlign: 'center',
                      }}>
                        ⚠ {cardErrors[order.id]}
                      </div>
                    )}

                    {/* Actions */}
                    {order.status === 'pending' && (
                      <div style={{
                        width: '100%', padding: '0.875rem',
                        borderRadius: '10px', background: 'rgba(245,158,11,0.08)',
                        color: '#f59e0b', fontSize: '0.95rem', fontWeight: 600,
                        textAlign: 'center', border: '1px solid rgba(245,158,11,0.2)',
                      }}>
                        ⏳ Awaiting admin confirmation
                      </div>
                    )}
                    {(order.status === 'confirmed' || order.status === 'preparing') && (
                      <div style={{ marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <input
                            type="number"
                            min="1"
                            max="999"
                            placeholder={order.status === 'confirmed' ? 'Prep time (min)' : 'Remaining (min)'}
                            value={prepTimeInputs[order.id] || ''}
                            onChange={(e) => {
                              e.stopPropagation()
                              setPrepTimeInputs(prev => ({ ...prev, [order.id]: e.target.value }))
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const mins = prepTimeInputs[order.id] ? parseInt(prepTimeInputs[order.id]) : undefined
                                if (mins) updateStatus(order.id, order.status, mins)
                              }
                            }}
                            style={{
                              flex: 1, padding: '0.4rem 0.5rem', borderRadius: '8px',
                              border: '1px solid rgba(255,255,255,0.1)',
                              background: 'rgba(255,255,255,0.08)',
                              color: '#fff', fontSize: '0.8rem', fontWeight: 600,
                              textAlign: 'center', outline: 'none',
                            }}
                          />
                          {order.preparation_time_minutes && (
                            <span style={{
                              fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap',
                            }}>
                              Current: {order.preparation_time_minutes}m
                            </span>
                          )}
                          <button
                            onClick={() => {
                              const mins = prepTimeInputs[order.id] ? parseInt(prepTimeInputs[order.id]) : undefined
                              if (mins) updateStatus(order.id, order.status, mins)
                            }}
                            disabled={updating === order.id}
                            style={{
                              padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)',
                              background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)',
                              fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                            }}
                          >
                            Set
                          </button>
                        </div>
                      </div>
                    )}
                    {order.status === 'confirmed' && (
                      <button
                        onClick={() => updateStatus(order.id, 'preparing')}
                        disabled={updating === order.id}
                        style={{
                          width: '100%',
                          padding: '0.875rem',
                          border: '2px solid #3b82f6',
                          borderRadius: '10px',
                          background: 'rgba(59,130,246,0.15)',
                          color: '#60a5fa',
                          fontSize: '1.1rem',
                          fontWeight: 700,
                          cursor: updating === order.id ? 'not-allowed' : 'pointer',
                          opacity: updating === order.id ? 0.5 : 1,
                          touchAction: 'manipulation',
                        }}
                      >
                        {updating === order.id ? '...' : 'Start Prep'}
                      </button>
                    )}
                    {order.status === 'preparing' && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => updateStatus(order.id, 'packing')}
                          disabled={updating === order.id}
                          style={{
                            flex: 1,
                            padding: '0.875rem',
                            border: 'none',
                            borderRadius: '10px',
                            background: '#f97316',
                            color: '#000',
                            fontSize: '1.1rem',
                            fontWeight: 800,
                            cursor: updating === order.id ? 'not-allowed' : 'pointer',
                            opacity: updating === order.id ? 0.5 : 1,
                            touchAction: 'manipulation',
                          }}
                        >
                          {updating === order.id ? '...' : 'Start Packing'}
                        </button>
                      </div>
                    )}
                    {order.status === 'packing' && (
                      <button
                        onClick={() => updateStatus(order.id, 'ready')}
                        disabled={updating === order.id}
                        style={{
                          width: '100%',
                          padding: '0.875rem',
                          border: 'none',
                          borderRadius: '10px',
                          background: '#10b981',
                          color: '#000',
                          fontSize: '1.1rem',
                          fontWeight: 800,
                          cursor: updating === order.id ? 'not-allowed' : 'pointer',
                          opacity: updating === order.id ? 0.5 : 1,
                          touchAction: 'manipulation',
                        }}
                      >
                        {updating === order.id ? '...' : 'Mark Ready'}
                      </button>
                    )}
                    {order.status === 'ready' && (
                      <div style={{
                        textAlign: 'center',
                        fontSize: '0.85rem',
                        color: 'rgba(255,255,255,0.3)',
                      }}>
                        {readyAge > 0 && (
                          <span>Auto-clearing in {Math.ceil((READY_CLEANUP_MS - readyAge) / 60000)}m</span>
                        )}
                      </div>
                    )}

                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
