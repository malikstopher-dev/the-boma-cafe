import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const state = vi.hoisted(() => ({
  callLog: [] as string[],
  currentStatus: 'in_progress',
  rpcResult: { data: [{ id: 'job-1', status: 'pending', outcome: 'inserted' }], error: null } as any,
}))

vi.mock('@/lib/auth/requireRole', () => ({
  requireAdmin: vi.fn(async () => null),
  requireAdminOrKitchen: vi.fn(async () => null),
}))
vi.mock('@/lib/booking/audit', () => ({ createAuditEntry: vi.fn(async () => undefined) }))
vi.mock('@/lib/admin/context', () => ({ getAdminContext: vi.fn(async () => null) }))
vi.mock('@/lib/admin/audit', () => ({ logAdminAction: vi.fn(async () => undefined) }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: vi.fn(async () => true) }))
vi.mock('@/lib/booking/availability', () => ({ releaseAvailability: vi.fn(async () => true) }))
vi.mock('../engine/reservations', () => ({ cancelReservationsForBooking: vi.fn(async () => 0) }))

vi.mock('@/lib/supabase', () => ({
  getAdminClient: () => {
    const makeChain = () => {
      let isUpdate = false
      const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        update: vi.fn(() => {
          state.callLog.push('UPDATE')
          isUpdate = true
          return chain
        }),
        single: vi.fn(async () => ({
          data: { status: state.currentStatus, venue_area_id: 'area-1', booking_date: '2026-08-30', booking_time: '18:00', duration_hours: 3 },
          error: null,
        })),
        then: (resolve: (value: unknown) => unknown) => resolve(
          isUpdate ? { data: [{ id: '11111111-1111-4111-8111-111111111111' }], error: null } : { data: null, error: null },
        ),
      }
      return chain
    }
    return {
      from: vi.fn(() => makeChain()),
      rpc: vi.fn(async (_name: string, _args: unknown) => {
        state.callLog.push('RPC')
        return state.rpcResult
      }),
    }
  },
}))

import { PATCH as changeStatus } from '@/app/api/booking/status/route'
import { PATCH as patchBooking } from '@/app/api/supabase/bookings/route'

const bookingId = '11111111-1111-4111-8111-111111111111'

function statusRequest(newStatus: string): NextRequest {
  return new NextRequest('https://x.test/api/booking/status', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ booking_id: bookingId, new_status: newStatus }),
  })
}

describe('booking reservation lifecycle enqueue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.callLog.length = 0
    state.currentStatus = 'in_progress'
    state.rpcResult = { data: [{ id: 'job-1', status: 'pending', outcome: 'inserted' }], error: null }
  })

  it('queues consume before the guarded completed transition', async () => {
    const response = await changeStatus(statusRequest('completed'))
    expect(response.status).toBe(200)
    expect(state.callLog).toEqual(['RPC', 'UPDATE'])
    expect(await response.json()).toMatchObject({ success: true, reservation_job_id: 'job-1' })
  })

  it('leaves booking status unchanged when enqueue fails', async () => {
    state.rpcResult = { data: null, error: { message: 'worker queue unavailable' } }
    const response = await changeStatus(statusRequest('completed'))
    expect(response.status).toBe(503)
    expect(state.callLog).toEqual(['RPC'])
  })

  it('accepts an already queued idempotent lifecycle intent', async () => {
    state.rpcResult = { data: [{ id: 'job-existing', status: 'pending', outcome: 'already_queued' }], error: null }
    const response = await changeStatus(statusRequest('completed'))
    expect(response.status).toBe(200)
    expect(state.callLog).toEqual(['RPC', 'UPDATE'])
    expect(await response.json()).toMatchObject({ reservation_job_id: 'job-existing' })
  })

  it('does not enqueue a lifecycle job for in-progress', async () => {
    state.currentStatus = 'confirmed'
    const response = await changeStatus(statusRequest('in_progress'))
    expect(response.status).toBe(200)
    expect(state.callLog).toEqual(['UPDATE'])
  })

  it('blocks the generic bookings PATCH from bypassing lifecycle authority', async () => {
    const request = new NextRequest(`https://x.test/api/supabase/bookings?id=${bookingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    })
    const response = await patchBooking(request)
    expect(response.status).toBe(400)
    expect((await response.json()).error).toContain('/api/booking/status')
    expect(state.callLog).toEqual([])
  })
})
