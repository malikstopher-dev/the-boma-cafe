import { describe, it, expect, vi } from 'vitest'
import {
  ORDER_LIVE_EVENTS,
  eventToOrderStatus,
  applyOrderEventToMap,
  buildOrderStatusMap,
  subscribeToOrderEvents,
} from '../lib/order-status'

/** Minimal fake supabase client: channel().on().subscribe() + removeChannel. */
function fakeSupabase() {
  const listeners: ((payload: any) => void)[] = []
  const channel: any = {
    on: (_event: string, _opts: any, cb: any) => {
      listeners.push(cb)
      return channel
    },
    subscribe: (cb?: (s: string) => void) => {
      if (cb) cb('SUBSCRIBED')
      return channel
    },
  }
  const client = {
    channel: (_name: string) => channel,
    removeChannel: vi.fn().mockImplementation(() => {
      listeners.length = 0 // real supabase-js stops all deliveries after removal
      return Promise.resolve('ok')
    }),
  }
  const emit = (eventName: string, entityId: string) => {
    for (const cb of listeners) cb({ new: { event_name: eventName, entity_id: entityId } })
  }
  return { client, channel, emit }
}

describe('order-status: event mapping', () => {
  it('maps order.preparing to preparing', () => {
    expect(eventToOrderStatus('order.preparing')).toBe('preparing')
  })

  it('maps order.ready to ready', () => {
    expect(eventToOrderStatus('order.ready')).toBe('ready')
  })

  it('maps order.completed (served/completed contract) to served', () => {
    expect(eventToOrderStatus('order.completed')).toBe('served')
  })

  it('maps order.cancelled to cancelled', () => {
    expect(eventToOrderStatus('order.cancelled')).toBe('cancelled')
  })

  it('ignores unknown events', () => {
    expect(eventToOrderStatus('order.created')).toBeNull()
    expect(eventToOrderStatus('stock.low')).toBeNull()
  })
})

describe('order-status: waiter state updates from events (tests 1-4)', () => {
  it('preparing event updates waiter state immediately', () => {
    const map = applyOrderEventToMap({}, 'order.preparing', 'ord-1')
    expect(map['ord-1']).toBe('preparing')
  })

  it('ready event updates waiter state', () => {
    const map = applyOrderEventToMap({ 'ord-1': 'preparing' }, 'order.ready', 'ord-1')
    expect(map['ord-1']).toBe('ready')
  })

  it('served event (order.completed) updates waiter state to served', () => {
    const map = applyOrderEventToMap({ 'ord-1': 'ready' }, 'order.completed', 'ord-1')
    expect(map['ord-1']).toBe('served')
  })

  it('cancelled event updates waiter state to cancelled', () => {
    const map = applyOrderEventToMap({ 'ord-1': 'preparing' }, 'order.cancelled', 'ord-1')
    expect(map['ord-1']).toBe('cancelled')
  })

  it('ignores unknown event names and null entity ids; applies any non-null id (payload-level)', () => {
    const map = { 'ord-1': 'preparing' }
    expect(applyOrderEventToMap(map, 'order.ready', 'other-order')).toEqual({ 'ord-1': 'preparing', 'other-order': 'ready' })
    expect(applyOrderEventToMap(map, 'stock.low', 'ord-1')).toBe(map)
    expect(applyOrderEventToMap(map, 'order.ready', null)).toBe(map)
    expect(applyOrderEventToMap(map, 'order.ready', undefined as any)).toBe(map)
  })

  it('delivers events through the live subscription (waiter receives kitchen/bar changes)', () => {
    const f = fakeSupabase()
    const onEvent = vi.fn()
    const sub = subscribeToOrderEvents({
      channel: 'e1-test-delivery',
      events: ORDER_LIVE_EVENTS,
      onEvent,
      getSupabase: () => f.client,
    })
    f.emit('order.preparing', 'ord-1')
    f.emit('order.ready', 'ord-1')
    f.emit('order.completed', 'ord-1')
    f.emit('order.cancelled', 'ord-1')
    expect(onEvent.mock.calls).toEqual([
      ['order.preparing', 'ord-1'],
      ['order.ready', 'ord-1'],
      ['order.completed', 'ord-1'],
      ['order.cancelled', 'ord-1'],
    ])
    sub.unsubscribe()
  })

  it('uses the unquoted in-list filter on the realtime_events signal table', () => {
    const f = fakeSupabase()
    let captured: any = null
    const channel: any = {
      on: (_e: string, opts: any, cb: any) => {
        captured = opts
        return channel
      },
      subscribe: (cb?: (s: string) => void) => {
        if (cb) cb('SUBSCRIBED')
        return channel
      },
    }
    const client = { channel: () => channel, removeChannel: vi.fn().mockResolvedValue('ok') }
    const sub = subscribeToOrderEvents({ channel: 'e1-test-filter', getSupabase: () => client })
    expect(captured.table).toBe('realtime_events')
    expect(captured.filter).toBe('event_name=in.(order.preparing,order.ready,order.completed,order.cancelled)')
    sub.unsubscribe()
  })
})

