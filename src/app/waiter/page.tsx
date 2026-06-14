'use client'

import { useState, useEffect, useRef } from 'react'

interface MenuItem {
  id: string
  categoryId: string
  name: string
  description: string
  price: string
  image?: string
  sizes?: { name: string; price: string }[]
  addOns?: { name: string; price: string }[]
  isAvailable: boolean
}

interface MenuCategory {
  id: string
  name: string
  description: string
  order: number
  isActive: boolean
}

interface CartItem {
  id: string
  name: string
  description: string
  price: number
  quantity: number
  notes: string
}

const STEPS = [
  { key: 'tables', label: 'Select Table', short: 'Table' },
  { key: 'menu', label: 'Add Items', short: 'Items' },
  { key: 'review', label: 'Review Order', short: 'Review' },
  { key: 'done', label: 'Send', short: 'Send' },
]

function PasswordGate({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => { ref.current?.focus() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, role: 'kitchen' }),
      })
      if (res.ok) {
        onSuccess()
      } else {
        setError('Invalid password')
      }
    } catch {
      setError('Connection error')
    }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a14', padding: '1rem' }}>
      <form onSubmit={handleSubmit} style={{ background: '#16162a', borderRadius: '20px', padding: '2rem', width: '100%', maxWidth: '360px' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2.5rem' }}>📋</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', margin: '0.5rem 0 0' }}>Waiter Login</h1>
        </div>
        <input ref={ref} type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="Kitchen password"
          style={{ width: '100%', padding: '0.875rem', borderRadius: '10px', border: '2px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '1rem', textAlign: 'center', boxSizing: 'border-box' }}
          required
        />
        {error && <div style={{ marginTop: '0.5rem', color: '#ef4444', fontSize: '0.85rem', textAlign: 'center' }}>{error}</div>}
        <button type="submit" style={{ width: '100%', marginTop: '1rem', padding: '0.875rem', border: 'none', borderRadius: '10px', background: '#f59e0b', color: '#000', fontSize: '1rem', fontWeight: 700, cursor: 'pointer' }}>
          Enter
        </button>
      </form>
    </div>
  )
}

const CART_STORAGE_KEY = 'boma_waiter_cart'

function loadSavedCart() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as { tableNumber: number; cart: CartItem[]; itemNotes: Record<string, string>; orderNotes: string } | null
  } catch {
    return null
  }
}

