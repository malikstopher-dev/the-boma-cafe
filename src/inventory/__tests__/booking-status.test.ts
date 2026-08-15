import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  BOOKING_LIVE_EVENTS,
  eventToBookingStatus,
  bookingEventNeedsFetch,
  sanitizeWaiterBooking,
  applyBookingStatusToFeed,
  upsertWaiterBooking,
  subscribeToBookingEvents,
} from '../lib/booking-status'

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
      listeners.length = 0
      return Promise.resolve('ok')
    }),
  }
  const emit = (eventName: string, entityId: string) => {
    for (const cb of listeners) cb({ new: { event_name: eventName, entity_id: entityId } })
  }
  return { client, channel, emit }
}

const row = (over: Record<string, unknown> = {}) =>
  ({
    id: 'b1', reference: 'B1', date: '2026-08-20', time: '18:00',
    guests: 4, location: 'Main Hall', status: 'confirmed', ...over,
  }) as any

describe('booking-status: event mapping', () => {
  it('maps all four lifecycle events to statuses', () => {
    expect(eventToBookingStatus('booking.confirmed')).toBe('confirmed')
    expect(eventToBookingStatus('booking.in_progress')).toBe('in_progress')
    expect(eventToBookingStatus('booking.completed')).toBe('completed')
    expect(eventToBookingStatus('booking.cancelled')).toBe('cancelled')
  })

  it('ignores unknown and null events', () => {
    expect(eventToBookingStatus('booking.created')).toBeNull()
    expect(eventToBookingStatus('order.ready')).toBeNull()
    expect(eventToBookingStatus('')).toBeNull()
  })

  it('only booking.confirmed requires a fetch (new row data)', () => {
    expect(bookingEventNeedsFetch('booking.confirmed')).toBe(true)
    expect(bookingEventNeedsFetch('booking.in_progress')).toBe(false)
    expect(bookingEventNeedsFetch('booking.completed')).toBe(false)
    expect(bookingEventNeedsFetch('booking.cancelled')).toBe(false)
  })
})

describe('booking-status: sanitizer drops PII (privacy contract)', () => {
  it('keeps only the seven operational fields, even when PII is present', () => {
    const dirty = {
      id: 'b1', reference: 'B1', date: '2026-08-20', time: '18:00', guests: 4, location: 'Main Hall', status: 'confirmed',
      name: 'John Doe', phone: '+27 82 555 1234', email: 'john@example.com',
      notes: 'VIP — surprise party', special_requests: 'vegan',
      total: 12500.0, deposit_amount: 3750.0, quote_total: 12500.0, adults: 2, children: 2,
      customer_id: 'c-1', quote_id: 'q-1', source: 'web',
    }
    const clean = sanitizeWaiterBooking(dirty)!
    expect(Object.keys(clean).sort()).toEqual(['date', 'guests', 'id', 'location', 'reference', 'status', 'time'])
    expect(JSON.stringify(clean)).not.toContain('John')
    expect(JSON.stringify(clean)).not.toContain('john@')
    expect(JSON.stringify(clean)).not.toContain('12500')
    expect(JSON.stringify(clean)).not.toContain('VIP')
  })

  it('returns null for a row without an id', () => {
    expect(sanitizeWaiterBooking({ date: '2026-08-20', guests: 4 })).toBeNull()
  })
})

describe('booking-status: feed application (live status updates)', () => {
  it('booking.confirmed leaves the feed unchanged (fetch path handles it)', () => {
    const feed = [row()]
    expect(applyBookingStatusToFeed(feed, 'booking.confirmed', 'b1')).toBe(feed)
  })

  it('booking.in_progress flips a known row to in_progress', () => {
    const out = applyBookingStatusToFeed([row()], 'booking.in_progress', 'b1')
    expect(out[0]!.status).toBe('in_progress')
  })

  it('booking.completed flips a known row to completed', () => {
    const out = applyBookingStatusToFeed([row({ status: 'in_progress' })], 'booking.completed', 'b1')
    expect(out[0]!.status).toBe('completed')
  })

  it('booking.cancelled removes the row from the feed', () => {
    const feed = [row(), row({ id: 'b2', reference: 'B2' })]
    const out = applyBookingStatusToFeed(feed, 'booking.cancelled', 'b1')
    expect(out).toHaveLength(1)
    expect(out[0]!.id).toBe('b2')
  })

  it('is a no-op for unknown entity ids, null ids, and unknown events', () => {
    const feed = [row()]
    expect(applyBookingStatusToFeed(feed, 'booking.in_progress', 'nope')).toBe(feed)
    expect(applyBookingStatusToFeed(feed, 'booking.cancelled', 'nope')).toBe(feed)
    expect(applyBookingStatusToFeed(feed, 'booking.in_progress', null)).toBe(feed)
    expect(applyBookingStatusToFeed(feed, 'order.ready', 'b1')).toBe(feed)
  })

  it('upsert adds a new row and replaces an existing one', () => {
    const feed = [row()]
    const added = upsertWaiterBooking(feed, row({ id: 'b2', reference: 'B2' }))
    expect(added).toHaveLength(2)
    const replaced = upsertWaiterBooking(feed, row({ status: 'in_progress' }))
    expect(replaced).toHaveLength(1)
    expect(replaced[0]!.status).toBe('in_progress')
  })
})

