import { getAdminClient } from '@/lib/supabase'

const WINDOW_MS = 60_000
const DEFAULT_MAX_REQUESTS = 10
const CLEANUP_INTERVAL = 5 * 60_000 // 5 minutes
const RETENTION_MS = 5 * 60_000 // Delete rows older than 5 min

const rateLimitStore = new Map<string, { count: number; resetAt: number }>()
let lastCleanup = Date.now()
let lastSupabaseCleanup = Date.now()

async function cleanupSupabase(): Promise<void> {
  const now = Date.now()
  if (now - lastSupabaseCleanup < CLEANUP_INTERVAL) return
  lastSupabaseCleanup = now
  const cutoff = new Date(now - RETENTION_MS).toISOString()
  try {
    const client = getAdminClient()
    await client.from('rate_limits').delete().lt('window_start', cutoff)
  } catch {
    // Silent — rate limit cleanup is best-effort
  }
}

function cleanupInMemory() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  const entries = Array.from(rateLimitStore.entries())
  for (const [key, entry] of entries) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key)
    }
  }
}

export async function checkRateLimit(key: string, maxRequests = DEFAULT_MAX_REQUESTS): Promise<boolean> {
  cleanupInMemory()
  await cleanupSupabase()

  const now = Date.now()
  const windowStart = new Date(Math.floor(now / WINDOW_MS) * WINDOW_MS).toISOString()

  try {
    const client = getAdminClient()
    // Attempt atomic increment
    const { data, error } = await client.rpc('increment_rate_limit', {
      p_key: key,
      p_window_start: windowStart,
      p_max: maxRequests,
    })

    if (error) {
      // Fallback to in-memory if DB call fails
      const memEntry = rateLimitStore.get(key)
      if (!memEntry || now > memEntry.resetAt) {
        rateLimitStore.set(key, { count: 1, resetAt: now + WINDOW_MS })
        return true
      }
      if (memEntry.count >= maxRequests) return false
      memEntry.count++
      return true
    }

    return data as boolean
  } catch {
    // Fallback to in-memory
    const memEntry = rateLimitStore.get(key)
    if (!memEntry || now > memEntry.resetAt) {
      rateLimitStore.set(key, { count: 1, resetAt: now + WINDOW_MS })
      return true
    }
    if (memEntry.count >= maxRequests) return false
    memEntry.count++
    return true
  }
}

export async function checkRateLimitByWaiter(waiterName: string): Promise<boolean> {
  return checkRateLimit(`waiter-order:${waiterName}`, 60)
}

// Backward-compat: callers use named imports { checkRateLimit } which is async
