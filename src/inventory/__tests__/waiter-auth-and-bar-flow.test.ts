// Owner-reported fixes (2026-08-25):
// 1. PIN-logged-in waiter was anonymous to cookie-only routes → orders POST
//    stripped waiter_name → "Phone number is required" → orders created as
//    source='online' → stuck behind admin confirmation. getSession() now
//    validates boma_staff_session (mirroring middleware).
// 2. Bar board "Start Prep" failed: state machine had no bar
//    pending/confirmed→preparing for non-waiter sources, and no bar
//    preparing→ready at all. Bar now has kitchen parity.
// 3. Waiter PWA bottom navbar scrolled away — root container is now
//    height:100dvh so the nav is pinned (CSS-only, not unit-testable here).

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── getSession staff-session tests ──────────────────────────────────
const cookieStore = vi.hoisted(() => ({ jar: new Map<string, { name: string; value: string }>() }))
const sbState = vi.hoisted(() => ({ staffSession: null as Record<string, unknown> | null, debug: [] as string[] }))

// Passwords must exist BEFORE auth.ts captures them at module load.
vi.hoisted(() => {
  process.env.WAITER_PASSWORD = 'BomaWaiter0884'
  process.env.KITCHEN_PASSWORD = 'BomaKitchen0884'
  process.env.BAR_PASSWORD = 'BomaBar0884'
})

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => cookieStore.jar.get(name),
  })),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => {
    sbState.debug.push('createClient-called')
    return {
      from: (_t: string) => {
        sbState.debug.push('from-called')
        const chain: any = {
          select: () => { sbState.debug.push('select'); return chain },
          eq: () => { sbState.debug.push('eq'); return chain },
          is: () => chain,
          maybeSingle: async () => { sbState.debug.push('maybeSingle:' + JSON.stringify(sbState.staffSession)); return { data: sbState.staffSession, error: null } },
        }
        return chain
      },
    }
  }),
}))

vi.mock('@/lib/admin/session', () => ({
  validateAdminSession: vi.fn(async () => null),
}))

import { getSession } from '@/lib/auth'

function setCookie(name: string, value: string) {
  cookieStore.jar.set(name, { name, value })
}

const FUTURE = new Date(Date.now() + 8 * 3600e3).toISOString()
const STALE = new Date(Date.now() - 60 * 60e3).toISOString()

describe('getSession — PIN staff session (boma_staff_session)', () => {
  beforeEach(() => {
    cookieStore.jar.clear()
    sbState.staffSession = null
    sbState.debug.length = 0
  })

  it('MOCK PROBE: mocked createClient is the one auth.ts uses', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    const c = createClient('http://localhost:54321', 'k') as unknown as { from: (t: string) => unknown }
    c.from('x')
    expect(sbState.debug).toContain('from-called')
  })

  it('MOCK PROBE 2: getSession staff-branch entry conditions', async () => {
    setCookie('boma_staff_session', 'sess-1')
    sbState.staffSession = { id: 'sess-1', role: 'waiter', signed_out_at: null, expires_at: FUTURE, last_active_at: new Date().toISOString() }
    const result = await getSession()
    process.stdout.write(`DBG2 result=${JSON.stringify(result)} jar=${JSON.stringify([...cookieStore.jar.keys()])} envURL=${process.env.NEXT_PUBLIC_SUPABASE_URL} debug=${JSON.stringify(sbState.debug)}\n`)
    expect(result).toEqual({ role: 'waiter' })
  })

  it('valid waiter PIN session → role waiter', async () => {
    setCookie('boma_staff_session', 'sess-1')
    sbState.staffSession = { id: 'sess-1', role: 'waiter', signed_out_at: null, expires_at: FUTURE, last_active_at: new Date().toISOString() }
    expect(await getSession()).toEqual({ role: 'waiter' })
  })

  it('valid bar PIN session → role bar', async () => {
    setCookie('boma_staff_session', 'sess-2')
    sbState.staffSession = { id: 'sess-2', role: 'bar', signed_out_at: null, expires_at: FUTURE, last_active_at: new Date().toISOString() }
    expect(await getSession()).toEqual({ role: 'bar' })
  })

  it('expired staff session → null', async () => {
    setCookie('boma_staff_session', 'sess-3')
    sbState.staffSession = { id: 'sess-3', role: 'waiter', signed_out_at: null, expires_at: new Date(Date.now() - 1000).toISOString(), last_active_at: new Date().toISOString() }
    expect(await getSession()).toBeNull()
  })

  it('stale activity does not expire a still-valid staff session', async () => {
    setCookie('boma_staff_session', 'sess-4')
    sbState.staffSession = { id: 'sess-4', role: 'waiter', signed_out_at: null, expires_at: FUTURE, last_active_at: STALE }
    expect(await getSession()).toEqual({ role: 'waiter' })
  })

  it('signed-out / unknown session → null', async () => {
    setCookie('boma_staff_session', 'sess-5')
    sbState.staffSession = null
    expect(await getSession()).toBeNull()
  })

  it('unknown role value in staff session → null (clamped)', async () => {
    setCookie('boma_staff_session', 'sess-6')
    sbState.staffSession = { id: 'sess-6', role: 'manager', signed_out_at: null, expires_at: FUTURE, last_active_at: new Date().toISOString() }
    expect(await getSession()).toBeNull()
  })

  it('shared-password waiter cookie still resolves (precedence preserved)', async () => {
    process.env.WAITER_PASSWORD = 'BomaWaiter0884'
    const { createHash } = await import('node:crypto')
    setCookie('boma_waiter_auth', createHash('sha256').update('waiter:BomaWaiter0884').digest('hex'))
    expect(await getSession()).toEqual({ role: 'waiter' })
  })
})

