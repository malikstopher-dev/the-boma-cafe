const QUEUE_KEY = 'boma_pending_orders'

interface PendingOrder {
  idempotency_key: string
  payload: Record<string, any>
  created_at: number
  retries: number
}

function getQueue(): PendingOrder[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveQueue(queue: PendingOrder[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  } catch { /* storage full — discard */ }
}

export function enqueueOrder(payload: Record<string, any>): string {
  const queue = getQueue()
  const idempotencyKey = payload.idempotency_key || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  queue.push({
    idempotency_key: idempotencyKey,
    payload: { ...payload, idempotency_key: idempotencyKey },
    created_at: Date.now(),
    retries: 0,
  })
  saveQueue(queue)
  return idempotencyKey
}

export function dequeueOrder(idempotencyKey: string): void {
  const queue = getQueue().filter(o => o.idempotency_key !== idempotencyKey)
  saveQueue(queue)
}

export function getQueueLength(): number {
  return getQueue().length
}

async function syncInternal(): Promise<{ synced: number; failed: number }> {
  const queue = getQueue()
  if (queue.length === 0) return { synced: 0, failed: 0 }

  let synced = 0
  let failed = 0

  for (const order of queue) {
    try {
      const res = await fetch('/api/supabase/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order.payload),
      })

      if (res.ok) {
        dequeueOrder(order.idempotency_key)
        synced++
      } else {
        order.retries++
        if (order.retries >= 5) {
          dequeueOrder(order.idempotency_key)
          failed++
        }
      }
    } catch {
      order.retries++
      if (order.retries >= 5) {
        dequeueOrder(order.idempotency_key)
        failed++
      }
    }
  }

  saveQueue(getQueue())
  return { synced, failed }
}

export const syncPendingOrders = syncInternal
export const processQueue = syncInternal
