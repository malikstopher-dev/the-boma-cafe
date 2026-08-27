const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type ManualJob = {
  jobType: 'order_deduction' | 'reservation_lifecycle'
  payload: Record<string, unknown>
  idempotencyKey: string
  priority: number
  maxRetries: number
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: string[]): boolean {
  return Object.keys(value).every(key => allowed.includes(key))
}

export function parseManualBackgroundJob(value: unknown): ManualJob | null {
  if (!isObject(value) || !hasOnlyKeys(value, ['job_type', 'payload', 'priority', 'max_retries'])) return null
  if (!isObject(value.payload)) return null

  const priority = value.priority === undefined ? 0 : Number(value.priority)
  const maxRetries = value.max_retries === undefined ? 3 : Number(value.max_retries)
  if (!Number.isInteger(priority) || priority < -10 || priority > 10) return null
  if (!Number.isInteger(maxRetries) || maxRetries < 1 || maxRetries > 10) return null

  if (value.job_type === 'order_deduction') {
    if (!hasOnlyKeys(value.payload, ['order_id', 'station', 'location_id'])) return null
    const { order_id: orderId, station, location_id: locationId } = value.payload
    if (typeof orderId !== 'string' || !UUID_PATTERN.test(orderId)) return null
    if (station !== 'kitchen' && station !== 'bar') return null
    if (typeof locationId !== 'string' || !UUID_PATTERN.test(locationId)) return null
    return {
      jobType: 'order_deduction',
      payload: { order_id: orderId, station, location_id: locationId },
      idempotencyKey: `order_deduction:${orderId}`,
      priority,
      maxRetries,
    }
  }

  if (value.job_type === 'reservation_lifecycle') {
    if (!hasOnlyKeys(value.payload, ['booking_id', 'action'])) return null
    const { booking_id: bookingId, action } = value.payload
    if (typeof bookingId !== 'string' || !UUID_PATTERN.test(bookingId)) return null
    if (action !== 'reserve' && action !== 'cancel' && action !== 'consume') return null
    return {
      jobType: 'reservation_lifecycle',
      payload: { booking_id: bookingId, action },
      idempotencyKey: `reservation_lifecycle:${action}:${bookingId}`,
      priority,
      maxRetries,
    }
  }

  return null
}

function numberField(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

export function redactBackgroundJob(row: Record<string, unknown>): Record<string, unknown> {
  const result = isObject(row.result) ? row.result : null
  let safeResult: Record<string, unknown> | null = null

  if (result && row.job_type === 'reservation_lifecycle') {
    safeResult = {
      expected: numberField(result.expected) ?? 0,
      processed: numberField(result.processed) ?? 0,
      failed: numberField(result.failed) ?? 0,
    }
  } else if (result && row.job_type === 'order_deduction') {
    safeResult = {
      deducted: numberField(result.deducted) ?? 0,
      skipped: numberField(result.skipped) ?? 0,
    }
  } else if (result) {
    safeResult = { completed: true }
  }

  return {
    id: row.id,
    job_type: row.job_type,
    status: row.status,
    result: safeResult,
    error: row.error ? { message: 'Job failed' } : null,
    priority: row.priority,
    retry_count: row.retry_count,
    max_retries: row.max_retries,
    scheduled_at: row.scheduled_at,
    heartbeat_at: row.heartbeat_at,
    created_at: row.created_at,
    started_at: row.started_at,
    completed_at: row.completed_at,
  }
}
