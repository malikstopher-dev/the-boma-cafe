export interface RealtimeSignal {
  id: string
  event_name: string
  table_name: string
  entity_id: string | null
  created_at: string
}

export interface SignalCursor {
  accept(id: string | number | null | undefined): boolean
  readonly lastId: string
}

/**
 * Keeps a bounded event-ID history so a reconnect/catch-up overlap cannot
 * refresh a client twice for the same invalidation signal.
 */
export function createSignalCursor(maxSeen = 500): SignalCursor {
  let lastId = '0'
  const seen = new Set<string>()
  const order: string[] = []

  return {
    accept(value) {
      if (value === null || value === undefined) return false
      const id = String(value)
      if (!/^\d+$/.test(id) || seen.has(id)) return false

      seen.add(id)
      order.push(id)
      if (order.length > maxSeen) {
        const oldest = order.shift()
        if (oldest) seen.delete(oldest)
      }
      if (BigInt(id) > BigInt(lastId)) lastId = id
      return true
    },
    get lastId() {
      return lastId
    },
  }
}
