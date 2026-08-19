// Realtime refresh hook (E1-1).
//
// Subscribes one page to the `realtime_events` signal table (migration
// 080) and refetches via a leading-edge debounce. Transport is Supabase
// Realtime postgres_changes — the same architecture the kitchen/bar
// boards use. Payloads from realtime_events contain only
// (event_name, table_name, entity_id, created_at) — never customer or
// internal data (E1-5 principle).
//
// Event contract (logical name -> source): see docs/E1_REALTIME_CONTRACT.md
//   order.created      orders INSERT
//   order.preparing    orders UPDATE status -> preparing
//   order.ready        orders UPDATE status -> ready
//   order.completed    orders UPDATE status -> served|completed
//   booking.confirmed  bookings UPDATE status -> confirmed
//   po.received        inventory_purchase_orders UPDATE -> partial|received
//   stock.moved        inventory_transactions INSERT (any ledger movement)
//   stock.count.updated inventory_stock_counts INSERT|UPDATE
//   stock.low          staff_notifications INSERT (inventory_*_stock types)
//
// Dedupe: one channel per page (module-level guard logs + skips if the
// channel is already active), cleanup removes the channel and cancels
// pending debounce timers on unmount.

'use client'

import { useEffect, useRef, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { createLeadingDebouncer } from './realtime-debounce'

export interface RealtimeRefreshOptions {
  /** Unique per page, e.g. 'e1-ops-dashboard' */
  channel: string
  /** Logical event names from the contract, e.g. ['stock.moved', 'po.received'] */
  events: string[]
  /** Refetch function. Safe to change identity every render (ref-based). */
  onRefresh: () => void
  /** Reconcile authoritative state when an established channel reconnects. */
  onReconnect?: () => void
  /** Coalescing window in ms. Default 2000. */
  debounceMs?: number
  enabled?: boolean
}

const activeChannels = new Set<string>()

export function useRealtimeRefresh(options: RealtimeRefreshOptions): { subscribed: boolean } {
  const { channel, events, onRefresh, onReconnect, debounceMs = 2000, enabled = true } = options
  const eventsKey = events.join(',')
  const [subscribed, setSubscribed] = useState(false)
  const refreshRef = useRef(onRefresh)
  const reconnectRef = useRef(onReconnect)
  const wasSubscribedRef = useRef(false)
  refreshRef.current = onRefresh
  reconnectRef.current = onReconnect

  useEffect(() => {
    if (!enabled || eventsKey === '') return

    wasSubscribedRef.current = false

    if (activeChannels.has(channel)) {
      console.warn(`[realtime] channel "${channel}" already active — skipping duplicate subscription`)
      return
    }
    activeChannels.add(channel)

    const supabase = createBrowserClient()
    const debouncer = createLeadingDebouncer(debounceMs, () => refreshRef.current())

    // Unquoted in-list values: verified live that WALRUS's filter parser
    // silently matches NOTHING for double-quoted values (e.g. "stock.low");
    // bare `in.(stock.low,po.received)` delivers correctly (dots are fine).
    const filter = `event_name=in.(${events.join(',')})`
    const channelRef = supabase
      .channel(channel)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'realtime_events',
          filter,
        },
        () => debouncer.trigger(),
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' && wasSubscribedRef.current) reconnectRef.current?.()
        if (status === 'SUBSCRIBED') wasSubscribedRef.current = true
        setSubscribed(status === 'SUBSCRIBED')
      })

    return () => {
      activeChannels.delete(channel)
      debouncer.dispose()
      void supabase.removeChannel(channelRef).catch(() => {})
    }
    // eventsKey is the stable identity of the events list
  }, [channel, eventsKey, debounceMs, enabled])

  return { subscribed }
}
