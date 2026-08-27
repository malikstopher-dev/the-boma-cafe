const QUEUE_KEY = 'boma_pending_orders'
export const QUEUE_CHANGED_EVENT = 'boma:offline-queue-changed'

export type PendingOrderStatus = 'pending' | 'failed'

export interface PendingOrder {
  idempotency_key: string
  payload: Record<string, unknown>
  created_at: number
  updated_at: number
  retries: number
  status: PendingOrderStatus
  last_error: string | null
  last_http_status: number | null
}

function notifyQueueChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(QUEUE_CHANGED_EVENT))
}

function normalizeQueue(value: unknown): PendingOrder[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item): PendingOrder[] => {
    if (!item || typeof item !== 'object') return []
    const row = item as Partial<PendingOrder>
    if (!row.idempotency_key || !row.payload || typeof row.payload !== 'object') return []
    return [{
      idempotency_key: row.idempotency_key,
      payload: row.payload,
      created_at: Number(row.created_at) || Date.now(),
      updated_at: Number(row.updated_at) || Number(row.created_at) || Date.now(),
      retries: Number(row.retries) || 0,
      status: row.status === 'failed' ? 'failed' : 'pending',
      last_error: row.last_error ?? null,
      last_http_status: row.last_http_status ?? null,
    }]
  })
}

export function getPendingOrders(): PendingOrder[] {
  if (typeof localStorage === 'undefined') return []
  const raw = localStorage.getItem(QUEUE_KEY)
  if (!raw) return []
  try {
    return normalizeQueue(JSON.parse(raw))
  } catch {
    throw new Error('The saved offline-order queue is unreadable. Clear it or contact a manager before retrying.')
  }
}

function saveQueue(queue: PendingOrder[]): void {
  if (typeof localStorage === 'undefined') throw new Error('Offline storage is unavailable in this browser.')
  const serialized = JSON.stringify(queue)
  localStorage.setItem(QUEUE_KEY, serialized)
  if (localStorage.getItem(QUEUE_KEY) !== serialized) {
    throw new Error('The offline order could not be confirmed in browser storage.')
  }
  notifyQueueChanged()
}

export function enqueueOrder(payload: Record<string, unknown>): string {
  const queue = getPendingOrders()
  const idempotencyKey = typeof payload.idempotency_key === 'string' && payload.idempotency_key
    ? payload.idempotency_key
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  if (queue.some(order => order.idempotency_key === idempotencyKey)) return idempotencyKey

  const now = Date.now()
  queue.push({
    idempotency_key: idempotencyKey,
    payload: { ...payload, idempotency_key: idempotencyKey },
    created_at: now,
    updated_at: now,
    retries: 0,
    status: 'pending',
    last_error: null,
    last_http_status: null,
  })
  saveQueue(queue)
  return idempotencyKey
}

export function dequeueOrder(idempotencyKey: string): void {
  saveQueue(getPendingOrders().filter(order => order.idempotency_key !== idempotencyKey))
}

export function clearOrderQueue(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(QUEUE_KEY)
  notifyQueueChanged()
}

export function retryOrder(idempotencyKey: string): void {
  const queue = getPendingOrders().map(order => order.idempotency_key === idempotencyKey
    ? { ...order, status: 'pending' as const, last_error: null, last_http_status: null, updated_at: Date.now() }
    : order)
  saveQueue(queue)
}

export function getQueueLength(): number {
  return getPendingOrders().length
}

async function responseMessage(response: Response): Promise<string> {
  try {
    const body = await response.json()
    return body?.error?.message ?? body?.error ?? `Order sync failed (${response.status})`
  } catch {
    return `Order sync failed (${response.status})`
  }
}

async function syncInternal(): Promise<{ synced: number; pending: number; failed: number }> {
  const queue = getPendingOrders()
  if (queue.length === 0) return { synced: 0, pending: 0, failed: 0 }

  let synced = 0
  for (let index = 0; index < queue.length; index++) {
    const order = queue[index]
    if (!order || order.status === 'failed') continue

    try {
      const response = await fetch('/api/supabase/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order.payload),
      })

      if (response.ok) {
        queue.splice(index, 1)
        index--
        synced++
        saveQueue(queue)
        continue
      }

      const message = await responseMessage(response)
      order.retries++
      order.updated_at = Date.now()
      order.last_error = message
      order.last_http_status = response.status
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        order.status = 'failed'
      }
      saveQueue(queue)
    } catch (error) {
      order.retries++
      order.updated_at = Date.now()
      order.last_error = error instanceof Error ? error.message : 'Network unavailable'
      order.last_http_status = null
      saveQueue(queue)
    }
  }

  return {
    synced,
    pending: queue.filter(order => order.status === 'pending').length,
    failed: queue.filter(order => order.status === 'failed').length,
  }
}

export const syncPendingOrders = syncInternal
export const processQueue = syncInternal
