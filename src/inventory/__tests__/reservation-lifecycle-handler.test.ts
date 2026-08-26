import { beforeEach, describe, expect, it, vi } from 'vitest'

const lifecycleMocks = vi.hoisted(() => ({
  process: vi.fn(),
}))

vi.mock('../engine/reservations', () => ({
  processReservationLifecycle: lifecycleMocks.process,
}))

import { reservationLifecycleHandler } from '../../jobs/handlers/reservation-lifecycle'
import { registerHandler, getHandler } from '../../jobs/registry'
import { serializeError } from '../../jobs/worker'
import type { BackgroundJob } from '../../jobs/types'

function makeJob(payload: Record<string, unknown> = { booking_id: 'booking-1', action: 'consume' }): BackgroundJob {
  const now = new Date().toISOString()
  return {
    id: 'job-1',
    job_type: 'reservation_lifecycle',
    status: 'pending',
    payload,
    result: null,
    error: null,
    idempotency_key: 'reservation_lifecycle:consume:booking-1',
    priority: 0,
    retry_count: 0,
    max_retries: 5,
    scheduled_at: now,
    heartbeat_at: null,
    locked_by: null,
    created_at: now,
    started_at: null,
    completed_at: null,
  }
}

describe('reservationLifecycleHandler', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns exact expected, processed, and failed counts', async () => {
    lifecycleMocks.process.mockResolvedValue({
      action: 'consume', booking_id: 'booking-1', expected: 3, processed: 3, failed: 0, failures: [],
    })

    await expect(reservationLifecycleHandler(makeJob())).resolves.toEqual({
      action: 'consume', booking_id: 'booking-1', expected: 3, processed: 3, failed: 0, failures: [],
    })
    expect(lifecycleMocks.process).toHaveBeenCalledWith('booking-1', 'consume')
  })

  it('propagates incomplete lifecycle failures for worker retry/dead-letter', async () => {
    const error = Object.assign(new Error('1/2 processed'), {
      name: 'ReservationLifecycleError',
      details: { action: 'consume', booking_id: 'booking-1', expected: 2, processed: 1, failed: 1 },
    })
    lifecycleMocks.process.mockRejectedValue(error)

    await expect(reservationLifecycleHandler(makeJob())).rejects.toBe(error)
  })

  it('rejects missing booking ids and invalid actions before processing', async () => {
    await expect(reservationLifecycleHandler(makeJob({ action: 'consume' })))
      .rejects.toThrow('booking_id is required')
    await expect(reservationLifecycleHandler(makeJob({ booking_id: 'booking-1', action: 'refund' })))
      .rejects.toThrow('action must be reserve, cancel, or consume')
    expect(lifecycleMocks.process).not.toHaveBeenCalled()
  })

  it('preserves structured failure counts in the worker error payload', () => {
    const details = { action: 'consume', booking_id: 'booking-1', expected: 2, processed: 1, failed: 1 }
    const error = Object.assign(new Error('partial reservation consumption'), { details })
    expect(serializeError(error, 2)).toMatchObject({
      message: 'partial reservation consumption',
      retry_count: 2,
      details,
    })
  })

  it('is registered under the durable reservation_lifecycle type', () => {
    registerHandler('reservation_lifecycle', reservationLifecycleHandler)
    expect(getHandler('reservation_lifecycle')).toBe(reservationLifecycleHandler)
  })
})