// ── State machine: bar parity with kitchen ──────────────────────────
import { canTransition } from '@/lib/order-state-machine'

describe('state machine — bar prep on any source', () => {
  it('bar can start prep on a confirmed ONLINE order (the reported bug)', () => {
    expect(canTransition('confirmed', 'preparing', 'bar', 'online')).toBe(true)
  })
  it('bar can start prep on a pending ONLINE order', () => {
    expect(canTransition('pending', 'preparing', 'bar', 'online')).toBe(true)
  })
  it('bar can mark a preparing order ready', () => {
    expect(canTransition('preparing', 'ready', 'bar', 'online')).toBe(true)
    expect(canTransition('preparing', 'ready', 'bar', 'waiter')).toBe(true)
  })
  it('bar waiter-source transitions unchanged', () => {
    expect(canTransition('pending', 'preparing', 'bar', 'waiter')).toBe(true)
    expect(canTransition('confirmed', 'preparing', 'bar', 'waiter')).toBe(true)
  })
  it('kitchen parity unchanged', () => {
    expect(canTransition('confirmed', 'preparing', 'kitchen', 'online')).toBe(true)
    expect(canTransition('preparing', 'ready', 'kitchen', 'online')).toBe(true)
  })
  it('online confirmation still admin-only (approval gate preserved for real customer orders)', () => {
    expect(canTransition('pending', 'confirmed', 'bar', 'online')).toBe(false)
    expect(canTransition('pending', 'confirmed', 'kitchen', 'online')).toBe(false)
    expect(canTransition('pending', 'confirmed', 'waiter', 'online')).toBe(false)
    expect(canTransition('pending', 'confirmed', 'admin', 'online')).toBe(true)
  })
  it('bar still cannot complete or cancel outside its lane', () => {
    expect(canTransition('ready', 'completed', 'bar', 'online')).toBe(false)
  })
})

// ── Orders POST: waiter attribution end-to-end ──────────────────────
const authMocks = vi.hoisted(() => ({ getRequestRole: vi.fn() }))
const sbState2 = vi.hoisted(() => ({
  log: [] as Array<{ op: string; table?: string; args?: unknown[] }>,
  barItems: new Map<string, Record<string, unknown>>([
    ['B1', { id: 'B1', name: 'Castle Lager', single_price: 40, bottle: null, glass_price: null, shot_price: null, price: null }],
  ]),
  ordersById: new Map<string, Record<string, unknown>>(),
}))

