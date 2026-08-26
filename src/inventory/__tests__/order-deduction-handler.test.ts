import { describe, it, expect, vi, beforeEach } from 'vitest'

const engineMocks = vi.hoisted(() => ({
  sync: vi.fn(),
  deduct: vi.fn(),
}))

vi.mock('../../inventory/engine/order-items', () => ({
  syncOrderItems: engineMocks.sync,
  deductOrderItems: engineMocks.deduct,
}))

import { orderDeductionHandler } from '../../jobs/handlers/order-deduction'
import { registerHandler, getHandler } from '../../jobs/registry'
import type { BackgroundJob } from '../../jobs/types'

function makeJob(overrides: Partial<BackgroundJob> = {}): BackgroundJob {
  return {
    id: 'job-1',
    job_type: 'order_deduction',
    status: 'pending',
    payload: { order_id: 'order-1', station: 'kitchen', location_id: 'loc-kitchen' },
    result: null,
    error: null,
    idempotency_key: 'order_deduction:order-1',
    priority: 0,
    retry_count: 0,
    max_retries: 3,
    scheduled_at: new Date().toISOString(),
    heartbeat_at: null,
    locked_by: null,
    created_at: new Date().toISOString(),
    started_at: null,
    completed_at: null,
    ...overrides,
  }
}

describe('orderDeductionHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('syncs and deducts using the durable station location', async () => {
    engineMocks.sync.mockResolvedValue({ order_id: 'order-1', status: 'completed', items: [] })
    engineMocks.deduct.mockResolvedValue({ deducted: 2, skipped: 0 })

    const result = await orderDeductionHandler(makeJob())

    expect(engineMocks.sync).toHaveBeenCalledWith('order-1')
    expect(engineMocks.deduct).toHaveBeenCalledWith('order-1', 'loc-kitchen')
    expect(result).toEqual({ deducted: 2, skipped: 0 })
  })

  it('honors location_id: syncs then deducts at that location (no autoDeduct)', async () => {
    engineMocks.sync.mockResolvedValue({ order_id: 'order-1', status: 'completed', items: [] })
    engineMocks.deduct.mockResolvedValue({ deducted: 1, skipped: 1 })

    const job = makeJob({ payload: { order_id: 'order-1', station: 'bar', location_id: 'loc-9' } })
    const result = await orderDeductionHandler(job)

    expect(engineMocks.sync).toHaveBeenCalledTimes(1)
    expect(engineMocks.sync).toHaveBeenCalledWith('order-1')
    expect(engineMocks.deduct).toHaveBeenCalledTimes(1)
    expect(engineMocks.deduct).toHaveBeenCalledWith('order-1', 'loc-9')
    expect(result).toEqual({ deducted: 1, skipped: 1 })
  })

  it('already-deducted orders (0 deducted, N skipped) complete successfully', async () => {
    engineMocks.sync.mockResolvedValue({ order_id: 'order-1', status: 'completed', items: [] })
    engineMocks.deduct.mockResolvedValue({ deducted: 0, skipped: 2 })

    await expect(orderDeductionHandler(makeJob())).resolves.toEqual({ deducted: 0, skipped: 2 })
  })

  it('throws when order_id is missing from the payload (worker retries/dead-letters)', async () => {
    const job = makeJob({ payload: {} })
    await expect(orderDeductionHandler(job)).rejects.toThrow('order_deduction: order_id is required')
    expect(engineMocks.sync).not.toHaveBeenCalled()
  })

  it('throws when location_id is missing so the worker retries/dead-letters visibly', async () => {
    const job = makeJob({ payload: { order_id: 'order-1', station: 'kitchen' } })
    await expect(orderDeductionHandler(job)).rejects.toThrow('order_deduction: location_id is required')
    expect(engineMocks.sync).not.toHaveBeenCalled()
  })

  it('throws when the durable station is invalid', async () => {
    const job = makeJob({ payload: { order_id: 'order-1', station: 'expo', location_id: 'loc-1' } })
    await expect(orderDeductionHandler(job)).rejects.toThrow('station must be kitchen or bar')
    expect(engineMocks.sync).not.toHaveBeenCalled()
  })

  it('propagates engine failures (e.g. insufficient stock) for the worker to retry', async () => {
    engineMocks.sync.mockResolvedValue({ order_id: 'order-1', status: 'completed', items: [] })
    engineMocks.deduct.mockRejectedValue(new Error('Insufficient stock for product X'))

    await expect(orderDeductionHandler(makeJob())).rejects.toThrow('Insufficient stock for product X')
  })

  it('is registered under the order_deduction job type', () => {
    registerHandler('order_deduction', orderDeductionHandler)
    expect(getHandler('order_deduction')).toBe(orderDeductionHandler)
  })
})
