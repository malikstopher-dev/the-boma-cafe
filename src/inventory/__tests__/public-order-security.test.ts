import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const state = vi.hoisted(() => ({
  order: null as Record<string, unknown> | null,
  queryError: null as { message: string } | null,
  cookieProof: null as string | null,
  session: null as { role: string } | null,
  rpcOutcomes: [] as Array<{ data: unknown; error: unknown }>,
  from: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(async () => true),
}))

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(async () => state.session),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: () => state.cookieProof ? { value: state.cookieProof } : undefined,
  })),
}))

vi.mock('@/lib/supabase', () => ({
  getAdminClient: () => ({
    from: state.from,
    rpc: state.rpc,
  }),
}))

import { GET as trackGet, POST as trackPost } from '@/app/api/track-order/route'
import { POST as verifyReceipt } from '@/app/api/receipt/verify/route'
import ReceiptPage from '@/app/receipt/[ref]/page'
import {
  createOrderAccessProof,
  generateOrderTrackingToken,
  hashOrderTrackingToken,
  orderAccessCookieName,
  verifyOrderAccessProof,
} from '@/lib/order-public-auth'

const REF = '20260826-001'

function queryChain() {
  let requestedRef: unknown
  const chain: any = {}
  chain.select = vi.fn(() => chain)
  chain.eq = vi.fn((column: string, value: unknown) => {
    if (column === 'order_ref') requestedRef = value
    return chain
  })
  chain.maybeSingle = vi.fn(async () => ({
    data: requestedRef === REF ? state.order : null,
    error: state.queryError,
  }))
  return chain
}

function request(method: string, path: string, body?: unknown, token?: string): NextRequest {
  const headers: Record<string, string> = {}
  let serialized: string | undefined
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    serialized = JSON.stringify(body)
  }
  if (token) headers['X-Order-Tracking-Token'] = token
  return new NextRequest(`https://x.test${path}`, { method, headers, ...(serialized ? { body: serialized } : {}) })
}

function baseOrder(token: string) {
  return {
    id: '123e4567-e89b-42d3-a456-426614174111',
    order_ref: REF,
    customer_name: 'Customer',
    phone: '+27820000000',
    delivery_address: 'private address',
    total: 125,
    status: 'pending',
    payment_status: 'pending',
    order_type: 'pickup',
    created_at: '2026-08-26T10:00:00.000Z',
    waiter_name: null,
    table_number: null,
    preparation_time_minutes: 20,
    items_json: JSON.stringify({ items: [{ name: 'Burger', quantity: 1, price: 125 }] }),
    tracking_token_hash: hashOrderTrackingToken(token),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.ORDER_PUBLIC_AUTH_SECRET = 'test-order-public-auth-secret-32-characters'
  const token = generateOrderTrackingToken()
  state.order = baseOrder(token)
  state.queryError = null
  state.cookieProof = null
  state.session = null
  state.rpcOutcomes = []
  state.from.mockImplementation(() => queryChain())
  state.rpc.mockImplementation(async () => state.rpcOutcomes.shift() ?? { data: null, error: null })
})

describe('public order tracking authorization', () => {
  it('rejects a reference without proof and does not distinguish an unknown reference', async () => {
    const known = await trackGet(request('GET', `/api/track-order?ref=${REF}`))
    const unknown = await trackGet(request('GET', '/api/track-order?ref=20260826-002'))
    expect(known.status).toBe(401)
    expect(unknown.status).toBe(401)
    expect(await known.json()).toEqual(await unknown.json())
  })

  it('fails sequential reference enumeration safely', async () => {
    for (let i = 1; i <= 5; i++) {
      const response = await trackGet(request('GET', `/api/track-order?ref=20260826-${String(i).padStart(3, '0')}`))
      expect(response.status).toBe(401)
    }
  })

  it('rejects an invalid token and accepts the matching token', async () => {
    const invalid = await trackGet(request('GET', `/api/track-order?ref=${REF}`, undefined, 'invalid-token'))
    expect(invalid.status).toBe(401)

    const token = generateOrderTrackingToken()
    state.order = baseOrder(token)
    const valid = await trackGet(request('GET', `/api/track-order?ref=${REF}`, undefined, token))
    expect(valid.status).toBe(200)
  })

  it('returns an explicit customer DTO without phone, address, token hash, or id', async () => {
    const token = generateOrderTrackingToken()
    state.order = baseOrder(token)
    const response = await trackGet(request('GET', `/api/track-order?ref=${REF}`, undefined, token))
    const json = await response.json()
    expect(response.status).toBe(200)
    for (const forbidden of ['phone', 'delivery_address', 'tracking_token_hash', 'id']) {
      expect(json).not.toHaveProperty(forbidden)
    }
  })
})

