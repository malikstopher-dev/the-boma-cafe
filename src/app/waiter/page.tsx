'use client'

import { useState, useEffect, useRef } from 'react'
import StatusBadge from '@/components/pos/StatusBadge'
import StationBadge from '@/components/pos/StationBadge'
import PosButton from '@/components/pos/PosButton'
import PosCard from '@/components/pos/PosCard'
import Timer from '@/components/pos/Timer'

interface MenuItem {
  id: string; categoryId: string; name: string; description: string; price: string; image?: string
  sizes?: { name: string; price: string }[]; addOns?: { name: string; price: string }[]; isAvailable: boolean
}
interface MenuCategory { id: string; name: string; description: string; order: number; isActive: boolean }
interface BarItem {
  id: string; categoryId: string; name: string; singlePrice: number | null; bottle: number | null
  glassPrice: number | null; shotPrice: number | null; price: number | null; isAvailable: boolean
}
interface BarCategory { id: string; name: string; isActive: boolean; order: number }
interface CartItem { id: string; name: string; description: string; price: number; quantity: number; notes: string; station?: 'kitchen' | 'bar' }

const CART_STORAGE_KEY = 'boma_waiter_cart'
const WAITER_STORAGE_KEY = 'boma_waiter_name'

function loadSavedCart() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, role: 'waiter' }),
      })
      if (res.ok) onSuccess()
      else setError('Invalid password')
    } catch { setError('Connection error') }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--pos-bg)', padding: '1rem' }}>
      <form onSubmit={handleSubmit} style={{ background: 'var(--pos-surface)', borderRadius: '24px', padding: '2.5rem', width: '100%', maxWidth: '380px', border: '1px solid var(--pos-border)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem' }}>📋</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--pos-text)', margin: '0.5rem 0 0', fontFamily: 'var(--pos-font)' }}>Waiter Login</h1>
        </div>
        <input ref={ref} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Waiter password"
          style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '2px solid var(--pos-border)', background: 'rgba(255,255,255,0.05)', color: 'var(--pos-text)', fontSize: '1rem', textAlign: 'center', boxSizing: 'border-box', fontFamily: 'var(--pos-font)' }}
          required />
        {error && <div style={{ marginTop: '0.5rem', color: '#ef4444', fontSize: '0.85rem', textAlign: 'center' }}>{error}</div>}
        <PosButton type="submit" variant="warning" fullWidth size="lg" style={{ marginTop: '1rem' }}>Enter</PosButton>
      </form>
    </div>
  )
}

