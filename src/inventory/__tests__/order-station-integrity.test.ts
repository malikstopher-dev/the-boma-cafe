// Ship: SYNC-1D prerequisites — server-authoritative station routing,
// station-scoped order reads, compensating rollback on split failure, and
// symmetric sibling grouping.
//
// Failure modes locked:
// 1. A client could previously label any item `station:"bar"` (or omit it)
//    to force misrouting — the server now derives station from item TYPE
//    (resolvable bar_items row -> bar; menu_categories.is_bar -> bar;
//    otherwise kitchen).
// 2. A kitchen/bar session could previously read ANY station's orders by
//    passing a different ?station= value — reads are now pinned per role.
// 3. A failed second-station insert previously left the first order committed
//    forever (partial state) — it is now deleted (compensating rollback).
// 4. Sibling lookup from the ROOT of a split returned [] (asymmetric).

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const authMocks = vi.hoisted(() => ({
  getRequestRole: vi.fn(),
}))

type LogEntry = { op: string; table?: string; args?: unknown[] }
const sbState = vi.hoisted(() => ({
  log: [] as LogEntry[],
  menuItems: new Map<string, Record<string, unknown>>(),
  barItems: new Map<string, Record<string, unknown>>(),
  ordersById: new Map<string, Record<string, unknown>>(),
  idempotencyExisting: null as Record<string, unknown> | null,
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
    const state = sbState
    const rec = (op: string, table: string | undefined, args?: unknown[]) => {
      state.log.push({ op, table, args })
    }

    type Meta = {
      __table?: string
      __sel?: string
      __eqs: unknown[]
      __in?: unknown[]
      __or?: string
      __neq?: unknown[]
      __updated?: boolean
      __deleted?: boolean
    }

    const resolveRead = async (m: Meta): Promise<unknown> => {
      if (m.__deleted) {
        const rid = String(m.__eqs[1] ?? '')
        state.ordersById.delete(rid)
        return { data: null, error: null }
      }
      if (m.__updated) {
        return { data: { id: m.__eqs[1] }, error: null }
      }
      if (m.__table === 'menu_items') {
        const ids = (m.__in?.[0] as string[]) ?? []
        const rows = ids
          .map(id => state.menuItems.get(id))
          .filter((r): r is Record<string, unknown> => !!r)
          .map(r => ({ ...r }))
        return { data: rows, error: null }
      }
      if (m.__table === 'bar_items') {
        const ids = (m.__in?.[0] as string[]) ?? []
        const rows = ids
          .map(id => state.barItems.get(id))
          .filter((r): r is Record<string, unknown> => !!r)
          .map(r => ({ ...r }))
        return { data: rows, error: null }
      }
      if (m.__table === 'orders') {
        // count-only head query (generateOrderRef): select('id',{count,head}) with no eq()
        if (m.__sel === 'id' && m.__eqs.length === 0) {
          return { data: [], count: state.ordersById.size, error: null }
        }
        if (m.__or) {
          const match = String(m.__or).match(/parent_order_id\.eq\.([^,]+),id\.eq\.(.+)/i)
          const groupId = match?.[1] ?? match?.[2] ?? ''
          const selfId = m.__neq?.[1]
          const rows = [...state.ordersById.entries()]
            .filter(([id, r]) => (id === groupId || r.parent_order_id === groupId) && id !== String(selfId))
            .map(([, r]) => ({ ...r }))
          return { data: rows, error: null }
        }
        if (m.__sel === '*' && m.__eqs.length >= 2 && m.__eqs[0] === 'idempotency_key') {
          return { data: state.idempotencyExisting, error: null }
        }
        if (m.__sel === 'id, parent_order_id') {
          const row = state.ordersById.get(String(m.__eqs[1]))
          if (!row) return { data: null, error: { message: 'not found' } }
          return { data: { ...row }, error: null }
        }
        if (m.__eqs.length >= 2 && m.__eqs[0] === 'idempotency_key') {
          return { data: state.idempotencyExisting, error: null }
        }
        if (m.__eqs.length >= 2 && m.__eqs[0] === 'order_ref') {
          for (const r of state.ordersById.values()) {
            if (r.order_ref === m.__eqs[1]) return { data: { ...r }, error: null }
          }
          return { data: null, error: null }
        }
        // Generic list read (station-scoped or unscoped)
        let rows = [...state.ordersById.values()].map(r => ({ ...r }))
        if (m.__eqs.length >= 2 && m.__eqs[0] === 'station') {
          rows = rows.filter(r => r.station === m.__eqs[1])
        }
        return { data: rows, count: rows.length, error: null }
      }
      return { data: null, error: null }
    }

    type Chain = {
      select: (...a: unknown[]) => Chain
      eq: (...a: unknown[]) => Chain
      neq: (...a: unknown[]) => Chain
      not: (...a: unknown[]) => Chain
      in: (...a: unknown[]) => Chain
      is: (...a: unknown[]) => Chain
      or: (...a: unknown[]) => Chain
      gte: (...a: unknown[]) => Chain
      lte: (...a: unknown[]) => Chain
      order: (...a: unknown[]) => Chain
      range: (...a: unknown[]) => Chain
      update: (p: Record<string, unknown>) => Chain
      delete: () => Chain
      insert: (
        rows: Array<Record<string, unknown>>,
      ) => {
        select: () => { single: () => Promise<unknown> }
        then: (
          onFulfilled?: (value: unknown) => unknown,
          onRejected?: (reason: unknown) => unknown,
        ) => Promise<unknown>
      }
      single: () => Promise<unknown>
      maybeSingle: () => Promise<unknown>
      then: (
        onFulfilled?: (value: unknown) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) => Promise<unknown>
    }

    const makeChain = (table?: string): Chain => {
      const m: Meta = { __table: table, __eqs: [] }
      const chain = {
        select: (...a: unknown[]) => {
          m.__sel = typeof a[0] === 'string' ? a[0] : '*'
          return chain
        },
        eq: (...a: unknown[]) => {
          m.__eqs.push(a[0], a[1])
          rec('EQ', table, [a[0], a[1]])
          return chain
        },
        neq: (...a: unknown[]) => {
          m.__neq = [a[0], a[1]]
          return chain
        },
        not: () => chain,
        in: (...a: unknown[]) => {
          m.__in = [a[1]]
          return chain
        },
        is: () => chain,
        or: (...a: unknown[]) => {
          m.__or = String(a[0])
          return chain
        },
        gte: () => chain,
        lte: () => chain,
        order: () => chain,
        range: () => chain,
        update: (p: Record<string, unknown>) => {
          rec('UPDATE', table, [p])
          m.__updated = true
          return chain
        },
        delete: () => {
          rec('DELETE', table)
          m.__deleted = true
          return chain
        },
        insert: (rows: Array<Record<string, unknown>>) => {
          rec('INSERT', table, rows)
          const execPromise = (async (): Promise<unknown> => {
            if (table === 'orders') {
              const row = rows[0] ?? {}
              const id = String(row.id ?? crypto.randomUUID())
              const full = {
                id,
                order_ref: row.order_ref ?? '20990101-001',
                parent_order_id: row.parent_order_id ?? null,
                station: row.station ?? null,
                items_json: row.items_json ?? '{}',
                status: row.status ?? 'pending',
              }
              state.ordersById.set(id, full)
              return { data: [full], error: null }
            }
            return { data: rows, error: null }
          })()
          // Supports `.insert(x).select().single()` chains AND direct await.
          // NOTE: like real supabase-js, `.single()` unwraps rows[0].
          return {
            select: () => ({
              single: () =>
                execPromise.then(r => {
                  const res = r as { data?: unknown; error?: unknown }
                  const row = Array.isArray(res.data) ? res.data[0] : res.data
                  return { data: row ?? null, error: res.error ?? null }
                }),
            }),
            then: (
              onFulfilled?: (value: unknown) => unknown,
              onRejected?: (reason: unknown) => unknown,
            ) => execPromise.then(onFulfilled, onRejected),
          }
        },
        single: async () => {
          rec('SINGLE', table, [m.__sel, ...m.__eqs])
          return resolveRead(m)
        },
        maybeSingle: async () => {
          rec('MAYBESINGLE', table, [m.__sel, ...m.__eqs])
          return resolveRead(m)
        },
        then: (
          onFulfilled?: (value: unknown) => unknown,
          onRejected?: (reason: unknown) => unknown,
        ) => resolveRead(m).then(onFulfilled, onRejected),
      }
      return chain as Chain
    }

    return {
      from: (table: string) => makeChain(table),
      rpc: async () => ({ data: null, error: null }),
    }
  },
}))

