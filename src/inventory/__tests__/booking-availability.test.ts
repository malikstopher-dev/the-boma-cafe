import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

type QueryResult = { data: any; error: { message: string } | null }

const state = vi.hoisted(() => ({
  calls: new Map<string, number>(),
  failTable: null as string | null,
  deleteCalled: false,
  updateCalled: false,
  from: vi.fn(),
}))

function nextResult(table: string): QueryResult {
  const call = (state.calls.get(table) || 0) + 1
  state.calls.set(table, call)
  if (state.failTable === table) return { data: null, error: { message: 'database unavailable' } }

  if (table === 'blocked_dates') {
    return { data: [{ venue_area_id: 'area-a', reason: 'Private event' }], error: null }
  }
  if (table === 'availability') {
    return { data: [{ id: 'hold-a', venue_area_id: 'area-a', guest_count: 20 }], error: null }
  }
  if (table === 'venue_areas' && call === 1) {
    return {
      data: { id: 'area-a', name: 'Area A', capacity_min: 1, capacity_max: 30 },
      error: null,
    }
  }
  if (table === 'venue_areas') {
    return {
      data: [
        { id: 'area-a', name: 'Area A', capacity_min: 1, capacity_max: 30 },
        { id: 'area-b', name: 'Area B', capacity_min: 1, capacity_max: 40 },
      ],
      error: null,
    }
  }
  return { data: [], error: null }
}

function queryChain(table: string) {
  const result = nextResult(table)
  const chain: any = {}
  for (const method of ['select', 'eq', 'lte', 'gte', 'lt', 'gt', 'neq', 'or']) {
    chain[method] = vi.fn(() => chain)
  }
  chain.order = vi.fn(async () => result)
  chain.single = vi.fn(async () => result)
  chain.delete = vi.fn(() => {
    state.deleteCalled = true
    return chain
  })
  chain.update = vi.fn(() => {
    state.updateCalled = true
    return chain
  })
  chain.then = (resolve: (value: QueryResult) => unknown) => Promise.resolve(result).then(resolve)
  return chain
}

vi.mock('@/lib/supabase', () => ({
  getAdminClient: () => ({ from: state.from }),
}))

import { checkAvailability, releaseAvailability } from '@/lib/booking/availability'
import { GET as availabilityGet } from '@/app/api/booking/availability/route'

beforeEach(() => {
  vi.clearAllMocks()
  state.calls.clear()
  state.failTable = null
  state.deleteCalled = false
  state.updateCalled = false
  state.from.mockImplementation((table: string) => queryChain(table))
})

describe('booking availability', () => {
  it('evaluates alternative areas independently of the requested area conflict', async () => {
    const result = await checkAvailability('area-a', '2026-09-10', '12:00', '15:00', 20)
    expect(result.is_available).toBe(false)
    expect(result.alternatives).toContainEqual({
      venue_area_id: 'area-b',
      name: 'Area B',
      capacity_max: 40,
      is_available: true,
    })
  })

  it('fails closed instead of returning available when a source query errors', async () => {
    state.failTable = 'blocked_dates'
    await expect(checkAvailability('area-a', '2026-09-10', '12:00', '15:00', 20))
      .rejects.toThrow('Failed to check blocked dates')

    state.calls.clear()
    const response = await availabilityGet(new NextRequest(
      'https://x.test/api/booking/availability?date=2026-09-10&start_time=12:00&end_time=15:00&guests=20&venue_area_id=area-a',
    ))
    expect(response.status).toBe(503)
  })

  it('deletes a hold on release instead of writing an invalid cancelled status', async () => {
    expect(await releaseAvailability('booking-1')).toBe(true)
    expect(state.deleteCalled).toBe(true)
    expect(state.updateCalled).toBe(false)
  })
})
