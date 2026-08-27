// Waiter live order status (E1-2).
//
// Consumes the E1-1 realtime signal table (public.realtime_events) on
// the SAME transport (Supabase Realtime postgres_changes) and filter
// convention as src/inventory/lib/use-realtime-refresh.ts (unquoted
// in-list values — double-quoted values silently match nothing,
// verified live 2026-08-15).
//
// The waiter PWA needs the EVENT PAYLOAD (event_name + entity_id) to
// apply a status change immediately (and to ignore events for orders
// it does not track), so this module is a payload-carrying sibling of
// the admin refresh hook — not a second realtime framework.

import { createBrowserClient } from '@/lib/supabase'
import { createLeadingDebouncer } from './realtime-debounce'

/** Order status events the waiter PWA reacts to (E1-2). */
export const ORDER_LIVE_EVENTS = [
  'order.confirmed',
  'order.preparing',
  'order.ready',
  'order.completed',
  'order.cancelled',
  'order.rejected',
] as const

/** All order events board surfaces refetch on (E1-5): creates + status changes. */
export const ORDER_BOARD_EVENTS = [
  'order.created',
  'order.confirmed',
  'order.preparing',
  'order.ready',
  'order.completed',
  'order.cancelled',
  'order.rejected',
] as const

/** Contract mapping: realtime event -> order status shown to the waiter. */
export function eventToOrderStatus(eventName: string): string | null {
  switch (eventName) {
    case 'order.confirmed':
      return 'confirmed'
    case 'order.preparing':
      return 'preparing'
    case 'order.ready':
      return 'ready'
    // Contract: served (and completed) emit order.completed. The waiter
    // renders SERVED for a terminal kitchen/bar event; the follow-up
    // refetch carries the authoritative status.
    case 'order.completed':
      return 'served'
    case 'order.cancelled':
      return 'cancelled'
    case 'order.rejected':
      return 'rejected'
    default:
      return null
  }
}

/** Apply one realtime event to an id -> status map (immutable). */
export function applyOrderEventToMap(
  map: Record<string, string>,
  eventName: string,
  entityId: string | null,
): Record<string, string> {
  if (!entityId) return map
  const status = eventToOrderStatus(eventName)
  if (!status) return map
  if (map[entityId] === status) return map
  return { ...map, [entityId]: status }
}

/** Rebuild the id -> status map for tracked orders from a fetch (fallback path). */
export function buildOrderStatusMap(
  tracked: { id?: string }[],
  fetched: { id: string; status: string }[],
  fallback = 'preparing',
): Record<string, string> {
  const map: Record<string, string> = {}
  for (const t of tracked) {
    if (!t.id) continue
    const found = fetched.find((o) => o.id === t.id)
    map[t.id] = found?.status ?? fallback
  }
  return map
}

const activeChannels = new Set<string>()

export interface OrderStatusSubscription {
  subscribed: boolean
  unsubscribe: () => void
}

export interface SubscribeToOrderEventsOptions {
  /** Unique per page, e.g. 'e1-waiter-done' */
  channel: string
  /** Immediate per-event callback with the signal payload. */
  onEvent?: (eventName: string, entityId: string | null) => void
  /** Debounced refetch callback (leading-edge, same as the E1-1 hook). */
  onChange?: () => void
  events?: readonly string[]
  debounceMs?: number
  enabled?: boolean
  /** Injectable for tests. */
  getSupabase?: () => any
}

export function subscribeToOrderEvents(options: SubscribeToOrderEventsOptions): OrderStatusSubscription {
  const {
    channel,
    onEvent,
    onChange,
    events = ORDER_LIVE_EVENTS,
    debounceMs = 2000,
    enabled = true,
    getSupabase,
  } = options

  if (!enabled || events.length === 0) {
    return { subscribed: false, unsubscribe: () => {} }
  }

  if (activeChannels.has(channel)) {
    console.warn(`[realtime] channel "${channel}" already active — skipping duplicate subscription`)
    return { subscribed: false, unsubscribe: () => {} }
  }
  activeChannels.add(channel)

  let supabase: any = null
  let channelRef: any = null
  let debouncer: ReturnType<typeof createLeadingDebouncer> | null = null
  let subscribed = false

  try {
    supabase = getSupabase ? getSupabase() : createBrowserClient()
    debouncer = createLeadingDebouncer(debounceMs, () => {
      if (onChange) onChange()
    })

    channelRef = supabase
      .channel(channel)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'realtime_events',
          filter: `event_name=in.(${events.join(',')})`,
        },
        (payload: any) => {
          const eventName = payload?.new?.event_name as string | undefined
          const entityId = (payload?.new?.entity_id as string | null) ?? null
          if (!eventName) return
          if (onEvent) onEvent(eventName, entityId)
          if (debouncer) debouncer.trigger()
        },
      )
      .subscribe((status: string) => {
        subscribed = status === 'SUBSCRIBED'
      })
  } catch {
    subscribed = false
  }

  return {
    subscribed,
    unsubscribe: () => {
      activeChannels.delete(channel)
      if (debouncer) debouncer.dispose()
      if (supabase && channelRef) {
        void supabase.removeChannel(channelRef).catch(() => {})
      }
    },
  }
}
