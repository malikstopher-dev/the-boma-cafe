'use client'

import { useState, useEffect, useRef } from 'react'
import StatusBadge from '@/components/pos/StatusBadge'
import StationBadge from '@/components/pos/StationBadge'
import PosButton from '@/components/pos/PosButton'
import PosCard from '@/components/pos/PosCard'
import Timer from '@/components/pos/Timer'
import { posTokens as t } from '@/components/pos/DesignSystem'
import ErrorBoundary from '@/components/pos/ErrorBoundary'

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
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.focus() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, role: 'waiter' }),
      })
      if (res.ok) onSuccess()
      else setError('Invalid password')
    } catch { setError('Connection error') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.colors.bg.primary, padding: 16 }}>
      <form onSubmit={handleSubmit} style={{
        background: t.colors.bg.surface, borderRadius: 24, padding: '40px 32px',
        width: '100%', maxWidth: 380, border: `1px solid ${t.colors.border.default}`,
        boxShadow: t.shadow.lg, display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <h1 style={{ fontSize: 24, fontWeight: t.typography.fontWeight.bold, color: t.colors.text.primary, margin: 0, fontFamily: t.typography.fontFamily }}>Waiter Login</h1>
        </div>
        <input ref={ref} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Waiter password"
          style={{
            width: '100%', padding: '14px 16px', borderRadius: t.radius.lg,
            border: `2px solid ${t.colors.border.default}`,
            background: 'rgba(255,255,255,0.05)', color: t.colors.text.primary,
            fontSize: t.typography.fontSize.lg, textAlign: 'center', boxSizing: 'border-box',
            fontFamily: t.typography.fontFamily, outline: 'none', transition: 'border-color 0.15s',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = '#10b981')}
          onBlur={e => (e.currentTarget.style.borderColor = t.colors.border.default)}
          required />
        {error && <div style={{ color: '#ef4444', fontSize: t.typography.fontSize.sm, textAlign: 'center' }}>{error}</div>}
        <PosButton type="submit" variant="warning" fullWidth size="lg" loading={loading}>Enter</PosButton>
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
  const [historyOrders, setHistoryOrders] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [menuLoading, setMenuLoading] = useState(false)

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
    if (!authed || tab !== 'history' || !waiterName) return
    setHistoryLoading(true)
    fetch(`/api/supabase/orders?limit=100&source=waiter`).then(r => r.json()).then(data => {
      if (!Array.isArray(data)) return
      const myOrders = data.filter((o: any) => o.waiter_name === waiterName)
      setHistoryOrders(myOrders)
    }).catch(() => {}).finally(() => setHistoryLoading(false))
  }, [authed, tab, waiterName])

  useEffect(() => {
    if (!authed) return
    setMenuLoading(true)
    Promise.all([
      fetch('/api/menu/public', { cache: 'no-cache' }).then(r => r.json()).catch(() => ({ categories: [], menuItems: [] })),
      fetch('/api/bar/public', { cache: 'no-cache' }).then(r => r.json()).catch(() => ({ categories: [], items: [] })),
    ]).then(([menuData, barData]) => {
      setCategories(menuData.categories || [])
      setMenuItems(menuData.menuItems || [])
      if (menuData.categories?.length > 0) setActiveCategory(menuData.categories[0].id)
      setBarCategories(barData.categories || [])
      setBarItems(barData.items || [])
    }).finally(() => setMenuLoading(false))
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
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: t.colors.bg.primary, color: t.colors.text.primary, padding: 32, fontFamily: t.typography.fontFamily }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
        <h1 style={{ fontSize: 24, fontWeight: t.typography.fontWeight.bold, marginBottom: 4 }}>Order Sent!</h1>
        <p style={{ color: t.colors.text.muted, marginBottom: 4, fontSize: t.typography.fontSize.lg, fontWeight: t.typography.fontWeight.semibold }}>Table {tableNumber}</p>
        {waiterName && <p style={{ color: '#ef4444', fontWeight: t.typography.fontWeight.semibold, marginBottom: 16, fontSize: t.typography.fontSize.md }}>Waiter: {waiterName}</p>}

        {orderRefs.map((r, i) => {
          const si = stationInfo(r.station)
          return (
            <PosCard key={i} padding="12px 16px" style={{ width: '100%', maxWidth: 360, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24 }}>{si.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: t.typography.fontSize.xs, color: t.colors.text.dim, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{si.label}</div>
                  <div style={{ fontSize: t.typography.fontSize.lg, fontWeight: t.typography.fontWeight.extrabold, fontFamily: t.typography.fontFamilyMono, color: si.color }}>{r.ref}</div>
                </div>
                <StatusBadge status="preparing" size="sm" />
              </div>
            </PosCard>
          )
        })}

        {orderRefs.length > 1 && (
          <p style={{ fontSize: t.typography.fontSize.sm, color: t.colors.text.dim, marginBottom: 16, textAlign: 'center', maxWidth: 360 }}>
            Kitchen and bar work independently. Table is active until both are ready.
          </p>
        )}

        {cancelledRefs.length > 0 && (
          <PosCard padding="12px" style={{ width: '100%', maxWidth: 360, marginBottom: 16, borderColor: '#ef4444' }}>
            {cancelledRefs.map((c, i) => (
              <div key={i} style={{ fontSize: t.typography.fontSize.sm, color: '#fca5a5' }}>
                ❌ <strong>{c.ref}</strong>{c.reason ? `: ${c.reason}` : ''}
              </div>
            ))}
          </PosCard>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 300 }}>
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
    <div style={{ minHeight: '100dvh', background: t.colors.bg.primary, color: t.colors.text.primary, display: 'flex', flexDirection: 'column', fontFamily: t.typography.fontFamily }}>
      {/* Header */}
      {tableNumber && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 16px', background: t.colors.bg.surface,
          borderBottom: `1px solid ${t.colors.border.default}`, flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🍽️</span>
            <div>
              <span style={{ fontSize: t.typography.fontSize.xs, color: t.colors.text.dim, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Serving</span>
              <span style={{ fontSize: t.typography.fontSize.xl, fontWeight: t.typography.fontWeight.extrabold, color: '#10b981' }}>Table {tableNumber}</span>
              {waiterName && <span style={{ fontSize: t.typography.fontSize.sm, color: '#ef4444', fontWeight: t.typography.fontWeight.semibold, marginLeft: 8 }}>{waiterName}</span>}
            </div>
          </div>
          {itemCount > 0 && (
            <PosButton variant="primary" size="sm" onClick={() => setTab('cart')}>
              🛒 {itemCount} • R{total.toFixed(0)}
            </PosButton>
          )}
          <button onClick={() => { window.location.href = '/api/admin/auth?action=logout' }}
            style={{ padding: '6px 10px', border: '1px solid rgba(239,68,68,0.3)', borderRadius: t.radius.sm, background: 'transparent', color: '#ef4444', fontSize: t.typography.fontSize.sm, cursor: 'pointer', fontFamily: t.typography.fontFamily }}>
            Sign Out
          </button>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Tables tab */}
        {tab === 'tables' && (
          <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
            <h2 style={{ fontSize: t.typography.fontSize.xl, fontWeight: t.typography.fontWeight.extrabold, margin: '0 0 12px' }}>Select Table</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
              {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => { setTableNumber(n); setTab('food') }}
                  style={{
                    padding: '16px 8px', borderRadius: t.radius.lg,
                    border: tableNumber === n ? '2px solid #10b981' : `2px solid ${t.colors.border.default}`,
                    background: tableNumber === n ? 'rgba(16,185,129,0.15)' : t.colors.bg.card,
                    color: t.colors.text.primary, fontSize: t.typography.fontSize.lg,
                    fontWeight: t.typography.fontWeight.bold, cursor: 'pointer', minHeight: 56,
                    fontFamily: t.typography.fontFamily,
                  }}>
                  {n}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 16 }}>
              <label style={{ fontSize: t.typography.fontSize.sm, color: t.colors.text.muted, display: 'block', marginBottom: 6, fontWeight: t.typography.fontWeight.semibold }}>Your Name *</label>
              <select value={waiterName} onChange={e => setWaiterName(e.target.value)}
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: t.radius.lg,
                  border: waiterName ? '2px solid #10b981' : `2px solid ${t.colors.border.default}`,
                  background: t.colors.bg.card, color: t.colors.text.primary,
                  fontSize: t.typography.fontSize.md, outline: 'none', cursor: 'pointer',
                  fontFamily: t.typography.fontFamily,
                }}>
                <option value="">Select your name...</option>
                {waiters.map(w => <option key={w.id} value={w.name} style={{ background: t.colors.bg.card, color: t.colors.text.primary }}>{w.name}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Food tab */}
        {tab === 'food' && (
          <MenuBrowser mode="food" categories={categories} menuItems={menuItems} activeCategory={activeCategory} setActiveCategory={setActiveCategory} searchQuery={searchQuery} setSearchQuery={setSearchQuery} addItem={addItem} filteredItems={filteredItems} activeCats={activeCats} loading={menuLoading} />
        )}

        {/* Drinks tab */}
        {tab === 'drinks' && (
          <MenuBrowser mode="bar" categories={barCategories as any} menuItems={barItems} activeCategory={activeCategory} setActiveCategory={setActiveCategory} searchQuery={searchQuery} setSearchQuery={setSearchQuery} addItem={addItem} filteredItems={filteredItems} activeCats={activeCats} getBarPrice={getBarPrice} loading={menuLoading} />
        )}

        {/* Cart tab */}
        {tab === 'cart' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            <h2 style={{ fontSize: t.typography.fontSize.xl, fontWeight: t.typography.fontWeight.extrabold, margin: '0 0 12px' }}>🛒 Order Review</h2>
            <p style={{ fontSize: t.typography.fontSize.sm, color: t.colors.text.muted, margin: '0 0 16px' }}>Table {tableNumber} — {itemCount} item{itemCount !== 1 ? 's' : ''}</p>

            {foodItems.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: t.typography.fontSize.xs, color: '#f59e0b', fontWeight: t.typography.fontWeight.bold, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>🍳 Kitchen — R{foodTotal.toFixed(2)}</div>
                {foodItems.map(item => (
                  <CartItemRow key={item.id} item={item} updateQty={updateQty} itemNotes={itemNotes} setItemNotes={setItemNotes} />
                ))}
              </div>
            )}

            {barItems_.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: t.typography.fontSize.xs, color: '#8b5cf6', fontWeight: t.typography.fontWeight.bold, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>🍸 Bar — R{barTotal.toFixed(2)}</div>
                {barItems_.map(item => (
                  <CartItemRow key={item.id} item={item} updateQty={updateQty} itemNotes={itemNotes} setItemNotes={setItemNotes} />
                ))}
              </div>
            )}

            {cart.length === 0 && <p style={{ color: t.colors.text.dim, textAlign: 'center', padding: 32 }}>Cart empty</p>}

            {cart.length > 0 && (
              <>
                <div style={{ marginTop: 8 }}>
                  <label style={{ fontSize: t.typography.fontSize.sm, color: t.colors.text.muted, display: 'block', marginBottom: 4, fontWeight: t.typography.fontWeight.medium }}>Order notes</label>
                  <input value={orderNotes} onChange={e => setOrderNotes(e.target.value)} placeholder="e.g. Extra napkins"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: t.radius.md, border: `1px solid ${t.colors.border.default}`, background: t.colors.bg.card, color: t.colors.text.primary, fontSize: t.typography.fontSize.md, boxSizing: 'border-box', outline: 'none', fontFamily: t.typography.fontFamily }} />
                </div>

                <div style={{ marginTop: 16, padding: 12, background: t.colors.bg.surface, borderRadius: t.radius.lg, border: `1px solid ${t.colors.border.default}` }}>
                  {foodItems.length > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: t.typography.fontSize.sm, color: t.colors.text.secondary, marginBottom: 4 }}><span>🍳 Kitchen</span><span>R{foodTotal.toFixed(2)}</span></div>}
                  {barItems_.length > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: t.typography.fontSize.sm, color: t.colors.text.secondary, marginBottom: 4 }}><span>🍸 Bar</span><span>R{barTotal.toFixed(2)}</span></div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: t.typography.fontSize.lg, fontWeight: t.typography.fontWeight.extrabold, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${t.colors.border.default}` }}><span>Total</span><span style={{ color: '#10b981' }}>R{total.toFixed(2)}</span></div>
                </div>

                {submitError && (
                  <div style={{ marginTop: 12, padding: 12, borderRadius: t.radius.md, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: t.typography.fontSize.sm, textAlign: 'center' }}>{submitError}</div>
                )}

                <PosButton variant="success" fullWidth loading={submitting} onClick={submitOrder} style={{ marginTop: 12, fontSize: t.typography.fontSize.lg }}>
                  {submitting ? 'Sending...' : submitError ? 'Retry Order' : `Send Order — R${total.toFixed(2)}`}
                </PosButton>
                <PosButton variant="danger" fullWidth onClick={cancelOrder} style={{ marginTop: 8 }}>Cancel Order</PosButton>
                <PosButton variant="ghost" fullWidth onClick={() => setTab('food')} style={{ marginTop: 8 }}>← Add more items</PosButton>
              </>
            )}
          </div>
        )}

        {/* History tab */}
        {tab === 'history' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            <h2 style={{ fontSize: t.typography.fontSize.xl, fontWeight: t.typography.fontWeight.extrabold, margin: '0 0 12px' }}>📋 My Orders</h2>
            {!waiterName && <p style={{ color: t.colors.text.dim, textAlign: 'center', padding: 32 }}>Select your name in Tables to view history</p>}
            {waiterName && historyLoading && (
              <div style={{ textAlign: 'center', padding: 48 }}>
                <div style={{ width: 32, height: 32, border: `3px solid ${t.colors.border.default}`, borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                <p style={{ color: t.colors.text.dim, fontSize: t.typography.fontSize.sm }}>Loading orders...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}
            {waiterName && !historyLoading && historyOrders.length === 0 && (
              <div style={{ textAlign: 'center', padding: 48, color: t.colors.text.dim }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                <p>No orders yet</p>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {historyOrders.map(order => {
                const items: any[] = []
                try { const p = JSON.parse(order.items_json); (Array.isArray(p) ? p : p?.items || []).forEach((i: any) => items.push(i)) } catch { /* */ }
                const statusColors: Record<string, string> = {
                  pending: '#f59e0b', confirmed: '#3b82f6', preparing: '#eab308', packing: '#f97316',
                  ready: '#10b981', served: '#06b6d4', completed: '#6b7280', cancelled: '#ef4444', rejected: '#ef4444'
                }
                const color = statusColors[order.status] || '#6b7280'
                return (
                  <div key={order.id} style={{ padding: 12, borderRadius: t.radius.md, background: t.colors.bg.card, border: `1px solid ${t.colors.border.default}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <StationBadge station={order.station || 'kitchen'} size="sm" />
                        <span style={{ fontFamily: t.typography.fontFamilyMono, fontSize: t.typography.fontSize.sm, color: t.colors.text.dim }}>{order.order_ref}</span>
                      </div>
                      <span style={{ fontSize: t.typography.fontSize.xs, color: t.colors.text.dim }}>
                        {new Date(order.created_at).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })} {new Date(order.created_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: t.typography.fontSize.sm, color: t.colors.text.secondary }}>
                        {items.slice(0, 3).map((item: any, i: number) => <span key={i}>{item.quantity}x {item.name}{i < Math.min(items.length, 3) - 1 ? ', ' : ''}</span>)}
                        {items.length > 3 && <span style={{ color: t.colors.text.dim }}> +{items.length - 3} more</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: t.typography.fontWeight.bold, color: '#10b981', fontSize: t.typography.fontSize.sm }}>R{order.total?.toFixed(2) || '0.00'}</span>
                        <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: t.typography.fontSize.xs, fontWeight: t.typography.fontWeight.bold, textTransform: 'uppercase' as const, background: `${color}22`, color, border: `1px solid ${color}40` }}>{order.status}</span>
                      </div>
                    </div>
                    {order.cancellation_reason && (
                      <div style={{ marginTop: 4, padding: '4px 8px', borderRadius: 4, background: 'rgba(239,68,68,0.1)', color: '#fca5a5', fontSize: t.typography.fontSize.xs }}>
                        ❌ {order.cancellation_reason}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div style={{ display: 'flex', background: t.colors.bg.surface, borderTop: `1px solid ${t.colors.border.default}`, flexShrink: 0, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {[
          { key: 'food', icon: '🍽️', label: 'Food', color: '#10b981' },
          { key: 'drinks', icon: '🍸', label: 'Drinks', color: '#8b5cf6' },
          { key: 'tables', icon: '🪑', label: 'Tables', color: '#f59e0b' },
          { key: 'history', icon: '📋', label: 'History', color: '#6b7280' },
          { key: 'cart', icon: '🛒', label: 'Cart', color: '#10b981', badge: itemCount },
        ].map(nav => (
          <button key={nav.key} onClick={() => { if (nav.key === 'food') { setMenuMode('food'); setActiveCategory(categories[0]?.id || null) } else if (nav.key === 'drinks') { setMenuMode('bar'); setActiveCategory(barCategories[0]?.id || null) } setTab(nav.key as any); setSearchQuery('') }}
            style={{
              flex: 1, padding: '8px 4px', border: 'none', background: 'transparent',
              color: tab === nav.key ? nav.color : t.colors.text.dim,
              fontSize: t.typography.fontSize.xs, fontWeight: t.typography.fontWeight.bold,
              cursor: 'pointer', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 2, fontFamily: t.typography.fontFamily,
              position: 'relative', minHeight: 56, justifyContent: 'center',
            }}>
            <span style={{ fontSize: 20 }}>{nav.icon}</span>
            {nav.label}
            {nav.badge ? <span style={{ position: 'absolute', top: 4, right: 'calc(50% - 18px)', background: '#ef4444', color: '#fff', borderRadius: 999, minWidth: 18, height: 18, fontSize: t.typography.fontSize.xs, fontWeight: t.typography.fontWeight.extrabold, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{nav.badge}</span> : null}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── Menu Browser sub-component ── */
function MenuBrowser({ mode, categories, menuItems, activeCategory, setActiveCategory, searchQuery, setSearchQuery, addItem, filteredItems, activeCats, getBarPrice, loading }: {
  mode: 'food' | 'bar'; categories: any[]; menuItems: any[]; activeCategory: string | null; setActiveCategory: (id: string | null) => void
  searchQuery: string; setSearchQuery: (q: string) => void; addItem: (item: any, price?: number, station?: 'kitchen' | 'bar') => void
  filteredItems: any[]; activeCats: any[]; getBarPrice?: (item: any) => number; loading?: boolean
}) {
  const accent = mode === 'bar' ? '#8b5cf6' : '#10b981'

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Search */}
      <div style={{ padding: '8px 16px', flexShrink: 0 }}>
        <input type="text" placeholder={`🔍 Search ${mode === 'bar' ? 'drinks' : 'food'}...`} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: t.radius.lg,
            border: `1px solid ${t.colors.border.default}`, background: t.colors.bg.card,
            color: t.colors.text.primary, fontSize: t.typography.fontSize.md,
            boxSizing: 'border-box', outline: 'none', fontFamily: t.typography.fontFamily,
          }} />
      </div>

      {/* Categories */}
      <div style={{ display: 'flex', gap: 6, padding: '0 16px 8px', overflowX: 'auto', flexShrink: 0 }}>
        {activeCats.map(cat => (
          <button key={cat.id} onClick={() => { setActiveCategory(cat.id); setSearchQuery('') }}
            style={{
              padding: '6px 14px', borderRadius: 20, border: 'none', whiteSpace: 'nowrap',
              fontSize: t.typography.fontSize.sm, fontWeight: t.typography.fontWeight.semibold, cursor: 'pointer',
              background: activeCategory === cat.id ? accent : t.colors.bg.card,
              color: activeCategory === cat.id ? '#fff' : t.colors.text.muted,
              fontFamily: t.typography.fontFamily,
            }}>
            {cat.name}
          </button>
        ))}
      </div>

      {/* Items */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ width: 32, height: 32, border: `3px solid ${t.colors.border.default}`, borderTopColor: accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ color: t.colors.text.dim, fontSize: t.typography.fontSize.sm }}>Loading menu...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: t.colors.text.dim, fontSize: t.typography.fontSize.md }}>No items found</div>
        ) : (
          filteredItems.map(item => (
            <button key={item.id} onClick={() => addItem(item, mode === 'bar' ? (getBarPrice?.(item) ?? 0) : undefined, mode === 'bar' ? 'bar' : 'kitchen')}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 14px', borderRadius: t.radius.md,
                border: `1px solid ${accent}20`, background: `${accent}08`,
                color: t.colors.text.primary, cursor: 'pointer', textAlign: 'left',
                width: '100%', minHeight: 56, fontFamily: t.typography.fontFamily,
              }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: t.typography.fontWeight.semibold, fontSize: t.typography.fontSize.md }}>{item.name}</div>
                {item.description && <div style={{ fontSize: t.typography.fontSize.xs, color: t.colors.text.dim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.description.slice(0, 50)}</div>}
              </div>
              <span style={{ fontSize: t.typography.fontSize.md, fontWeight: t.typography.fontWeight.bold, color: accent, flexShrink: 0, marginLeft: 8 }}>
                R{mode === 'bar' ? (getBarPrice?.(item) ?? 0).toFixed(2) : parseFloat(item.price).toFixed(2)}
              </span>
            </button>
          ))
        )}
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
    <div style={{ padding: '10px 0', borderBottom: `1px solid ${t.colors.border.default}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontWeight: t.typography.fontWeight.semibold, fontSize: t.typography.fontSize.md }}>{item.name}</span>
        <span style={{ color: '#10b981', fontWeight: t.typography.fontWeight.bold, fontSize: t.typography.fontSize.md }}>R{(item.price * item.quantity).toFixed(2)}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={() => updateQty(item.id, -1)} style={{ width: 40, height: 40, borderRadius: '50%', border: `1px solid ${t.colors.border.default}`, background: t.colors.bg.card, color: t.colors.text.primary, fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: t.typography.fontFamily }}>−</button>
        <span style={{ fontWeight: t.typography.fontWeight.bold, fontSize: t.typography.fontSize.lg, minWidth: 24, textAlign: 'center' }}>{item.quantity}</span>
        <button onClick={() => updateQty(item.id, 1)} style={{ width: 40, height: 40, borderRadius: '50%', border: `1px solid ${t.colors.border.default}`, background: t.colors.bg.card, color: t.colors.text.primary, fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: t.typography.fontFamily }}>+</button>
        <input placeholder="Notes" value={itemNotes[item.id] || ''} onChange={e => setItemNotes((prev: any) => ({ ...prev, [item.id]: e.target.value }))}
          style={{ flex: 1, padding: '6px 10px', borderRadius: t.radius.sm, border: `1px solid ${t.colors.border.default}`, background: t.colors.bg.card, color: t.colors.text.primary, fontSize: t.typography.fontSize.sm, outline: 'none', fontFamily: t.typography.fontFamily }} />
      </div>
    </div>
  )
}
