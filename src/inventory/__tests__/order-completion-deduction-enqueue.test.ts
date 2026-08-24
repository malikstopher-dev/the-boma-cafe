// Ship: SYNC durability — order completion must never commit unless the
// inventory deduction job is durably queued first.
//
// Failure mode being locked: previously the deduction job was enqueued AFTER
// the terminal 'completed' commit; an enqueue failure was logged and the PATCH
// still returned success — the deduction intent was silently lost forever
// because 'completed' cannot be re-transitioned. The fix enqueues BEFORE the
// compare-and-set status update: an enqueue failure aborts completion (503),
// leaving the order in its previous (retryable) status.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const authMocks = vi.hoisted(() => ({
  getRequestRole: vi.fn(),
}))

const sbState = vi.hoisted(() => ({
  callLog: [] as string[],
  lastRpcArgs: null as unknown,
  rpcImpl: null as null | (() => Promise<unknown>),
  fetchOrder: {
    data: { status: 'ready', order_type: 'dine-in', payment_status: 'paid', source: 'online' },
    error: null,
  },
  casResult: { data: { id: 'order-1' }, error: null },
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
    type Chain = {
      select: (s: string) => Chain
      eq: (..._a: unknown[]) => Chain
      neq: (..._a: unknown[]) => Chain
      not: (..._a: unknown[]) => Chain
      in: (..._a: unknown[]) => Chain
      is: (..._a: unknown[]) => Chain
      order: (..._a: unknown[]) => Chain
      range: (..._a: unknown[]) => Chain
      update: (payload: Record<string, unknown>) => Chain
      insert: () => Promise<{ error: null }>
      single: () => Promise<unknown>
      maybeSingle: () => Promise<unknown>
    }
    const makeChain = (): Chain => {
      let sel = ''
      let didUpdate = false
      const resolve = async (): Promise<unknown> => {
        if (didUpdate) {
          state.callLog.push('CAS')
          return state.casResult
        }
        if (sel.includes('status, order_type')) {
          state.callLog.push('FETCH')
          return state.fetchOrder
        }
        if (sel.includes('parent_order_id')) {
          state.callLog.push('SIBLING')
          return { data: { parent_order_id: null }, error: null }
        }
        if (sel.includes('order_ref')) {
          state.callLog.push('REF')
          return { data: { order_ref: '20260825-001' }, error: null }
        }
        return { data: null, error: null }
      }
      const chain: Chain = {
        select: (s: string) => {
          sel = s
          return chain
        },
        eq: () => chain,
        neq: () => chain,
        not: () => chain,
        in: () => chain,
        is: () => chain,
        order: () => chain,
        range: () => chain,
        update: (_payload: Record<string, unknown>) => {
          state.callLog.push('UPDATE')
          didUpdate = true
          return chain
        },
        insert: () => {
          state.callLog.push('INSERT')
          return Promise.resolve({ error: null })
        },
        single: resolve,
        maybeSingle: resolve,
      }
      return chain
    }
    return {
      from: (_table: string) => makeChain(),
      rpc: async (name: string, args: unknown) => {
        state.callLog.push(`RPC:${name}`)
        state.lastRpcArgs = args
        if (state.rpcImpl) return state.rpcImpl()
        return { data: [{ id: 'job-1', status: 'pending', outcome: 'inserted' }], error: null }
      },
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

import { PATCH } from '@/app/api/supabase/orders/route'
import { notifyOrderReady } from '@/lib/notifications/push'

function patchReq(body: Record<string, unknown>): NextRequest {
  return new NextRequest('https://x.test/api/supabase/orders?id=order-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function resetScenario(currentStatus: string) {
  sbState.callLog.length = 0
  sbState.lastRpcArgs = null
  sbState.rpcImpl = null
  sbState.fetchOrder.data = {
    status: currentStatus,
    order_type: 'dine-in',
    payment_status: 'paid',
    source: 'online',
  }
  sbState.casResult = { data: { id: 'order-1' }, error: null }
}

describe('order completion durability — deduction enqueued before terminal commit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMocks.getRequestRole.mockResolvedValue('admin')
    resetScenario('ready')
  })

  it('happy path: enqueues order_deduction BEFORE the status update, exactly one enqueue', async () => {
    const res = await PATCH(patchReq({ status: 'completed' }))
    const json = (await res.json()) as { success?: boolean }

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)

    const updates = sbState.callLog.filter(l => l === 'UPDATE')
    const enqueues = sbState.callLog.filter(l => l.startsWith('RPC:enqueue_background_job'))
    expect(updates).toHaveLength(1)
    expect(enqueues).toHaveLength(1)
    expect(sbState.callLog.indexOf('RPC:enqueue_background_job')).toBeLessThan(
      sbState.callLog.indexOf('UPDATE'),
    )

    const args = sbState.lastRpcArgs as Record<string, unknown>
    expect(args['p_job_type']).toBe('order_deduction')
    expect(args['p_idempotency_key']).toBe('order_deduction:order-1')
    expect(args['p_max_retries']).toBe(3)
  })

  it('enqueue RPC error → completion aborted with 503 and NO status update (intent not silently lost)', async () => {
    sbState.rpcImpl = async () => ({ data: null, error: { message: 'connection reset' } })

    const res = await PATCH(patchReq({ status: 'completed' }))
    const json = (await res.json()) as { error?: string }

    expect(res.status).toBe(503)
    expect(json.error).toContain('inventory deduction')
    expect(sbState.callLog).not.toContain('UPDATE')
    expect(sbState.callLog).not.toContain('CAS')
    expect(sbState.callLog.filter(l => l.startsWith('RPC:enqueue_background_job'))).toHaveLength(1)
  })

  it('enqueue RPC throwing → completion aborted with 503 and NO status update', async () => {
    sbState.rpcImpl = async () => {
      throw new Error('fetch failed')
    }

    const res = await PATCH(patchReq({ status: 'completed' }))
    const json = (await res.json()) as { error?: string }

    expect(res.status).toBe(503)
    expect(json.error).toBeTruthy()
    expect(sbState.callLog).not.toContain('UPDATE')
  })

  it('non-completion transitions do not touch the enqueue RPC at all', async () => {
    resetScenario('confirmed')

    const res = await PATCH(patchReq({ status: 'preparing' }))
    const json = (await res.json()) as { success?: boolean }

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(sbState.callLog.some(l => l.startsWith('RPC:'))).toBe(false)
    expect(sbState.callLog).toContain('UPDATE')
  })

  it('E1-4 non-blocking precedent intact: push-notification failure does not fail the transition', async () => {
    resetScenario('preparing')
    ;(notifyOrderReady as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('fcm down'))

    const res = await PATCH(patchReq({ status: 'ready' }))
    const json = (await res.json()) as { success?: boolean }

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(notifyOrderReady).toHaveBeenCalledOnce()
  })

  it('concurrent-completion convergence: already_queued outcome still completes normally', async () => {
    sbState.rpcImpl = async () => ({
      data: [{ id: 'job-1', status: 'pending', outcome: 'already_queued' }],
      error: null,
    })

    const res = await PATCH(patchReq({ status: 'completed' }))
    const json = (await res.json()) as { success?: boolean }

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(sbState.callLog).toContain('UPDATE')
  })
})
