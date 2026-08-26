import { deductOrderItems, syncOrderItems } from '../../inventory/engine/order-items'
import { isOrderStation, type OrderStation } from '../../inventory/lib/station-location'
import { logger } from '../utils/logger'
import type { BackgroundJob } from '../types'

export interface OrderDeductionPayload {
  order_id: string
  station: OrderStation
  location_id: string
}

/**
 * E1-4: completed-order inventory deduction, executed by the background
 * worker instead of inline in the orders PATCH route.
 *
 * Reuses the F2/F3 deduction pipeline unchanged:
 *   - primary path: the atomic deduct_order_items RPC (single transaction,
 *     F3 attribution columns, insufficient-stock rule, audit, balance cache)
 *   - fallback: the retry-safe engine loop (deductOrderItems falls back
 *     internally when the RPC is unavailable)
 *
 * Idempotency / retry semantics:
 *   - location_id is resolved from the order station before enqueue and is
 *     immutable in the job payload, so retries cannot drift to another area.
 *   - missing/invalid station or location is a hard handler failure and stays
 *     visible through retry/dead_letter; it is never a successful zero result.
 *   - already-deducted orders return { deducted: 0, skipped: N } -> the job
 *     completes successfully; the enqueue idempotency key
 *     (order_deduction:{order_id}) prevents duplicate job rows.
 *   - any failure (e.g. insufficient stock, transient DB error) throws and
 *     the worker's retry/backoff/dead_letter machinery takes over.
 */
export async function orderDeductionHandler(job: BackgroundJob): Promise<Record<string, unknown>> {
  const payload = job.payload as unknown as OrderDeductionPayload

  if (!payload?.order_id) {
    throw new Error('order_deduction: order_id is required')
  }
  if (!payload.location_id) {
    throw new Error('order_deduction: location_id is required')
  }
  if (!isOrderStation(payload.station)) {
    throw new Error('order_deduction: station must be kitchen or bar')
  }

  logger.info('order deduction handler started', {
    job_id: job.id,
    order_id: payload.order_id,
    location_id: payload.location_id ?? null,
  })

  await syncOrderItems(payload.order_id)
  const result = await deductOrderItems(payload.order_id, payload.location_id)

  logger.info('order deduction handler completed', {
    job_id: job.id,
    order_id: payload.order_id,
    deducted: result.deducted,
    skipped: result.skipped,
  })

  return { deducted: result.deducted, skipped: result.skipped }
}