vi.mock('@/lib/notifications/push', () => ({
  notifyOrderCreated: vi.fn(async () => true),
  notifyOrderConfirmed: vi.fn(async () => true),
  notifyOrderRejected: vi.fn(async () => true),
  notifyOrderPreparing: vi.fn(async () => true),
  notifyOrderReady: vi.fn(async () => true),
}))

import { createOrder, splitAndCreateOrders, getSiblingOrders } from '@/lib/pos/orderService'
import { GET } from '@/app/api/supabase/orders/route'

const FOOD_ID = '11111111-1111-1111-1111-111111111111'
const COCKTAIL_ID = '22222222-2222-2222-2222-222222222222'
const BAR_ID = '33333333-3333-3333-3333-333333333333'

function seedCatalog() {
  sbState.menuItems.clear()
  sbState.barItems.clear()
  sbState.ordersById.clear()
  sbState.menuItems.set(FOOD_ID, {
    id: FOOD_ID,
    name: 'Burger',
    price: '50',
    sizes: null,
    add_ons: null,
    description: null,
    menu_categories: { is_bar: false },
  })
  sbState.menuItems.set(COCKTAIL_ID, {
    id: COCKTAIL_ID,
    name: 'Pina Colada',
    price: '70',
    sizes: null,
    add_ons: null,
    description: null,
    menu_categories: { is_bar: true },
  })
  sbState.barItems.set(BAR_ID, {
    id: BAR_ID,
    name: 'Castle Lager',
    single_price: 40,
    bottle: 55,
    glass_price: null,
    shot_price: null,
    price: null,
  })
}