describe('booking-status: subscription (realtime transport)', () => {
  it('delivers booking lifecycle events with entity ids', () => {
    const f = fakeSupabase()
    const onEvent = vi.fn()
    const sub = subscribeToBookingEvents({ channel: 'e1-test-delivery', onEvent, getSupabase: () => f.client })
    f.emit('booking.confirmed', 'b1')
    f.emit('booking.in_progress', 'b1')
    f.emit('booking.completed', 'b1')
    f.emit('booking.cancelled', 'b1')
    expect(onEvent.mock.calls).toEqual([
      ['booking.confirmed', 'b1'],
      ['booking.in_progress', 'b1'],
      ['booking.completed', 'b1'],
      ['booking.cancelled', 'b1'],
    ])
    sub.unsubscribe()
  })

  it('uses the unquoted in-list filter on realtime_events', () => {
    const f = fakeSupabase()
    let captured: any = null
    const channel: any = {
      on: (_e: string, opts: any, cb: any) => { captured = opts; return channel },
      subscribe: (cb?: (s: string) => void) => { if (cb) cb('SUBSCRIBED'); return channel },
    }
    const client = { channel: () => channel, removeChannel: vi.fn().mockResolvedValue('ok') }
    const sub = subscribeToBookingEvents({ channel: 'e1-test-filter', getSupabase: () => client })
    expect(captured.table).toBe('realtime_events')
    expect(captured.filter).toBe('event_name=in.(booking.confirmed,booking.in_progress,booking.completed,booking.cancelled)')
    sub.unsubscribe()
  })

  it('rejects a duplicate channel subscription', () => {
    const f = fakeSupabase()
    const first = vi.fn()
    const second = vi.fn()
    const sub1 = subscribeToBookingEvents({ channel: 'e1-test-dup', onEvent: first, getSupabase: () => f.client })
    const sub2 = subscribeToBookingEvents({ channel: 'e1-test-dup', onEvent: second, getSupabase: () => f.client })
    expect(sub2.subscribed).toBe(false)
    f.emit('booking.confirmed', 'b1')
    expect(first).toHaveBeenCalledWith('booking.confirmed', 'b1')
    expect(second).not.toHaveBeenCalled()
    sub1.unsubscribe()
    sub2.unsubscribe()
  })

  it('unsubscribe stops all delivery and releases the channel', () => {
    const f = fakeSupabase()
    const onEvent = vi.fn()
    const sub = subscribeToBookingEvents({ channel: 'e1-test-cleanup', onEvent, getSupabase: () => f.client })
    sub.unsubscribe()
    f.emit('booking.completed', 'b1')
    expect(onEvent).not.toHaveBeenCalled()
    expect(f.client.removeChannel).toHaveBeenCalledWith(f.channel)

    const reuse = vi.fn()
    const sub2 = subscribeToBookingEvents({ channel: 'e1-test-cleanup', onEvent: reuse, getSupabase: () => f.client })
    f.emit('booking.completed', 'b1')
    expect(reuse).toHaveBeenCalledWith('booking.completed', 'b1')
    sub2.unsubscribe()
  })

  it('reports not-subscribed when the client cannot connect', () => {
    const throwing = { channel: () => { throw new Error('realtime unavailable') } }
    const sub = subscribeToBookingEvents({ channel: 'e1-test-fallback', onEvent: vi.fn(), getSupabase: () => throwing })
    expect(sub.subscribed).toBe(false)
    sub.unsubscribe()
  })

  it('exports exactly the four contract events', () => {
    expect([...BOOKING_LIVE_EVENTS]).toEqual(['booking.confirmed', 'booking.in_progress', 'booking.completed', 'booking.cancelled'])
  })
})

// ============ API route privacy test ============
const mockClient: any = { from: vi.fn() }

vi.mock('@/lib/supabase', () => ({
  getAdminClient: vi.fn(() => mockClient),
}))

vi.mock('@/lib/staff/identity', () => ({
  resolveStaffIdentity: vi.fn(),
}))

import { GET } from '@/app/api/staff/bookings/route'