vi.mock('@/lib/auth/requireRole', () => ({
  getRequestRole: authMocks.getRequestRole,
  requireAuthenticated: vi.fn(async () => null),
  requireAdmin: vi.fn(async () => null),
}))
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(async () => true),
  checkRateLimitByWaiter: vi.fn(async () => true),
}))
vi.mock('@/lib/supabase', () => ({
  getAdminClient: () => {
    const state = sbState2
    const rec = (op: string, table?: string, args?: unknown[]) => { state.log.push({ op, table, args }) }
    const makeChain = (table?: string): any => {
      const meta: any = { __table: table, __eqs: [], __in: null as unknown[] | null }
      const resolve = async (): Promise<unknown> => {
        if (table === 'bar_items') {
          const ids = (meta.__in as string[]) ?? []
          const rows = ids.map(id => state.barItems.get(id)).filter(Boolean).map(r => ({ ...r }))
          return { data: rows, error: null }
        }
        if (table === 'orders' && meta.__eqs.length >= 2 && meta.__eqs[0] === 'idempotency_key') {
          return { data: null, error: null }
        }
        return { data: null, error: null }
      }
      const chain = {
        select: () => chain,
        eq: (...a: unknown[]) => { meta.__eqs.push(a[0], a[1]); return chain },
        neq: () => chain,
        or: () => chain,
        in: (...a: unknown[]) => { meta.__in = a[1] as unknown[]; return chain },
        gte: () => chain,
        lte: () => chain,
        order: () => chain,
        range: () => chain,
        limit: () => chain,
        single: async () => resolve(),
        maybeSingle: async () => resolve(),
        insert: (rows: Array<Record<string, unknown>>) => {
          const p = (async () => {
            rec('INSERT', table, rows)
            if (table === 'orders') {
              const row = rows[0] ?? {}
              const full = { id: crypto.randomUUID(), order_ref: '20990101-001', ...row }
              state.ordersById.set(String(full.id), full)
              return { data: [full], error: null }
            }
            return { data: rows, error: null }
          })()
          return {
            select: () => ({ single: () => p.then((r: any) => ({ data: r?.data?.[0] ?? null, error: r?.error ?? null })) }),
            then: (f?: (v: unknown) => unknown, rj?: (e: unknown) => unknown) => p.then(f as never, rj as never),
          }
        },
        then: (f?: (v: unknown) => unknown, rj?: (e: unknown) => unknown) => resolve().then(f as never, rj as never),
      }
      return chain
    }
    return { from: (t: string) => makeChain(t), rpc: async () => ({ data: null, error: null }) }
  },
}))
vi.mock('@/lib/notifications/push', () => ({
  notifyOrderCreated: vi.fn(async () => true),
  notifyOrderConfirmed: vi.fn(async () => true),
  notifyOrderRejected: vi.fn(async () => true),
  notifyOrderPreparing: vi.fn(async () => true),
  notifyOrderReady: vi.fn(async () => true),
}))

import { POST as ordersPost } from '@/app/api/supabase/orders/route'

function postReq(body: unknown): NextRequest {
  return new NextRequest('https://x.test/api/supabase/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('orders POST — waiter attribution', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sbState2.log.length = 0
    sbState2.ordersById.clear()
  })

  it('waiter role + waiter_name → order created with source=waiter (no phone needed)', async () => {
    authMocks.getRequestRole.mockResolvedValue('waiter')
    const res = await ordersPost(postReq({
      customer_name: 'Table T6', order_type: 'dine-in', requested_time: 'ASAP',
      table_number: '6', waiter_name: 'Thando',
      items: [{ bar_item_id: 'B1', quantity: 1, station: 'bar' }],
    }))
    if (res.status !== 201) {
      const dbg = (await res.json()) as unknown
      process.stdout.write(`DBG status=${res.status} body=${JSON.stringify(dbg)}\n`)
    }
    expect(res.status).toBe(201)
    const inserts = sbState2.log.filter(l => l.op === 'INSERT' && l.table === 'orders')
    const payload = inserts[0]?.args?.[0] as Record<string, unknown>
    expect(payload.source).toBe('waiter')
    expect(payload.waiter_name).toBe('Thando')
  })

  it('anonymous submitter: waiter_name stripped → "Phone number is required" (public-order rule)', async () => {
    authMocks.getRequestRole.mockResolvedValue(null)
    const res = await ordersPost(postReq({
      customer_name: 'Table T6', order_type: 'dine-in', requested_time: 'ASAP',
      table_number: '6', waiter_name: 'Thando',
      items: [{ bar_item_id: 'B1', quantity: 1, station: 'bar' }],
    }))
    expect(res.status).toBe(400)
    const json = (await res.json()) as { error?: string }
    expect(json.error).toBe('Phone number is required')
    expect(sbState2.log.some(l => l.op === 'INSERT' && l.table === 'orders')).toBe(false)
  })
})