describe('order-status: cleanup (test 5)', () => {
  it('unsubscribe removes the subscription and stops all updates', () => {
    const f = fakeSupabase()
    const onEvent = vi.fn()
    const onChange = vi.fn()
    const sub = subscribeToOrderEvents({
      channel: 'e1-test-cleanup',
      events: ORDER_LIVE_EVENTS,
      onEvent,
      onChange,
      getSupabase: () => f.client,
    })
    sub.unsubscribe()
    f.emit('order.ready', 'ord-1')
    expect(onEvent).not.toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
    expect(f.client.removeChannel).toHaveBeenCalledWith(f.channel)
  })

  it('cleanup releases the channel so a later subscription can reuse it', () => {
    const f = fakeSupabase()
    const first = vi.fn()
    const second = vi.fn()
    const sub1 = subscribeToOrderEvents({ channel: 'e1-test-reuse', onEvent: first, getSupabase: () => f.client })
    sub1.unsubscribe()
    const sub2 = subscribeToOrderEvents({ channel: 'e1-test-reuse', onEvent: second, getSupabase: () => f.client })
    f.emit('order.ready', 'ord-1')
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledWith('order.ready', 'ord-1')
    sub2.unsubscribe()
  })
})

describe('order-status: no duplicate subscriptions (test 6)', () => {
  it('a second subscription on the same channel is rejected', () => {
    const f = fakeSupabase()
    const first = vi.fn()
    const second = vi.fn()
    const sub1 = subscribeToOrderEvents({ channel: 'e1-test-dup', onEvent: first, getSupabase: () => f.client })
    const sub2 = subscribeToOrderEvents({ channel: 'e1-test-dup', onEvent: second, getSupabase: () => f.client })
    expect(sub2.subscribed).toBe(false)
    f.emit('order.ready', 'ord-1')
    expect(first).toHaveBeenCalledWith('order.ready', 'ord-1')
    expect(second).not.toHaveBeenCalled()
    sub1.unsubscribe()
    sub2.unsubscribe()
  })
})

describe('order-status: fallback when realtime is unavailable (test 7)', () => {
  it('reports not-subscribed when the client cannot connect', () => {
    const throwing = {
      channel: () => {
        throw new Error('realtime unavailable')
      },
    }
    const sub = subscribeToOrderEvents({ channel: 'e1-test-fallback', onEvent: vi.fn(), getSupabase: () => throwing })
    expect(sub.subscribed).toBe(false)
    sub.unsubscribe()
  })

  it('the fetch-based fallback path still updates waiter state without realtime', () => {
    const map = buildOrderStatusMap(
      [{ id: 'ord-1' }, { id: 'ord-2' }],
      [{ id: 'ord-1', status: 'ready' }],
    )
    expect(map['ord-1']).toBe('ready')
    expect(map['ord-2']).toBe('preparing') // fallback status for unknown rows
  })

  it('fallback rebuild covers the full lifecycle statuses a fetch can return', () => {
    const fetched = [
      { id: 'a', status: 'preparing' },
      { id: 'b', status: 'ready' },
      { id: 'c', status: 'served' },
      { id: 'd', status: 'cancelled' },
    ]
    const map = buildOrderStatusMap(fetched, fetched)
    expect(map['a']).toBe('preparing')
    expect(map['b']).toBe('ready')
    expect(map['c']).toBe('served')
    expect(map['d']).toBe('cancelled')
  })
})