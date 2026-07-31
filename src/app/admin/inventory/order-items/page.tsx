'use client'

import { useState, useEffect, useCallback } from 'react'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Button from '@/components/admin/design-system/Button'
import Badge from '@/components/admin/design-system/Badge'

interface OrderSummary {
  id: string
  order_ref: string
  customer_name: string
  total: number
  status: string
  created_at: string
}

interface OrderLine {
  id: string
  item_name: string
  quantity: number
  unit_price: number
  base_quantity: number | null
  product_id: string | null
  pour_size_ml: number | null
  transaction_id: string | null
  inventory_products?: { id: string; name: string; sku: string | null } | null
}

interface OrderDetail {
  order_id: string
  status: string
  items: OrderLine[]
}

export default function OrderItemsPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [search, setSearch] = useState('')
  const [selOrderId, setSelOrderId] = useState('')
  const [detail, setDetail] = useState<OrderDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/supabase/orders?limit=50')
      .then(r => r.json())
      .then(json => setOrders(Array.isArray(json) ? json : json.orders ?? []))
      .catch(() => {})
  }, [])

  const loadDetail = useCallback(async (orderId: string) => {
    setIsLoading(true)
    setMessage('')
    try {
      const res = await fetch(`/api/inventory/order-items?order_id=${orderId}`)
      const json = await res.json()
      setDetail(json.data ?? null)
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selOrderId) loadDetail(selOrderId)
    else setDetail(null)
  }, [selOrderId, loadDetail])

  async function post(path: string, label: string) {
    setBusy(true)
    setMessage('')
    try {
      const res = await fetch(`/api/inventory/order-items/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: selOrderId }),
      })
      const json = await res.json()
      if (json.error) {
        setMessage(`Error: ${json.error.message}`)
      } else {
        setMessage(`${label} complete (${path === 'deduct' ? `${json.data?.deducted ?? 0} deducted, ${json.data?.skipped ?? 0} skipped` : `${json.data?.items?.length ?? 0} items synced`})`)
        await loadDetail(selOrderId)
      }
    } catch {
      setMessage(`Failed: ${label.toLowerCase()}`)
    } finally {
      setBusy(false)
    }
  }

  const filteredOrders = search
    ? orders.filter(o =>
        o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
        o.order_ref?.toLowerCase().includes(search.toLowerCase()),
      )
    : orders

  const matched = detail?.items.filter(i => i.product_id) ?? []
  const unmatched = detail?.items.filter(i => !i.product_id) ?? []
  const deducted = matched.filter(i => i.transaction_id)

  return (
    <AdminPage
      title="Order Items"
      subtitle="Normalize order line items and auto-deduct stock when orders complete"
    >
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <h3 className="font-semibold text-white mb-3">Orders</h3>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search customer / order ref..."
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white mb-3"
            />
            <div className="max-h-[70vh] overflow-y-auto space-y-2">
              {filteredOrders.map(o => (
                <button
                  key={o.id}
                  onClick={() => setSelOrderId(o.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selOrderId === o.id
                      ? 'bg-brand-500/20 border-brand-500/50'
                      : 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-700/50'
                  }`}
                >
                  <div className="text-white font-medium text-sm">{o.customer_name || 'Unknown'}</div>
                  <div className="text-xs text-gray-400 flex justify-between mt-1">
                    <span>{o.order_ref}</span>
                    <span>R{o.total?.toFixed?.(2) ?? o.total}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{o.status} · {new Date(o.created_at).toLocaleDateString('en-ZA')}</div>
                </button>
              ))}
              {filteredOrders.length === 0 && (
                <p className="text-gray-500 text-sm py-8 text-center">No orders found</p>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            {!selOrderId ? (
              <p className="text-gray-500 py-12 text-center">Select an order to view its items</p>
            ) : isLoading ? (
              <p className="text-gray-400 py-12 text-center">Loading...</p>
            ) : detail ? (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="font-semibold text-white">Order Items</h3>
                  <Badge variant={detail.status === 'completed' ? 'success' : 'info'}>{detail.status}</Badge>
                  <span className="text-sm text-gray-400">
                    {matched.length} matched · {unmatched.length} unmatched · {deducted.length} deducted
                  </span>
                </div>

                {message && <div className="mb-4 text-sm text-gray-300 bg-gray-800/60 border border-gray-700 rounded p-3">{message}</div>}

                <div className="flex gap-2 mb-4">
                  <Button size="sm" onClick={() => post('sync', 'Sync')} disabled={busy}>
                    Sync Items
                  </Button>
                  <Button size="sm" variant="primary" onClick={() => post('deduct', 'Deduct')} disabled={busy || matched.length === 0}>
                    Deduct Stock (SALE)
                  </Button>
                </div>

                <div className="space-y-2">
                  {detail.items.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
                      <span className="text-white font-medium flex-1">
                        {item.quantity}x {item.item_name}
                      </span>
                      {item.product_id ? (
                        <Badge variant="success">
                          {item.inventory_products?.name ?? 'matched'}
                        </Badge>
                      ) : (
                        <Badge variant="danger">unmatched</Badge>
                      )}
                      {item.product_id && (
                        <span className="text-xs text-gray-400">
                          base {item.base_quantity ?? '—'}{item.pour_size_ml ? ` (${item.pour_size_ml}ml pour)` : ''}
                        </span>
                      )}
                      {item.transaction_id ? (
                        <span className="text-xs text-green-500">✓ deducted</span>
                      ) : item.product_id ? (
                        <span className="text-xs text-amber-400">pending</span>
                      ) : null}
                    </div>
                  ))}
                  {detail.items.length === 0 && (
                    <p className="text-gray-500 text-sm py-8 text-center">
                      No normalized items yet — click "Sync Items" to parse the order
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-gray-500 py-12 text-center">Order not found</p>
            )}
          </div>
        </div>
      </div>
    </AdminPage>
  )
}
