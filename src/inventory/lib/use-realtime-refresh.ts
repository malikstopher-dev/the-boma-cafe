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
import { createSignalCursor, type RealtimeSignal } from './realtime-cursor'
import { buildLiveFilter, buildEventNameFilter } from './realtime-filter'

export interface RealtimeRefreshOptions {
  /** Unique per page, e.g. 'e1-ops-dashboard' */
  channel: string
  /** Logical event names from the contract, e.g. ['stock.moved', 'po.received'] */
  events: string[]
  /**
   * Optional scope (Ship 4): subscribe only to rows emitted with this
   * scope_id (e.g. a conversation id). Replaces the live event_name
   * filter (postgres_changes allows one WALRUS condition per binding);
   * the catch-up query keeps both conditions.
   */
  scopeId?: string
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
  const { channel, events, scopeId, onRefresh, onReconnect, debounceMs = 2000, enabled = true } = options
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
    const cursor = createSignalCursor()
    let reconciling = false
    let reconcileQueued = false

    const processSignal = (value: Partial<RealtimeSignal>) => {
      if (cursor.accept(value.id)) debouncer.trigger()
    }

    const reconcile = async () => {
      if (reconciling) {
        reconcileQueued = true
        return
      }

      reconciling = true
      try {
        do {
          reconcileQueued = false
          let hasMore = true
          while (hasMore) {
            let query = supabase
              .from('realtime_events')
              .select('id, event_name, table_name, entity_id, created_at')
              .in('event_name', events)
            // REST combines filters (unlike the live binding): a scoped
            // subscriber catches up on its slice only.
            if (scopeId !== undefined && scopeId !== '') query = query.eq('scope_id', scopeId)
            const { data, error } = await query
              .gt('id', cursor.lastId)
              .order('id', { ascending: true })
              .limit(500)

            if (error) {
              console.warn('[realtime] signal catch-up failed', error.message)
              break
            }
            const signals = (data ?? []) as RealtimeSignal[]
            for (const signal of signals) processSignal(signal)
            hasMore = signals.length === 500
          }
        } while (reconcileQueued)
      } finally {
        reconciling = false
      }
    }

    // Unquoted values: verified live that WALRUS's filter parser
    // silently matches NOTHING for double-quoted values (e.g. "stock.low");
    // bare `in.(stock.low,po.received)` delivers correctly (dots are fine).
    // Scoped subscriptions (Ship 4) swap the in-list for a single
    // scope_id equality — postgres_changes allows ONE condition per binding.
    const filter = buildLiveFilter(events, scopeId)
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
        (payload) => processSignal(payload.new as RealtimeSignal),
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          const reconnected = wasSubscribedRef.current
          wasSubscribedRef.current = true
          void reconcile()
          if (reconnected) reconnectRef.current?.()
        }
        setSubscribed(status === 'SUBSCRIBED')
      })

    const reconcileVisible = () => {
      if (document.visibilityState === 'visible') void reconcile()
    }
    document.addEventListener('visibilitychange', reconcileVisible)
    window.addEventListener('online', reconcileVisible)

    return () => {
      activeChannels.delete(channel)
      debouncer.dispose()
      document.removeEventListener('visibilitychange', reconcileVisible)
      window.removeEventListener('online', reconcileVisible)
      void supabase.removeChannel(channelRef).catch(() => {})
    }
    // eventsKey is the stable identity of the events list; scopeId changes
    // re-subscribe (per-conversation channels are distinct anyway)
  }, [channel, eventsKey, scopeId, debounceMs, enabled])

  return { subscribed }
}