function StepIndicator({ steps, current }: { steps: typeof STEPS; current: string }) {
  const currentIdx = steps.findIndex((s) => s.key === current)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 1rem', background: '#16162a', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
      {steps.map((step, i) => {
        const isActive = i === currentIdx
        const isDone = i < currentIdx
        return (
          <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flex: 1 }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
              padding: '0.3rem 0.4rem', borderRadius: '6px', flex: 1,
              background: isActive ? 'rgba(16,185,129,0.15)' : 'transparent',
            }}>
              <span style={{
                width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.6rem', fontWeight: 700, flexShrink: 0,
                background: isActive ? '#10b981' : isDone ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)',
                color: isActive ? '#000' : isDone ? '#10b981' : 'rgba(255,255,255,0.3)',
              }}>
                {isDone ? '✓' : i + 1}
              </span>
              <span style={{
                fontSize: '0.65rem', fontWeight: isActive ? 700 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                color: isActive ? '#10b981' : isDone ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.3)',
              }}>
                {step.short}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span style={{ color: i < currentIdx ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)', fontSize: '0.6rem' }}>▶</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function WaiterPage() {
  const saved = loadSavedCart()
  const [authed, setAuthed] = useState(false)
  const [step, setStep] = useState<'tables' | 'menu' | 'review'>(saved?.cart.length ? 'review' : 'tables')
  const [tableNumber, setTableNumber] = useState<number | null>(saved?.tableNumber ?? null)
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>(saved?.cart ?? [])
  const [itemNotes, setItemNotes] = useState<Record<string, string>>(saved?.itemNotes ?? {})
  const [orderNotes, setOrderNotes] = useState(saved?.orderNotes ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [orderRef, setOrderRef] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!authed) return
    fetch('/api/cms/menu')
      .then((r) => r.json())
      .then((data) => {
        setCategories(data.categories?.filter((c: MenuCategory) => c.isActive) || [])
        setMenuItems(data.menuItems?.filter((m: MenuItem) => m.isAvailable) || [])
        if (data.categories?.length > 0) setActiveCategory(data.categories[0].id)
      })
      .catch(() => {})
  }, [authed])

  useEffect(() => {
    if (!authed) return
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ tableNumber, cart, itemNotes, orderNotes }))
    } catch { /* quota exceeded */ }
  }, [authed, tableNumber, cart, itemNotes, orderNotes])

  const filteredByCategory = menuItems.filter((m) => m.categoryId === activeCategory)
  const searchedItems = searchQuery
    ? filteredByCategory.filter((m) => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : filteredByCategory

  const addItem = (item: MenuItem, price?: number) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id)
      if (existing) {
        return prev.map((c) => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c)
      }
      return [...prev, { id: item.id, name: item.name, description: item.description, price: price ?? (parseFloat(item.price) || 0), quantity: 1, notes: '' }]
    })
  }

  const updateQty = (id: string, delta: number) => {
    setCart((prev) => prev.map((c) => c.id === id ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c).filter((c) => c.quantity > 0))
  }

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0)
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0)

  const submitOrder = async () => {
    if (cart.length === 0 || !tableNumber) return
    setSubmitError(null)
    setSubmitting(true)
    try {
      const idempotencyKey = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-t${tableNumber}-${Math.random().toString(36).slice(2, 10)}`
      const items = cart.map((c) => ({
        menu_item_id: c.id,
        quantity: c.quantity,
      }))
      const res = await fetch('/api/supabase/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: `Table ${tableNumber}`,
          phone: 'waiter-order',
          order_type: 'dine-in',
          requested_time: 'ASAP',
          items,
          table_number: String(tableNumber),
          idempotency_key: idempotencyKey,
        }),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        setSubmitError(errorData?.error || `Order failed (${res.status})`)
        return
      }
      const data = await res.json()
      setOrderRef(data.order?.order_ref || `Table ${tableNumber}`)
      setDone(true)
      setCart([])
      setItemNotes({})
      setOrderNotes('')
      localStorage.removeItem(CART_STORAGE_KEY)
    } catch {
      setSubmitError('Network error — order not sent. Check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!authed) return <PasswordGate onSuccess={() => setAuthed(true)} />

  if (done) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f0f1a', color: '#fff', padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Order Sent!</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>Order for Table {tableNumber}</p>
        <p style={{ color: '#f59e0b', fontFamily: 'monospace', fontSize: '1.2rem', marginBottom: '2rem' }}>{orderRef}</p>
        <button onClick={() => { setDone(false); setTableNumber(null); setStep('tables'); setSearchQuery('') }}
          style={{ padding: '1rem 2rem', border: 'none', borderRadius: '12px', background: '#10b981', color: '#000', fontSize: '1rem', fontWeight: 700, cursor: 'pointer' }}
        >
          New Order
        </button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#0f0f1a', color: '#fff', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif", maxWidth: '500px', margin: 'auto' }}>
      {/* Step Indicator */}
      <StepIndicator steps={STEPS} current={step} />

      {/* Table Card */}
      {tableNumber && step !== 'tables' && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0.6rem 1rem', background: 'rgba(16,185,129,0.1)', borderBottom: '1px solid rgba(16,185,129,0.15)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.1rem' }}>🍽️</span>
            <div>
              <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Currently Serving</span>
              <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#10b981' }}>Table {tableNumber}</span>
            </div>
          </div>
          {step === 'menu' && (
            <button onClick={() => setStep('review')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.75rem', borderRadius: '8px', border: 'none', background: '#10b981', color: '#000', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
              🛒 {itemCount}
            </button>
          )}
        </div>
      )}

      {/* Step: Table Selection */}
      {step === 'tables' && (
        <div style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 0.25rem' }}>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 600, fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem' }}>
                STEP 1
              </span>
              Select Customer Table
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.35)', margin: 0 }}>Choose the table you are serving.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
            {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
              <button key={n} onClick={() => { setTableNumber(n); setStep('menu') }}
                style={{
                  padding: '0.9rem 0.5rem', borderRadius: '12px', border: tableNumber === n ? '2px solid #10b981' : '2px solid rgba(255,255,255,0.08)',
                  background: tableNumber === n ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)', color: '#fff', fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer',
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step: Menu */}
      {step === 'menu' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Search */}
          <div style={{ padding: '0.5rem', flexShrink: 0 }}>
            <input
              type="text" placeholder="🔍 Search menu items..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '0.65rem 0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none',
              }}
            />
          </div>

          {/* Category chips */}
          <div style={{ display: 'flex', gap: '0.35rem', padding: '0 0.5rem 0.5rem', overflowX: 'auto', flexShrink: 0 }}>
            {categories.map((cat) => (
              <button key={cat.id} onClick={() => { setActiveCategory(cat.id); setSearchQuery('') }}
                style={{
                  padding: '0.4rem 0.8rem', borderRadius: '20px', border: 'none', whiteSpace: 'nowrap', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                  background: activeCategory === cat.id ? '#10b981' : 'rgba(255,255,255,0.07)',
                  color: activeCategory === cat.id ? '#000' : 'rgba(255,255,255,0.7)',
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Items grid */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 0.5rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {searchedItems.map((item) => (
              <button key={item.id} onClick={() => addItem(item)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.7rem 0.85rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(255,255,255,0.03)', color: '#fff', cursor: 'pointer', textAlign: 'left', width: '100%',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.description?.slice(0, 50)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, marginLeft: '0.5rem' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#10b981' }}>
                    R{parseFloat(item.price).toFixed(2)}
                  </span>
                </div>
              </button>
            ))}
            {searchedItems.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.2)', fontSize: '0.9rem' }}>No items found</div>
            )}
          </div>
        </div>
      )}

      {/* Step: Review */}
      {step === 'review' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 0.25rem' }}>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 600, fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem' }}>
                STEP 3
              </span>
              Review Order
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.35)', margin: 0 }}>Table {tableNumber} — {itemCount} item{itemCount !== 1 ? 's' : ''}</p>
          </div>
          {cart.map((item) => (
            <div key={item.id} style={{ padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.name}</span>
                <span style={{ color: '#10b981', fontWeight: 600, fontSize: '0.95rem' }}>R{(item.price * item.quantity).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button onClick={() => updateQty(item.id, -1)} style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                <span style={{ fontWeight: 700, fontSize: '1.05rem', minWidth: '1.5rem', textAlign: 'center' }}>{item.quantity}</span>
                <button onClick={() => updateQty(item.id, 1)} style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                <input
                  placeholder="Notes"
                  value={itemNotes[item.id] || ''}
                  onChange={(e) => setItemNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                  style={{ flex: 1, padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: '0.8rem', outline: 'none' }}
                />
              </div>
            </div>
          ))}
          {cart.length === 0 && <p style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '2rem' }}>Cart empty</p>}
          {cart.length > 0 && (
            <>
              <div style={{ marginTop: '1rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '0.3rem', fontWeight: 500 }}>Order notes (optional)</label>
                <input value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder="e.g. Extra napkins"
                  style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 700, marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                <span>Total</span>
                <span style={{ color: '#10b981' }}>R{total.toFixed(2)}</span>
              </div>
              {submitError && (
                <div style={{ marginTop: '0.75rem', padding: '0.75rem', borderRadius: '10px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: '0.9rem', textAlign: 'center' }}>
                  {submitError}
                </div>
              )}
              <button onClick={submitOrder} disabled={submitting}
                style={{ width: '100%', marginTop: '0.75rem', padding: '1rem', border: 'none', borderRadius: '12px', background: submitting ? 'rgba(255,255,255,0.1)' : submitError ? '#f59e0b' : '#10b981', color: submitting ? 'rgba(255,255,255,0.5)' : '#000', fontSize: '1.1rem', fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer' }}
              >
                {submitting ? 'Sending...' : submitError ? 'Retry Order' : `Send to Kitchen — R${total.toFixed(2)}`}
              </button>
              <button onClick={() => setStep('menu')} style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', cursor: 'pointer' }}>
                ← Add more items
              </button>
            </>
          )}
        </div>
      )}

      {/* Sticky Footer (menu step only) */}
      {step === 'menu' && tableNumber && cart.length > 0 && (
        <div style={{
          padding: '0.75rem 1rem', borderTop: '1px solid rgba(255,255,255,0.06)', background: '#16162a', flexShrink: 0,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
            <div style={{ fontWeight: 600, color: '#10b981', fontSize: '0.9rem' }}>Table {tableNumber}</div>
            <div>{itemCount} item{itemCount !== 1 ? 's' : ''} • R{total.toFixed(2)}</div>
          </div>
          <button onClick={() => setStep('review')} style={{ padding: '0.75rem 1.25rem', border: 'none', borderRadius: '10px', background: '#10b981', color: '#000', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer' }}>
            Review Order
          </button>
        </div>
      )}

      {/* Back to tables from menu when no items */}
      {step === 'menu' && !tableNumber && (
        <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid rgba(255,255,255,0.06)', background: '#16162a', flexShrink: 0 }}>
          <button onClick={() => setStep('tables')} style={{ width: '100%', padding: '0.75rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', cursor: 'pointer' }}>
            ← Select a table first
          </button>
        </div>
      )}
    </div>
  )
}