export default function WaiterPage() {
  const saved = loadSavedCart()
  const [authed, setAuthed] = useState(false)
  const [tab, setTab] = useState<'food' | 'drinks' | 'tables' | 'history' | 'cart'>(saved?.cart.length ? 'cart' : 'tables')
  const [tableNumber, setTableNumber] = useState<number | null>(saved?.tableNumber ?? null)
  const [waiters, setWaiters] = useState<{ id: string; name: string }[]>([])
  const [waiterName, setWaiterName] = useState('')
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>(saved?.cart ?? [])
  const [itemNotes, setItemNotes] = useState<Record<string, string>>(saved?.itemNotes ?? {})
  const [orderNotes, setOrderNotes] = useState(saved?.orderNotes ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [orderRefs, setOrderRefs] = useState<{ ref: string; station?: string; id?: string }[]>([])
  const [cancelledRefs, setCancelledRefs] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [lastOrder, setLastOrder] = useState<{ tableNumber: number; cart: CartItem[]; itemNotes: Record<string, string>; orderNotes: string } | null>(null)
  const [barCategories, setBarCategories] = useState<BarCategory[]>([])
  const [barItems, setBarItems] = useState<BarItem[]>([])
  const [menuMode, setMenuMode] = useState<'food' | 'bar'>('food')
  const [showCartSheet, setShowCartSheet] = useState(false)

  useEffect(() => {
    if (!authed) return
    fetch('/api/waiters/active').then(r => r.json()).then(data => {
      if (!Array.isArray(data)) return
      setWaiters(data)
      const saved = localStorage.getItem(WAITER_STORAGE_KEY)
      if (saved && data.some((w: any) => w.name === saved)) setWaiterName(saved)
    }).catch(() => {})
  }, [authed])

  useEffect(() => { if (waiterName) localStorage.setItem(WAITER_STORAGE_KEY, waiterName) }, [waiterName])

  useEffect(() => {
    if (!authed) return
    Promise.all([
      fetch('/api/menu/public', { cache: 'no-cache' }).then(r => r.json()).catch(() => ({ categories: [], menuItems: [] })),
      fetch('/api/bar/public', { cache: 'no-cache' }).then(r => r.json()).catch(() => ({ categories: [], items: [] })),
    ]).then(([menuData, barData]) => {
      setCategories(menuData.categories || [])
      setMenuItems(menuData.menuItems || [])
      if (menuData.categories?.length > 0) setActiveCategory(menuData.categories[0].id)
      setBarCategories(barData.categories || [])
      setBarItems(barData.items || [])
    })
  }, [authed])

  useEffect(() => {
    if (!authed) return
    try { localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ tableNumber, cart, itemNotes, orderNotes })) } catch {}
  }, [authed, tableNumber, cart, itemNotes, orderNotes])

  const filteredItems = menuMode === 'bar'
    ? barItems.filter(m => m.categoryId === activeCategory && (!searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase())))
    : menuItems.filter(m => m.categoryId === activeCategory && (!searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase())))

  const activeCats = menuMode === 'bar' ? barCategories : categories

  function getBarPrice(item: BarItem): number {
    return item.singlePrice ?? item.price ?? item.glassPrice ?? item.shotPrice ?? 0
  }

  const addItem = (item: MenuItem | BarItem, price?: number, station?: 'kitchen' | 'bar') => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id)
      if (existing) return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c)
      const p = price ?? (station === 'bar' ? getBarPrice(item as BarItem) : (parseFloat((item as MenuItem).price) || 0))
      return [...prev, { id: item.id, name: item.name, description: (item as MenuItem).description || '', price: p, quantity: 1, notes: '', station }]
    })
  }

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(c => c.id === id ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c).filter(c => c.quantity > 0))
  }

  const foodTotal = cart.filter(c => c.station !== 'bar').reduce((s, i) => s + i.price * i.quantity, 0)
  const barTotal = cart.filter(c => c.station === 'bar').reduce((s, i) => s + i.price * i.quantity, 0)
  const total = foodTotal + barTotal
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0)

  const cancelOrder = () => {
    setCart([]); setItemNotes({}); setOrderNotes(''); setSubmitError(null)
    localStorage.removeItem(CART_STORAGE_KEY); setTab('tables')
  }

  const submitOrder = async () => {
    if (cart.length === 0 || !tableNumber) return
    if (!waiterName) { setSubmitError('Please select your name'); return }
    setSubmitError(null); setSubmitting(true)
    try {
      const items = cart.map(c => ({ menu_item_id: c.id, quantity: c.quantity, notes: itemNotes[c.id] || undefined, station: c.station || undefined }))
      const res = await fetch('/api/supabase/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_name: `Table ${tableNumber}`, order_type: 'dine-in', requested_time: 'ASAP', items, table_number: String(tableNumber), waiter_name: waiterName || null, order_notes: orderNotes || undefined }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setSubmitError(d?.error || `Order failed (${res.status})`); return }
      const data = await res.json()
      setLastOrder({ tableNumber, cart, itemNotes, orderNotes })
      const refs = (data.orders || []).map((o: any) => ({ ref: o.order_ref || '', station: o.station || undefined, id: o.id }))
      setOrderRefs(refs); setDone(true); setCart([]); setItemNotes({}); setOrderNotes('')
      localStorage.removeItem(CART_STORAGE_KEY)
    } catch { setSubmitError('Network error — try again') }
    finally { setSubmitting(false) }
  }

  useEffect(() => {
    if (!done || orderRefs.length === 0) return
    const firstId = orderRefs[0]?.id
    if (!firstId) return
    const check = async () => {
      try {
        const res = await fetch(`/api/supabase/orders?sibling_of=${firstId}`)
        if (!res.ok) return
        const { orders: siblings } = await res.json()
        const all = [...orderRefs.map(r => ({ id: r.id })), ...(siblings || [])]
        setCancelledRefs(all.filter((o: any) => o.status === 'cancelled' || o.status === 'rejected').map((o: any) => ({ ref: o.order_ref || o.id, reason: o.cancellation_reason || undefined, status: o.status })))
      } catch {}
    }
    check()
    const iv = setInterval(check, 15000)
    return () => clearInterval(iv)
  }, [done, orderRefs])

  if (!authed) return <PasswordGate onSuccess={() => setAuthed(true)} />

  /* ── Done Screen ── */
  if (done) {
    const stationInfo = (s?: string) => {
      if (s === 'bar') return { label: 'Bar', icon: '🍸', color: '#8b5cf6' }
      if (s === 'kitchen') return { label: 'Kitchen', icon: '🍳', color: '#f59e0b' }
      return { label: 'Order', icon: '📋', color: '#f59e0b' }
    }
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--pos-bg)', color: 'var(--pos-text)', padding: '2rem', fontFamily: 'var(--pos-font)' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Order Sent!</h1>
        <p style={{ color: 'var(--pos-text-muted)', marginBottom: '0.25rem', fontSize: '1.1rem', fontWeight: 600 }}>Table {tableNumber}</p>
        {waiterName && <p style={{ color: '#ef4444', fontWeight: 600, marginBottom: '1rem' }}>Waiter: {waiterName}</p>}

        {/* Split order indicator */}
        {orderRefs.map((r, i) => {
          const si = stationInfo(r.station)
          return (
            <PosCard key={i} padding="0.75rem 1rem" style={{ width: '100%', maxWidth: '360px', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>{si.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--pos-text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{si.label}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--pos-font-mono)', color: si.color }}>{r.ref}</div>
                </div>
                <StatusBadge status="preparing" size="sm" />
              </div>
            </PosCard>
          )
        })}

        {orderRefs.length > 1 && (
          <p style={{ fontSize: '0.8rem', color: 'var(--pos-text-dim)', marginBottom: '1rem', textAlign: 'center', maxWidth: '360px' }}>
            Kitchen and bar work independently. Table is active until both are ready.
          </p>
        )}

        {cancelledRefs.length > 0 && (
          <PosCard padding="0.75rem" style={{ width: '100%', maxWidth: '360px', marginBottom: '1rem', borderColor: '#ef4444' }}>
            {cancelledRefs.map((c, i) => (
              <div key={i} style={{ fontSize: '0.85rem', color: '#fca5a5' }}>
                ❌ <strong>{c.ref}</strong>{c.reason ? `: ${c.reason}` : ''}
              </div>
            ))}
          </PosCard>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: '300px' }}>
          <PosButton variant="secondary" fullWidth onClick={() => { setDone(false); setTab('cart'); if (lastOrder) { setTableNumber(lastOrder.tableNumber); setCart(lastOrder.cart); setItemNotes(lastOrder.itemNotes); setOrderNotes(lastOrder.orderNotes) } }}>
            ← Back to Review
          </PosButton>
          <PosButton variant="primary" fullWidth onClick={() => { setDone(false); setTableNumber(null); setWaiterName(''); setSubmitError(null); setTab('tables'); setSearchQuery('') }}>
            New Order
          </PosButton>
        </div>
      </div>
    )
  }

  /* ── Main Layout ── */
  const foodItems = cart.filter(c => c.station !== 'bar')
  const barItems_ = cart.filter(c => c.station === 'bar')

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--pos-bg)', color: 'var(--pos-text)', display: 'flex', flexDirection: 'column', fontFamily: 'var(--pos-font)' }}>
      {/* Header */}
      {tableNumber && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 1rem', background: 'var(--pos-surface)', borderBottom: '1px solid var(--pos-border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.1rem' }}>🍽️</span>
            <div>
              <span style={{ fontSize: '0.6rem', color: 'var(--pos-text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Serving</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}>Table {tableNumber}</span>
              {waiterName && <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600, marginLeft: '0.5rem' }}>{waiterName}</span>}
            </div>
          </div>
          {itemCount > 0 && (
            <PosButton variant="primary" size="sm" onClick={() => setTab('cart')}>
              🛒 {itemCount} • R{total.toFixed(0)}
            </PosButton>
          )}
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Tables tab */}
        {tab === 'tables' && (
          <div style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 0.75rem' }}>Select Table</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
              {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => { setTableNumber(n); setTab('food') }}
                  style={{ padding: '1rem 0.5rem', borderRadius: '12px', border: tableNumber === n ? '2px solid #10b981' : '2px solid var(--pos-border)', background: tableNumber === n ? 'rgba(16,185,129,0.15)' : 'var(--pos-card)', color: 'var(--pos-text)', fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer', minHeight: '56px', fontFamily: 'var(--pos-font)' }}>
                  {n}
                </button>
              ))}
            </div>
            <div style={{ marginTop: '1rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--pos-text-muted)', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Your Name *</label>
              <select value={waiterName} onChange={e => setWaiterName(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: waiterName ? '2px solid #10b981' : '2px solid var(--pos-border)', background: 'var(--pos-card)', color: 'var(--pos-text)', fontSize: '1rem', outline: 'none', cursor: 'pointer', fontFamily: 'var(--pos-font)' }}>
                <option value="">Select your name...</option>
                {waiters.map(w => <option key={w.id} value={w.name} style={{ background: 'var(--pos-card)', color: 'var(--pos-text)' }}>{w.name}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Food tab */}
        {tab === 'food' && (
          <MenuBrowser mode="food" categories={categories} menuItems={menuItems} activeCategory={activeCategory} setActiveCategory={setActiveCategory} searchQuery={searchQuery} setSearchQuery={setSearchQuery} addItem={addItem} filteredItems={filteredItems} activeCats={activeCats} />
        )}

        {/* Drinks tab */}
        {tab === 'drinks' && (
          <MenuBrowser mode="bar" categories={barCategories as any} menuItems={barItems} activeCategory={activeCategory} setActiveCategory={setActiveCategory} searchQuery={searchQuery} setSearchQuery={setSearchQuery} addItem={addItem} filteredItems={filteredItems} activeCats={activeCats} getBarPrice={getBarPrice} />
        )}

        {/* Cart tab */}
        {tab === 'cart' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 0.75rem' }}>🛒 Order Review</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--pos-text-muted)', margin: '0 0 1rem' }}>Table {tableNumber} — {itemCount} item{itemCount !== 1 ? 's' : ''}</p>

            {/* Food section */}
            {foodItems.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>🍳 Kitchen — R{foodTotal.toFixed(2)}</div>
                {foodItems.map(item => (
                  <CartItemRow key={item.id} item={item} updateQty={updateQty} itemNotes={itemNotes} setItemNotes={setItemNotes} />
                ))}
              </div>
            )}

            {/* Bar section */}
            {barItems_.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#8b5cf6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>🍸 Bar — R{barTotal.toFixed(2)}</div>
                {barItems_.map(item => (
                  <CartItemRow key={item.id} item={item} updateQty={updateQty} itemNotes={itemNotes} setItemNotes={setItemNotes} />
                ))}
              </div>
            )}

            {cart.length === 0 && <p style={{ color: 'var(--pos-text-dim)', textAlign: 'center', padding: '2rem' }}>Cart empty</p>}

            {cart.length > 0 && (
              <>
                <div style={{ marginTop: '0.5rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--pos-text-muted)', display: 'block', marginBottom: '0.3rem', fontWeight: 500 }}>Order notes</label>
                  <input value={orderNotes} onChange={e => setOrderNotes(e.target.value)} placeholder="e.g. Extra napkins"
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--pos-border)', background: 'var(--pos-card)', color: 'var(--pos-text)', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none', fontFamily: 'var(--pos-font)' }} />
                </div>

                {/* Totals */}
                <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--pos-surface)', borderRadius: 'var(--pos-radius-lg)', border: '1px solid var(--pos-border)' }}>
                  {foodItems.length > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--pos-text-secondary)', marginBottom: '0.25rem' }}><span>🍳 Kitchen</span><span>R{foodTotal.toFixed(2)}</span></div>}
                  {barItems_.length > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--pos-text-secondary)', marginBottom: '0.25rem' }}><span>🍸 Bar</span><span>R{barTotal.toFixed(2)}</span></div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800, marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--pos-border)' }}><span>Total</span><span style={{ color: '#10b981' }}>R{total.toFixed(2)}</span></div>
                </div>

                {submitError && (
                  <div style={{ marginTop: '0.75rem', padding: '0.75rem', borderRadius: 'var(--pos-radius-md)', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: '0.85rem', textAlign: 'center' }}>{submitError}</div>
                )}

                <PosButton variant="success" fullWidth loading={submitting} onClick={submitOrder} style={{ marginTop: '0.75rem', fontSize: '1.1rem' }}>
                  {submitting ? 'Sending...' : submitError ? 'Retry Order' : `Send Order — R${total.toFixed(2)}`}
                </PosButton>
                <PosButton variant="danger" fullWidth onClick={cancelOrder} style={{ marginTop: '0.5rem' }}>Cancel Order</PosButton>
                <PosButton variant="ghost" fullWidth onClick={() => setTab('food')} style={{ marginTop: '0.5rem' }}>← Add more items</PosButton>
              </>
            )}
          </div>
        )}

        {/* History tab */}
        {tab === 'history' && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--pos-text-dim)', padding: '2rem', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
              <p>Order history coming soon</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div style={{ display: 'flex', background: 'var(--pos-surface)', borderTop: '1px solid var(--pos-border)', flexShrink: 0, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {[
          { key: 'food', icon: '🍽️', label: 'Food', color: '#10b981' },
          { key: 'drinks', icon: '🍸', label: 'Drinks', color: '#8b5cf6' },
          { key: 'tables', icon: '🪑', label: 'Tables', color: '#f59e0b' },
          { key: 'history', icon: '📋', label: 'History', color: '#6b7280' },
          { key: 'cart', icon: '🛒', label: 'Cart', color: '#10b981', badge: itemCount },
        ].map(nav => (
          <button key={nav.key} onClick={() => { if (nav.key === 'food') { setMenuMode('food'); setActiveCategory(categories[0]?.id || null) } else if (nav.key === 'drinks') { setMenuMode('bar'); setActiveCategory(barCategories[0]?.id || null) } setTab(nav.key as any); setSearchQuery('') }}
            style={{ flex: 1, padding: '0.5rem 0.25rem', border: 'none', background: 'transparent', color: tab === nav.key ? nav.color : 'var(--pos-text-dim)', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', fontFamily: 'var(--pos-font)', position: 'relative', minHeight: '56px', justifyContent: 'center' }}>
            <span style={{ fontSize: '1.2rem' }}>{nav.icon}</span>
            {nav.label}
            {nav.badge ? <span style={{ position: 'absolute', top: '4px', right: 'calc(50% - 18px)', background: '#ef4444', color: '#fff', borderRadius: '999px', minWidth: '18px', height: '18px', fontSize: '0.6rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{nav.badge}</span> : null}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── Menu Browser sub-component ── */
function MenuBrowser({ mode, categories, menuItems, activeCategory, setActiveCategory, searchQuery, setSearchQuery, addItem, filteredItems, activeCats, getBarPrice }: {
  mode: 'food' | 'bar'; categories: any[]; menuItems: any[]; activeCategory: string | null; setActiveCategory: (id: string | null) => void
  searchQuery: string; setSearchQuery: (q: string) => void; addItem: (item: any, price?: number, station?: 'kitchen' | 'bar') => void
  filteredItems: any[]; activeCats: any[]; getBarPrice?: (item: any) => number
}) {
  const accent = mode === 'bar' ? '#8b5cf6' : '#10b981'

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Search */}
      <div style={{ padding: '0.5rem 1rem', flexShrink: 0 }}>
        <input type="text" placeholder={`🔍 Search ${mode === 'bar' ? 'drinks' : 'food'}...`} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '0.7rem 0.85rem', borderRadius: '10px', border: '1px solid var(--pos-border)', background: 'var(--pos-card)', color: 'var(--pos-text)', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none', fontFamily: 'var(--pos-font)' }} />
      </div>

      {/* Categories */}
      <div style={{ display: 'flex', gap: '0.35rem', padding: '0 1rem 0.5rem', overflowX: 'auto', flexShrink: 0 }}>
        {activeCats.map(cat => (
          <button key={cat.id} onClick={() => { setActiveCategory(cat.id); setSearchQuery('') }}
            style={{ padding: '0.4rem 0.8rem', borderRadius: '20px', border: 'none', whiteSpace: 'nowrap', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', background: activeCategory === cat.id ? accent : 'var(--pos-card)', color: activeCategory === cat.id ? '#fff' : 'var(--pos-text-muted)', fontFamily: 'var(--pos-font)' }}>
            {cat.name}
          </button>
        ))}
      </div>

      {/* Items */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {filteredItems.map(item => (
          <button key={item.id} onClick={() => addItem(item, mode === 'bar' ? (getBarPrice?.(item) ?? 0) : undefined, mode === 'bar' ? 'bar' : 'kitchen')}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0.85rem', borderRadius: 'var(--pos-radius-md)', border: `1px solid ${accent}20`, background: `${accent}08`, color: 'var(--pos-text)', cursor: 'pointer', textAlign: 'left', width: '100%', minHeight: '56px', fontFamily: 'var(--pos-font)' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.name}</div>
              {item.description && <div style={{ fontSize: '0.7rem', color: 'var(--pos-text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.description.slice(0, 50)}</div>}
            </div>
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: accent, flexShrink: 0, marginLeft: '0.5rem' }}>
              R{mode === 'bar' ? (getBarPrice?.(item) ?? 0).toFixed(2) : parseFloat(item.price).toFixed(2)}
            </span>
          </button>
        ))}
        {filteredItems.length === 0 && <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--pos-text-dim)', fontSize: '0.9rem' }}>No items found</div>}
      </div>
    </div>
  )
}

/* ── Cart Item Row ── */
function CartItemRow({ item, updateQty, itemNotes, setItemNotes }: {
  item: CartItem; updateQty: (id: string, delta: number) => void
  itemNotes: Record<string, string>; setItemNotes: (fn: any) => void
}) {
  return (
    <div style={{ padding: '0.6rem 0', borderBottom: '1px solid var(--pos-border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.name}</span>
        <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.9rem' }}>R{(item.price * item.quantity).toFixed(2)}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button onClick={() => updateQty(item.id, -1)} style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid var(--pos-border)', background: 'var(--pos-card)', color: 'var(--pos-text)', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--pos-font)' }}>−</button>
        <span style={{ fontWeight: 700, fontSize: '1.05rem', minWidth: '1.5rem', textAlign: 'center' }}>{item.quantity}</span>
        <button onClick={() => updateQty(item.id, 1)} style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid var(--pos-border)', background: 'var(--pos-card)', color: 'var(--pos-text)', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--pos-font)' }}>+</button>
        <input placeholder="Notes" value={itemNotes[item.id] || ''} onChange={e => setItemNotes((prev: any) => ({ ...prev, [item.id]: e.target.value }))}
          style={{ flex: 1, padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid var(--pos-border)', background: 'var(--pos-card)', color: 'var(--pos-text)', fontSize: '0.8rem', outline: 'none', fontFamily: 'var(--pos-font)' }} />
      </div>
    </div>
  )
}
