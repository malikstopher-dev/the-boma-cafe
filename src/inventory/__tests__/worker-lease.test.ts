import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockClient = { from: vi.fn() }
const logMocks = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}))

vi.mock('../../lib/supabase', () => ({ getAdminClient: () => mockClient }))
vi.mock('../../jobs/utils/logger', () => ({ logger: logMocks }))

import { executeJob } from '../../jobs/worker'
import { registerHandler } from '../../jobs/registry'
import { resolveStuckJob } from '../../jobs/scheduler'
import type { BackgroundJob } from '../../jobs/types'

function mutation(resultRows: unknown[]) {
  const calls = {
    update: null as Record<string, unknown> | null,
    eq: [] as Array<[string, unknown]>,
  }
  const chain = {
    update(payload: Record<string, unknown>) { calls.update = payload; return chain },
    eq(column: string, value: unknown) { calls.eq.push([column, value]); return chain },
    select: vi.fn(async () => ({ data: resultRows, error: null })),
  }
  return { chain, calls }
}

function job(): BackgroundJob {
  return {
    id: 'job-1',
    job_type: 'lease-test',
    status: 'pending',
    payload: {},
    result: null,
    error: null,
    idempotency_key: 'lease-test:1',
    priority: 0,
    retry_count: 0,
    max_retries: 3,
    scheduled_at: '2026-08-26T10:00:00.000Z',
    heartbeat_at: null,
    locked_by: null,
    lease_token: 'old-lease',
    created_at: '2026-08-26T10:00:00.000Z',
    started_at: null,
    completed_at: null,
  }
}

describe('background-job lease fencing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fences the final write with the lease acquired by this worker', async () => {
    const lock = mutation([{ id: 'job-1', lease_token: 'lease-new' }])
    const final = mutation([{ id: 'job-1' }])
    const queue = [lock.chain, final.chain]
    mockClient.from.mockImplementation(() => queue.shift())
    const handler = vi.fn(async () => ({ ok: true }))
    registerHandler('lease-test', handler)

    await executeJob(job())

    const acquiredLease = lock.calls.update?.lease_token
    expect(acquiredLease).toEqual(expect.any(String))
    expect(acquiredLease).not.toBe('old-lease')
    expect(final.calls.eq).toContainEqual(['status', 'processing'])
    expect(final.calls.eq).toContainEqual(['lease_token', acquiredLease])
    expect(final.calls.update).toMatchObject({ status: 'completed', result: { ok: true } })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('does not execute a handler when another worker already owns the row', async () => {
    const lock = mutation([])
    mockClient.from.mockReturnValue(lock.chain)
    const handler = vi.fn(async () => ({ ok: true }))
    registerHandler('lease-test', handler)

    await executeJob(job())

    expect(handler).not.toHaveBeenCalled()
    expect(mockClient.from).toHaveBeenCalledTimes(1)
  })

  it('scheduler recovery is conditional on the lease it observed', async () => {
    const reset = mutation([])
    mockClient.from.mockReturnValue(reset.chain)

    await resolveStuckJob({
      id: 'job-1',
      job_type: 'lease-test',
      retry_count: 0,
      max_retries: 3,
      heartbeat_at: '2026-08-26T09:00:00.000Z',
      status: 'processing',
      lease_token: 'observed-lease',
    })

    expect(reset.calls.eq).toContainEqual(['status', 'processing'])
    expect(reset.calls.eq).toContainEqual(['lease_token', 'observed-lease'])
    expect(reset.calls.update?.lease_token).toEqual(expect.any(String))
    expect(reset.calls.update?.lease_token).not.toBe('observed-lease')
    expect(logMocks.error).toHaveBeenCalledWith(
      'failed to reset stuck job',
      expect.objectContaining({ error: 'lease changed before scheduler update' }),
    )
  })
})