describe('/api/staff/bookings (waiter API privacy contract)', () => {
  /** Thenable query chain: select -> order -> order -> await -> results. */
  const chain = (results: any) => {
    const c: any = {
      eq: vi.fn(() => c),
      order: vi.fn(() => c),
      maybeSingle: vi.fn(async () => results),
      select: vi.fn((cols: string) => {
        c.selectArgs = cols
        return c
      }),
      then: (res: any) => res(results),
      selectArgs: null as string | null,
    }
    return c
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.from.mockReset()
  })

  it('returns 401 for unauthenticated requests', async () => {
    const { resolveStaffIdentity } = await import('@/lib/staff/identity')
    ;(resolveStaffIdentity as any).mockResolvedValue(null)
    const req = new Request('http://localhost/api/staff/bookings') as any
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('reads ONLY the waiter_booking_view allowlist — never the bookings table', async () => {
    const { resolveStaffIdentity } = await import('@/lib/staff/identity')
    ;(resolveStaffIdentity as any).mockResolvedValue({ role: 'waiter', staffId: 'w1' })
    const c = chain({ data: [{ id: 'b1', booking_date: '2026-08-20', booking_time: '18:00:00', guests: 4, venue_area: 'Main Hall', status: 'confirmed' }], error: null })
    mockClient.from.mockReturnValue(c)

    const req = new Request('http://localhost/api/staff/bookings') as any
    const res = await GET(req)
    expect(res.status).toBe(200)

    expect(mockClient.from).toHaveBeenCalledWith('waiter_booking_view')
    expect(mockClient.from).not.toHaveBeenCalledWith('bookings')
    expect(c.selectArgs).toBe('id, booking_date, booking_time, guests, venue_area, status')
  })

  it('orders the list by date then time', async () => {
    const { resolveStaffIdentity } = await import('@/lib/staff/identity')
    ;(resolveStaffIdentity as any).mockResolvedValue({ role: 'waiter', staffId: 'w1' })
    const c = chain({ data: [], error: null })
    mockClient.from.mockReturnValue(c)

    const req = new Request('http://localhost/api/staff/bookings') as any
    const res = await GET(req)
    expect(res.status).toBe(200)
    const orders = c.order.mock.calls.map((call: any[]) => call[0])
    expect(orders).toEqual(['booking_date', 'booking_time'])
  })

  it('maps rows to the 7-field waiter payload with zero PII keys', async () => {
    const { resolveStaffIdentity } = await import('@/lib/staff/identity')
    ;(resolveStaffIdentity as any).mockResolvedValue({ role: 'waiter', staffId: 'w1' })
    const dbRow = {
      id: '11111111-2222-3333-4444-555555555555', booking_date: '2026-08-20', booking_time: '18:00:00',
      guests: 4, venue_area: 'Main Hall', status: 'confirmed',
    }
    const c = chain({ data: [dbRow], error: null })
    mockClient.from.mockReturnValue(c)

    const req = new Request('http://localhost/api/staff/bookings') as any
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)

    const booking = body.bookings[0]
    expect(Object.keys(booking).sort()).toEqual(['date', 'guests', 'id', 'location', 'reference', 'status', 'time'])
    expect(booking.reference).toBe('11111111')
    expect(booking.time).toBe('18:00')
    expect(booking.location).toBe('Main Hall')

    const raw = JSON.stringify(body)
    expect(raw).not.toContain('name')
    expect(raw).not.toContain('phone')
    expect(raw).not.toContain('email')
    expect(raw).not.toContain('notes')
    expect(raw).not.toContain('total')
    expect(raw).not.toContain('quote')
    expect(raw).not.toContain('deposit')
  })

  it('single-row ?id= fetch also maps through the same allowlist', async () => {
    const { resolveStaffIdentity } = await import('@/lib/staff/identity')
    ;(resolveStaffIdentity as any).mockResolvedValue({ role: 'waiter', staffId: 'w1' })
    const dbRow = {
      id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', booking_date: '2026-08-21', booking_time: '19:30:00',
      guests: 2, venue_area: null, status: 'in_progress',
    }
    const c = chain({ data: dbRow, error: null })
    mockClient.from.mockReturnValue(c)

    const req = new Request('http://localhost/api/staff/bookings?id=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee') as any
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(c.eq).toHaveBeenCalledWith('id', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')
    expect(Object.keys(body.booking).sort()).toEqual(['date', 'guests', 'id', 'location', 'reference', 'status', 'time'])
    expect(body.booking.location).toBeNull()
  })

  it('404s for a single-row fetch that the view does not contain', async () => {
    const { resolveStaffIdentity } = await import('@/lib/staff/identity')
    ;(resolveStaffIdentity as any).mockResolvedValue({ role: 'waiter', staffId: 'w1' })
    const c = chain({ data: null, error: null })
    mockClient.from.mockReturnValue(c)

    const req = new Request('http://localhost/api/staff/bookings?id=11111111-2222-3333-4444-555555555555') as any
    const res = await GET(req)
    expect(res.status).toBe(404)
  })
})