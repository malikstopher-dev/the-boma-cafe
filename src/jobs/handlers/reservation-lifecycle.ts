import {
  processReservationLifecycle,
  type ReservationLifecycleAction,
} from '../../inventory/engine/reservations'
import { logger } from '../utils/logger'
import type { BackgroundJob } from '../types'

export interface ReservationLifecyclePayload {
  booking_id: string
  action: ReservationLifecycleAction
}

function isLifecycleAction(value: unknown): value is ReservationLifecycleAction {
  return value === 'reserve' || value === 'cancel' || value === 'consume'
}

export async function reservationLifecycleHandler(job: BackgroundJob): Promise<Record<string, unknown>> {
  const payload = job.payload as unknown as ReservationLifecyclePayload
  if (!payload?.booking_id) {
    throw new Error('reservation_lifecycle: booking_id is required')
  }
  if (!isLifecycleAction(payload.action)) {
    throw new Error('reservation_lifecycle: action must be reserve, cancel, or consume')
  }

  logger.info('reservation lifecycle handler started', {
    job_id: job.id,
    booking_id: payload.booking_id,
    action: payload.action,
  })

  const result = await processReservationLifecycle(payload.booking_id, payload.action)

  logger.info('reservation lifecycle handler completed', {
    job_id: job.id,
    booking_id: payload.booking_id,
    action: payload.action,
    expected: result.expected,
    processed: result.processed,
    failed: result.failed,
  })

  return { ...result }
}
