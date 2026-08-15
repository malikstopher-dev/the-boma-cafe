// Waiter confirmed-booking feed (E1-3).
//
// Consumes the E1-1 realtime signal table (public.realtime_events) with the
// SAME transport/filter convention as src/inventory/lib/order-status.ts and
// use-realtime-refresh.ts (unquoted in-list values — double-quoted values
// silently match nothing, verified live 2026-08-15).
//
// Privacy (locked): the waiter feed may only ever carry the operational
// fields {id, reference, date, time, guests, location, status}. Customer
// name/phone/email, pricing, quotation and internal notes must never reach
// a waiter client. Enforcement is server-side (the API reads only
// waiter_booking_view); sanitizeWaiterBooking is a tested second layer that
// documents the contract.

import { createBrowserClient } from '@/lib/supabase'

/** Booking status events the waiter feed reacts to (E1-3). */
export const BOOKING_LIVE_EVENTS = [
  'booking.confirmed',
  'booking.in_progress',
  'booking.completed',
  'booking.cancelled',
] as const

/** Waiter-visible booking row (the only shape the feed may render). */
export interface WaiterBooking {
  id: string
  reference: string
  date: string
  time: string
  guests: number
  location: string | null
  status: string
}

const ALLOWED_FIELDS: (keyof WaiterBooking)[] = ['id', 'reference', 'date', 'time', 'guests', 'location', 'status']

/** Contract mapping: realtime event -> booking status shown to the waiter. */
export function eventToBookingStatus(eventName: string): string | null {
  switch (eventName) {
    case 'booking.confirmed':
      return 'confirmed'
    case 'booking.in_progress':
      return 'in_progress'
    case 'booking.completed':
      return 'completed'
    case 'booking.cancelled':
      return 'cancelled'
    default:
      return null
  }
}

/** Only booking.confirmed carries a NEW row — the others mutate known rows. */
export function bookingEventNeedsFetch(eventName: string): boolean {
  return eventName === 'booking.confirmed'
}

/**
 * Defense-in-depth: rebuild a row keeping ONLY the waiter-visible fields.
 * Anything else (PII, pricing, notes) is structurally dropped, even if a
 * future API response accidentally contained it.
 */
export function sanitizeWaiterBooking(row: Record<string, unknown>): WaiterBooking | null {
  const out: Record<string, unknown> = {}
  for (const field of ALLOWED_FIELDS) {
    if (row[field] !== undefined && row[field] !== null) out[field] = row[field]
  }
  if (!out.id) return null
  return out as unknown as WaiterBooking
}

/**
 * Apply one realtime event to the feed (immutable).
 * - booking.cancelled  -> row removed (no fetch needed — the API will not
 *   return it anyway, so removing locally is authoritative).
 * - in_progress/completed -> status flipped on a KNOWN row (the event name
 *   IS the new status; no fetch needed).
 * - confirmed -> feed unchanged; the caller fetches the new row
 *   (bookingEventNeedsFetch) and upserts.
 */
export function applyBookingStatusToFeed(
  feed: WaiterBooking[],
  eventName: string,
  entityId: string | null,
): WaiterBooking[] {
  if (!entityId) return feed
  const status = eventToBookingStatus(eventName)
  if (!status) return feed
  if (status === 'cancelled') {
    if (!feed.some((b) => b.id === entityId)) return feed
    return feed.filter((b) => b.id !== entityId)
  }
  if (status === 'confirmed') return feed
  if (!feed.some((b) => b.id === entityId)) return feed
  return feed.map((b) => (b.id === entityId && b.status !== status ? { ...b, status } : b))
}

/** Insert or replace a row in the feed (immutable). */
export function upsertWaiterBooking(feed: WaiterBooking[], row: WaiterBooking): WaiterBooking[] {
  const idx = feed.findIndex((b) => b.id === row.id)
  const existing = idx === -1 ? undefined : feed[idx]
  if (!existing) return [...feed, row]
  if (existing.status === row.status) return feed
  return feed.map((b, i) => (i === idx ? row : b))
}

const activeChannels = new Set<string>()

export interface BookingStatusSubscription {
  subscribed: boolean
  unsubscribe: () => void
}

export interface SubscribeToBookingEventsOptions {
  /** Unique per page, e.g. 'e1-waiter-bookings' */
  channel: string
  /** Immediate per-event callback with the signal payload. */
  onEvent?: (eventName: string, entityId: string | null) => void
  events?: readonly string[]
  enabled?: boolean
  /** Injectable for tests. */
  getSupabase?: () => any
}

export function subscribeToBookingEvents(options: SubscribeToBookingEventsOptions): BookingStatusSubscription {
  const { channel, onEvent, events = BOOKING_LIVE_EVENTS, enabled = true, getSupabase } = options

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
  let subscribed = false

  try {
    supabase = getSupabase ? getSupabase() : createBrowserClient()

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
      if (supabase && channelRef) {
        void supabase.removeChannel(channelRef).catch(() => {})
      }
    },
  }
}