function lastInsertPayload(): Record<string, unknown> | null {
  const inserts = sbState.log.filter(l => l.op === 'INSERT' && l.table === 'orders')
  const last = inserts[inserts.length - 1]
  if (!last) return null
  // rec() stores args = rows = [payload], so args[0] IS the payload.
  const row = last.args?.[0] as Record<string, unknown> | undefined
  return row ?? null
}

function parseEnriched(payload: Record<string, unknown> | null): Array<{ station: string; name: string }> {
  if (!payload) return []
  const parsed = JSON.parse(String(payload.items_json)) as { items?: Array<{ station: string; name: string }> }
  return parsed.items ?? []
}

function baseInput(items: unknown[], key?: string) {
  return {
    customer_name: 'Test',
    phone: '+27821234567',
    order_type: 'dine-in',
    table_number: '5',
    ...(key ? { idempotency_key: key } : {}),
    items,
  } as never
}

beforeEach(() => {
  vi.clearAllMocks()
  authMocks.getRequestRole.mockResolvedValue('admin')
  sbState.log.length = 0
  sbState.idempotencyExisting = null
  seedCatalog()
})

describe('server-side station derivation', () => {
  it('client cannot spoof a food item onto the bar', async () => {
    const res = await createOrder(baseInput([{ menu_item_id: FOOD_ID, quantity: 1, station: 'bar' }]))
    expect(res.error).toBeNull()
    const payload = lastInsertPayload()
    expect(payload?.station).toBe('kitchen')
    expect(parseEnriched(payload)[0]?.station).toBe('kitchen')
  })

  it('bar_item routes to bar even with NO client station', async () => {
    const res = await createOrder(baseInput([{ bar_item_id: BAR_ID, quantity: 2 }]))
    expect(res.error).toBeNull()
    expect(lastInsertPayload()?.station).toBe('bar')
  })

  it('client cannot spoof a bar_item into the kitchen', async () => {
    const res = await createOrder(baseInput([{ bar_item_id: BAR_ID, quantity: 1, station: 'kitchen' }]))
    expect(res.error).toBeNull()
    expect(lastInsertPayload()?.station).toBe('bar')
  })

  it('cocktail on the food menu (is_bar category) derives bar without any client station', async () => {
    const res = await createOrder(baseInput([{ menu_item_id: COCKTAIL_ID, quantity: 1 }]))
    expect(res.error).toBeNull()
    expect(lastInsertPayload()?.station).toBe('bar')
    expect(parseEnriched(lastInsertPayload())[0]?.name).toBe('Pina Colada')
  })
})

