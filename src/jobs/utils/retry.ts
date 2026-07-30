const MAX_BACKOFF_MS = 14400000 // 4 hours
const BASE_INTERVAL_MS = 60000   // 1 minute

export function calculateBackoffMs(retryCount: number): number {
  const delay = Math.pow(2, retryCount) * BASE_INTERVAL_MS
  return Math.min(delay, MAX_BACKOFF_MS)
}

export function calculateScheduledAt(retryCount: number): Date {
  const backoffMs = calculateBackoffMs(retryCount)
  return new Date(Date.now() + backoffMs)
}