describe('public cancellation compare-and-set contract', () => {
  it('rejects reference-only and invalid-token cancellation', async () => {
    expect((await trackPost(request('POST', '/api/track-order', { ref: REF }))).status).toBe(401)
    expect((await trackPost(request('POST', '/api/track-order', { ref: REF }, 'invalid'))).status).toBe(401)
    expect(state.rpc).not.toHaveBeenCalled()
  })

  it('maps two concurrent cancellation attempts to one success and one conflict', async () => {
    const token = generateOrderTrackingToken()
    state.order = baseOrder(token)
    state.rpcOutcomes.push(
      { data: { outcome: 'cancelled', status: 'cancelled' }, error: null },
      { data: { outcome: 'conflict', status: 'cancelled' }, error: null },
    )

    const responses = await Promise.all([
      trackPost(request('POST', '/api/track-order', { ref: REF }, token)),
      trackPost(request('POST', '/api/track-order', { ref: REF }, token)),
    ])
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409])
    expect(state.rpc).toHaveBeenCalledTimes(2)
    expect(state.rpc).toHaveBeenCalledWith('cancel_public_order', {
      p_order_id: state.order.id,
      p_expected_status: 'pending',
    })
  })

  it('migration locks the order and writes the cancellation event in the same function', () => {
    const sql = readFileSync(join(process.cwd(), 'supabase/migrations/107_public_order_tracking_security.sql'), 'utf8')
    expect(sql).toContain('FOR UPDATE')
    expect(sql).toContain('INSERT INTO public.order_events')
    expect(sql.match(/'ORDER_CANCELLED'/g)).toHaveLength(1)
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.cancel_public_order')
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.cancel_public_order(UUID, TEXT) TO service_role')
  })
})

describe('receipt verification proof', () => {
  it('ignores a forged verified query parameter and does not read the order', async () => {
    const element = await ReceiptPage({
      params: Promise.resolve({ ref: REF }),
      searchParams: Promise.resolve({ verified: 'true' }),
    } as never)
    expect(state.from).not.toHaveBeenCalled()
    expect(typeof element.type).toBe('function')
    expect((element.type as { name?: string }).name).toBe('VerifyForm')
  })

  it('accepts only a valid signed proof for the matching reference', async () => {
    state.cookieProof = createOrderAccessProof(REF)
    const element = await ReceiptPage({ params: Promise.resolve({ ref: REF }) })
    expect(state.from).toHaveBeenCalledWith('orders')
    expect((element.type as { name?: string }).name).toBe('ReceiptContent')
    expect(verifyOrderAccessProof('different-ref', state.cookieProof)).toBe(false)
  })

  it('phone verification creates a short-lived HttpOnly proof and redirects without verified=true', async () => {
    const form = new URLSearchParams({ ref: REF, phone: '082 000 0000' })
    const verificationRequest = new NextRequest('https://x.test/api/receipt/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    })
    const response = await verifyReceipt(verificationRequest)
    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe(`https://x.test/receipt/${REF}`)
    const setCookie = response.headers.get('set-cookie') || ''
    expect(setCookie).toContain(`${orderAccessCookieName(REF)}=`)
    expect(setCookie.toLowerCase()).toContain('httponly')
    expect(setCookie).not.toContain('verified=true')
  })

  it('wrong phone does not create a proof', async () => {
    const form = new URLSearchParams({ ref: REF, phone: '0710000000' })
    const response = await verifyReceipt(new NextRequest('https://x.test/api/receipt/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    }))
    expect(response.status).toBe(401)
    expect(response.headers.get('set-cookie')).toBeNull()
  })
})
