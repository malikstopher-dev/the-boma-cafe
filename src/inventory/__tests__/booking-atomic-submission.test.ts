import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const state = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(async () => true),
}))

vi.mock('@/lib/booking/settings', () => ({
  getBookingSettings: vi.fn(async () => ({
    enabled: true,
    quote_validity_days: 7,
    notification_emails: ['bookings@example.test'],
  })),
}))

const calculation = {
  line_items: [{
    label: 'Venue: Main',
    description: null,
    item_type: 'venue_area',
    reference_id: '123e4567-e89b-42d3-a456-426614174002',
    quantity: 1,
    unit_price: 1000,
    total: 1000,
    sort_order: 1,
  }],
  subtotal: 1000,
  tax_rate: 0,
  tax_amount: 0,
  total: 1000,
  deposit_percentage: 30,
  deposit_amount: 300,
  balance_amount: 700,
}

vi.mock('@/lib/booking/pricing', () => ({
  calculateQuotation: vi.fn(async () => calculation),
}))

vi.mock('@/lib/booking/quote-generator', () => ({
  generateAccessToken: vi.fn(() => 'access-token'),
}))

vi.mock('@/lib/supabase', () => ({
  getAdminClient: () => ({ from: state.from, rpc: state.rpc }),
}))

import { POST, bookingIdempotencyKey } from '@/app/api/booking/submit/route'

const booking = {
  booking_type_id: '123e4567-e89b-42d3-a456-426614174001',
  booking_date: '2026-09-10',
  booking_time: '12:00',
  duration_hours: 3,
  adults: 20,
  children: 2,
  venue_area_id: '123e4567-e89b-42d3-a456-426614174002',
  food_package_id: null,
  drink_package_id: null,
  addons: [] as Array<{ id: string; quantity: number }>,
  name: 'Customer Name',
  phone: '0820000000',
  email: 'customer@example.test',
  company: '',
  special_requests: '',
}

function request(data: unknown = booking) {
  return new NextRequest('https://x.test/api/booking/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

function displayQuery(table: string) {
  const chain: any = {}
  chain.select = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.maybeSingle = vi.fn(async () => ({
    data: { name: table === 'booking_types' ? 'Wedding' : 'Main Hall' },
    error: null,
  }))
  return chain
}

function successResult(overrides: Record<string, unknown> = {}) {
  return {
    booking_id: '123e4567-e89b-42d3-a456-426614174010',
    quote_id: '123e4567-e89b-42d3-a456-426614174011',
    quote_number: 'BMC-2026-0001',
    job_id: '123e4567-e89b-42d3-a456-426614174012',
    job_outcome: 'inserted',
    job_payload: {
      lineItems: calculation.line_items,
      subtotal: 1000,
      taxRate: 0,
      taxAmount: 0,
      total: 1000,
      depositPercentage: 30,
      depositAmount: 300,
      balanceAmount: 700,
    },
    duplicate: false,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  state.from.mockImplementation((table: string) => displayQuery(table))
  state.rpc.mockResolvedValue({ data: successResult(), error: null })
})

describe('atomic booking submission route', () => {
  it('performs one mutation RPC and returns the committed identifiers', async () => {
    const response = await POST(request())
    const json = await response.json()

    expect(response.status).toBe(201)
    expect(json.quote_number).toBe('BMC-2026-0001')
    expect(state.rpc).toHaveBeenCalledTimes(1)
    expect(state.rpc).toHaveBeenCalledWith('submit_booking_atomic', expect.objectContaining({
      p_booking: expect.objectContaining({ email: booking.email }),
      p_calculation: calculation,
      p_idempotency_key: expect.stringMatching(/^booking-submit:v2:[a-f0-9]{64}$/),
    }))

    for (const result of state.from.mock.results) {
      const query = result.value
      expect(query.insert).toBeUndefined()
      expect(query.update).toBeUndefined()
      expect(query.delete).toBeUndefined()
    }
  })

  it('replays the original quotation for an exact duplicate', async () => {
    state.rpc.mockResolvedValue({
      data: successResult({
        duplicate: true,
        job_outcome: 'already_completed',
        job_payload: {
          lineItems: calculation.line_items,
          subtotal: 900,
          taxRate: 0,
          taxAmount: 0,
          total: 900,
          depositPercentage: 30,
          depositAmount: 270,
          balanceAmount: 630,
        },
      }),
      error: null,
    })

    const response = await POST(request())
    const json = await response.json()
    expect(response.status).toBe(200)
    expect(json.duplicate).toBe(true)
    expect(json.quotation.total).toBe(900)
    expect(state.rpc).toHaveBeenCalledTimes(1)
  })

  it('maps a locked availability conflict to 409', async () => {
    state.rpc.mockResolvedValue({
      data: null,
      error: { message: 'BOOKING_UNAVAILABLE: venue area is already booked during this time' },
    })
    const response = await POST(request())
    expect(response.status).toBe(409)
    expect((await response.json()).error).toContain('already booked')
  })

  it('fails closed when any atomic write or enqueue fails', async () => {
    state.rpc.mockResolvedValue({ data: null, error: { message: 'insert failed' } })
    const response = await POST(request())
    expect(response.status).toBe(500)
    expect(state.rpc).toHaveBeenCalledTimes(1)
  })

  it('uses the same idempotency key for semantically identical addon order', () => {
    const first = {
      ...booking,
      addons: [
        { id: '123e4567-e89b-42d3-a456-426614174020', quantity: 1 },
        { id: '123e4567-e89b-42d3-a456-426614174021', quantity: 2 },
      ],
    }
    const second = { ...first, addons: [...first.addons].reverse() }
    expect(bookingIdempotencyKey(first)).toBe(bookingIdempotencyKey(second))
  })
})

describe('atomic booking migration contract', () => {
  const sql = readFileSync(
    join(process.cwd(), 'supabase/migrations/108_atomic_booking_submission.sql'),
    'utf8',
  )

  it('serializes the final availability check before every durable write', () => {
    const lock = sql.indexOf('LOCK TABLE public.availability IN SHARE ROW EXCLUSIVE MODE')
    const conflict = sql.indexOf('FROM public.availability a')
    const bookingInsert = sql.indexOf('INSERT INTO public.bookings')
    const jobEnqueue = sql.lastIndexOf('FROM public.enqueue_background_job')
    expect(lock).toBeGreaterThan(-1)
    expect(conflict).toBeGreaterThan(lock)
    expect(bookingInsert).toBeGreaterThan(conflict)
    expect(jobEnqueue).toBeGreaterThan(bookingInsert)
    expect(sql).toContain('a.start_time < v_end_time')
    expect(sql).toContain('a.end_time > v_start_time')
  })

  it('keeps booking, quote, items, hold, audit, and job in one function', () => {
    for (const statement of [
      'INSERT INTO public.bookings',
      'INSERT INTO public.quotes',
      'INSERT INTO public.quote_items',
      'INSERT INTO public.availability',
      'INSERT INTO public.booking_status_history',
      'FROM public.enqueue_background_job',
    ]) {
      expect(sql).toContain(statement)
    }
    expect(sql).toContain('pg_advisory_xact_lock')
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.submit_booking_atomic')
    expect(sql).toContain('TO service_role')
  })

  it('releases cancelled/refunded holds transactionally through a trigger', () => {
    expect(sql).toContain("NEW.status IN ('cancelled', 'refunded')")
    expect(sql).toContain('DELETE FROM public.availability WHERE booking_id = NEW.id')
    expect(sql).toContain('AFTER UPDATE OF status ON public.bookings')
    expect(sql).not.toContain("update({ status: 'cancelled' })")
  })
})
