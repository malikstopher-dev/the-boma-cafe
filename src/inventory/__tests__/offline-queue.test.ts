import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearOrderQueue,
  enqueueOrder,
  getPendingOrders,
  syncPendingOrders,
} from '../../lib/offline-queue'

class MemoryStorage {
  private values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

describe('offline order queue', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    const storage = new MemoryStorage()
    Object.assign(globalThis, {
      window: { dispatchEvent: vi.fn() },
      localStorage: storage,
      CustomEvent: class { constructor(public type: string) {} },
    })
    clearOrderQueue()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('persists item and order notes for later replay', () => {
    enqueueOrder({
      customer_name: 'Guest', phone: '0123', order_type: 'dine-in', requested_time: 'now',
      order_notes: 'Table by the window',
      items: [{ name: 'Burger', quantity: 1, price: 80, notes: 'No onions' }],
    })

    const orders = getPendingOrders()
    expect(orders[0]?.payload.order_notes).toBe('Table by the window')
    expect((orders[0]?.payload.items as Array<{ notes?: string }>)[0]?.notes).toBe('No onions')
  })

  it('keeps transport failures pending', async () => {
    enqueueOrder({ customer_name: 'Guest', phone: '', order_type: 'dine-in', requested_time: 'now', items: [] })
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('fetch failed'))

    const result = await syncPendingOrders()
    expect(result).toMatchObject({ synced: 0, pending: 1, failed: 0 })
    expect(getPendingOrders()[0]?.status).toBe('pending')
  })

  it('keeps retryable server failures pending', async () => {
    enqueueOrder({ customer_name: 'Guest', phone: '', order_type: 'dine-in', requested_time: 'now', items: [] })
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 503 }))

    const result = await syncPendingOrders()
    expect(result).toMatchObject({ pending: 1, failed: 0 })
  })

  it('surfaces permanent validation failures instead of retrying forever', async () => {
    enqueueOrder({ customer_name: 'Guest', phone: '', order_type: 'dine-in', requested_time: 'now', items: [] })
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Invalid order' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    }))

    const result = await syncPendingOrders()
    expect(result).toMatchObject({ pending: 0, failed: 1 })
    expect(getPendingOrders()[0]).toMatchObject({ status: 'failed', last_error: 'Invalid order' })
  })

  it('removes successfully replayed orders', async () => {
    enqueueOrder({ customer_name: 'Guest', phone: '', order_type: 'dine-in', requested_time: 'now', items: [] })
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 201 }))

    const result = await syncPendingOrders()
    expect(result).toMatchObject({ synced: 1, pending: 0, failed: 0 })
    expect(getPendingOrders()).toEqual([])
  })

  it('reports corrupt persisted data without silently overwriting it', () => {
    localStorage.setItem('boma_pending_orders', '{bad json')
    expect(() => getPendingOrders()).toThrow('unreadable')
    expect(localStorage.getItem('boma_pending_orders')).toBe('{bad json')
  })
})