describe('mixed-cart split integrity', () => {
  it('splits by DERIVED stations; each part carries its own subtotal; child points at root', async () => {
    const res = await splitAndCreateOrders(
      baseInput(
        [
          { menu_item_id: FOOD_ID, quantity: 1, station: 'kitchen' },
          { bar_item_id: BAR_ID, quantity: 2 },
        ],
        'mix-1',
      ),
    )
    void res
    const inserts = sbState.log.filter(l => l.op === 'INSERT' && l.table === 'orders')
    expect(inserts).toHaveLength(2)

    const payloads = inserts.map(l => l.args?.[0] as Record<string, unknown>)
    const kitchen = payloads.find(p => p.station === 'kitchen')
    const bar = payloads.find(p => p.station === 'bar')
    expect(kitchen).toBeTruthy()
    expect(bar).toBeTruthy()

    expect(parseEnriched(kitchen ?? null).map(i => i.name)).toEqual(['Burger'])
    expect(parseEnriched(bar ?? null).map(i => i.name)).toEqual(['Castle Lager'])

    const kJson = JSON.parse(String(kitchen?.items_json)) as { items: Array<{ subtotal: number }> }
    const bJson = JSON.parse(String(bar?.items_json)) as { items: Array<{ subtotal: number }> }
    expect(kJson.items.reduce((s, i) => s + i.subtotal, 0)).toBe(50)
    expect(bJson.items.reduce((s, i) => s + i.subtotal, 0)).toBe(80)

    expect(kitchen?.parent_order_id).toBeFalsy()
    expect(bar?.parent_order_id).toBeTruthy()
  })

  it('second-station failure rolls back the first order — no partial state survives', async () => {
    // Deterministic second-part failure without touching insert machinery:
    // an absurdly expensive bar item makes ONLY the bar part exceed
    // MAX_TOTAL ('Invalid total'), while the kitchen part inserts normally.
    sbState.barItems.set(BAR_ID, {
      id: BAR_ID,
      name: 'Golden Bull',
      single_price: 200000,
      bottle: null,
      glass_price: null,
      shot_price: null,
      price: null,
    })

    const res = await splitAndCreateOrders(
      baseInput(
        [
          { menu_item_id: FOOD_ID, quantity: 1 },
          { bar_item_id: BAR_ID, quantity: 1 },
        ],
        'rollback-1',
      ),
    )

    expect(res.error).toContain('First order created')
    expect(res.error).toContain('rolled back')
    expect(res.orders).toHaveLength(0)

    const deletes = sbState.log.filter(l => l.op === 'DELETE' && l.table === 'orders')
    expect(deletes).toHaveLength(1)
    // Compensating delete removed the committed kitchen order.
    expect(sbState.ordersById.size).toBe(0)
  })
})

describe('symmetric sibling groups', () => {
  it('ROOT now sees its children (previously returned [])', async () => {
    const rootId = 'aaaaaaaa-0000-0000-0000-000000000001'
    const childId = 'aaaaaaaa-0000-0000-0000-000000000002'
    sbState.ordersById.set(rootId, { id: rootId, parent_order_id: null, order_ref: 'R' })
    sbState.ordersById.set(childId, { id: childId, parent_order_id: rootId, order_ref: 'C' })

    const siblings = await getSiblingOrders(rootId)
    expect(siblings.map(s => s.id)).toContain(childId)
    expect(siblings.map(s => s.id)).not.toContain(rootId)
  })

  it('CHILD still sees its siblings AND the root', async () => {
    const rootId = 'bbbbbbbb-0000-0000-0000-000000000001'
    const childId = 'bbbbbbbb-0000-0000-0000-000000000002'
    sbState.ordersById.set(rootId, { id: rootId, parent_order_id: null, order_ref: 'R' })
    sbState.ordersById.set(childId, { id: childId, parent_order_id: rootId, order_ref: 'C' })

    const siblings = await getSiblingOrders(childId)
    expect(siblings.map(s => s.id)).toContain(rootId)
  })
})

describe('station-scoped GET reads', () => {
  function getReq(query: string): NextRequest {
    return new NextRequest(`https://x.test/api/supabase/orders${query}`)
  }

  function appliedStationFilters(): unknown[] {
    return sbState.log
      .filter(l => l.op === 'EQ' && l.args?.[0] === 'station')
      .map(l => l.args?.[1])
  }

  it('kitchen session asking for ?station=bar is pinned to kitchen', async () => {
    authMocks.getRequestRole.mockResolvedValue('kitchen')
    await GET(getReq('?station=bar&limit=10'))
    const filters = appliedStationFilters()
    expect(filters).toEqual(['kitchen'])
  })

  it('bar session is pinned to bar even with no requested station', async () => {
    authMocks.getRequestRole.mockResolvedValue('bar')
    await GET(getReq('?limit=10'))
    expect(appliedStationFilters()).toEqual(['bar'])
  })

  it('admin may request any station explicitly', async () => {
    authMocks.getRequestRole.mockResolvedValue('admin')
    await GET(getReq('?station=bar&limit=10'))
    expect(appliedStationFilters()).toEqual(['bar'])

    sbState.log.length = 0
    await GET(getReq('?station=kitchen&limit=10'))
    expect(appliedStationFilters()).toEqual(['kitchen'])
  })

  it('unscoped admin list omits the station filter entirely', async () => {
    authMocks.getRequestRole.mockResolvedValue('admin')
    await GET(getReq('?limit=10'))
    expect(appliedStationFilters()).toEqual([])
  })
})
