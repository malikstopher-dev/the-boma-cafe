// Staff chat realtime consumer (E1-5).
//
// Consumes the E1-1 realtime signal table (public.realtime_events) on
// the SAME transport (Supabase Realtime postgres_changes) and filter
// convention as src/inventory/lib/use-realtime-refresh.ts (unquoted
// in-list values — double-quoted values silently match nothing,
// verified live 2026-08-15).
//
// staff_messages is RLS-blocked for the anon browser key (policies
// require app.staff_user_id), so postgres_changes on that table
// delivers NOTHING to the browser. Chat consumers instead receive the
// chat.message signal (migration 093) and refetch or fetch-by-id.
// Payloads carry only (event_name, table_name, entity_id, created_at)
// — never message content (E1-5 principle).

import { createBrowserClient } from '@/lib/supabase'
import { createLeadingDebouncer } from './realtime-debounce'

/** Chat events the staff chat surfaces react to (E1-5). */
export const CHAT_LIVE_EVENTS = [
  'chat.message',
] as const

const activeChannels = new Set<string>()

export interface ChatEventSubscription {
  subscribed: boolean
  unsubscribe: () => void
}

export interface SubscribeToChatEventsOptions {
  /** Unique per page, e.g. 'e1-incoming-<userId>' or 'e1-chat-<conversationId>' */
  channel: string
  /** Immediate per-event callback with the signal payload's message id. */
  onMessageId?: (messageId: string | null) => void
  /** Debounced refetch callback (leading-edge, same as the E1-1 hook). */
  onChange?: () => void
  debounceMs?: number
  enabled?: boolean
  /** Injectable for tests. */
  getSupabase?: () => any
}

export function subscribeToChatEvents(options: SubscribeToChatEventsOptions): ChatEventSubscription {
  const {
    channel,
    onMessageId,
    onChange,
    debounceMs = 2000,
    enabled = true,
    getSupabase,
  } = options

  if (!enabled) {
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
          filter: `event_name=in.(${CHAT_LIVE_EVENTS.join(',')})`,
        },
        (payload: any) => {
          const messageId = (payload?.new?.entity_id as string | null) ?? null
          if (onMessageId) onMessageId(messageId)
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