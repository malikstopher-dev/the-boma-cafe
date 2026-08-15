import { describe, it, expect, vi } from 'vitest'
import { CHAT_LIVE_EVENTS, subscribeToChatEvents } from '../lib/chat-events'

/** Minimal fake supabase client: channel().on().subscribe() + removeChannel. */
function fakeSupabase() {
  const listeners: ((payload: any) => void)[] = []
  let filter = ''
  const channel: any = {
    on: (_event: string, opts: any, cb: any) => {
      filter = opts?.filter ?? ''
      listeners.push(cb)
      return channel
    },
    subscribe: (cb?: (s: string) => void) => {
      if (cb) cb('SUBSCRIBED')
      return channel
    },
  }
  const client = {
    channel: (_name: string) => channel,
    removeChannel: vi.fn().mockImplementation(() => {
      listeners.length = 0 // real supabase-js stops all deliveries after removal
      return Promise.resolve('ok')
    }),
  }
  // The real WALRUS applies the filter server-side; the fake applies it
  // so non-matching events are dropped, like production. The filter is
  // set by .on(), which runs after fakeSupabase() returns — parse lazily.
  const emit = (eventName: string, entityId: string) => {
    const allowed = new Set(
      (filter.match(/event_name=in\.\(([^)]+)\)/) ?? [])[1]?.split(',') ?? [],
    )
    if (!allowed.has(eventName)) return
    for (const cb of listeners) cb({ new: { event_name: eventName, entity_id: entityId } })
  }
  return { client, channel, emit, getFilter: () => filter }
}

describe('chat-events: subscription contract', () => {
  it('delivers the message id from chat.message payloads', () => {
    const { client, emit } = fakeSupabase()
    const onMessageId = vi.fn()
    const sub = subscribeToChatEvents({ channel: 'e1-chat-abc', onMessageId, getSupabase: () => client })
    expect(sub.subscribed).toBe(true)
    emit('chat.message', 'msg-1')
    expect(onMessageId).toHaveBeenCalledWith('msg-1')
    sub.unsubscribe()
  })

  it('uses the unquoted in-list filter convention (quoted values match nothing — live-verified)', () => {
    const { client, getFilter } = fakeSupabase()
    const sub = subscribeToChatEvents({ channel: 'e1-chat-abc', getSupabase: () => client })
    expect(getFilter()).toBe('event_name=in.(chat.message)')
    expect(getFilter()).not.toContain('"')
    sub.unsubscribe()
  })

  it('ignores non-chat events', () => {
    const { client, emit } = fakeSupabase()
    const onMessageId = vi.fn()
    const sub = subscribeToChatEvents({ channel: 'e1-chat-abc', onMessageId, getSupabase: () => client })
    emit('stock.low', 'nope')
    emit('order.ready', 'nope')
    expect(onMessageId).not.toHaveBeenCalled()
    sub.unsubscribe()
  })

  it('passes entity ids through (payload-level, no tracking concept)', () => {
    const { client, emit } = fakeSupabase()
    const onMessageId = vi.fn()
    const sub = subscribeToChatEvents({ channel: 'e1-chat-null', onMessageId, getSupabase: () => client })
    emit('chat.message', 'msg-2')
    expect(onMessageId).toHaveBeenCalledWith('msg-2')
    sub.unsubscribe()
  })

  it('fires the debounced onChange callback on bursts (leading edge)', () => {
    vi.useFakeTimers()
    // Advance the clock so the first emit clears the debouncer's initial
    // lastFire=0 window (Date.now() is mocked by fake timers).
    vi.setSystemTime(new Date(5000))
    const { client, emit } = fakeSupabase()
    const onChange = vi.fn()
    const sub = subscribeToChatEvents({ channel: 'e1-chat-abc', onChange, debounceMs: 2000, getSupabase: () => client })
    emit('chat.message', 'm1')
    expect(onChange).toHaveBeenCalledTimes(1)
    emit('chat.message', 'm2')
    emit('chat.message', 'm3')
    expect(onChange).toHaveBeenCalledTimes(1)
    vi.runAllTimers()
    expect(onChange).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
    sub.unsubscribe()
  })

  it('refuses duplicate subscriptions for the same channel', () => {
    const { client } = fakeSupabase()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const first = subscribeToChatEvents({ channel: 'e1-chat-dup', getSupabase: () => client })
    const second = subscribeToChatEvents({ channel: 'e1-chat-dup', getSupabase: () => client })
    expect(first.subscribed).toBe(true)
    expect(second.subscribed).toBe(false)
    expect(warn).toHaveBeenCalled()
    first.unsubscribe()
    warn.mockRestore()
  })

  it('allows re-subscription after unsubscribe', () => {
    const { client } = fakeSupabase()
    const first = subscribeToChatEvents({ channel: 'e1-chat-re', getSupabase: () => client })
    first.unsubscribe()
    const second = subscribeToChatEvents({ channel: 'e1-chat-re', getSupabase: () => client })
    expect(second.subscribed).toBe(true)
    second.unsubscribe()
  })

  it('stops delivery after unsubscribe (removeChannel clears listeners)', () => {
    const { client, emit } = fakeSupabase()
    const onMessageId = vi.fn()
    const sub = subscribeToChatEvents({ channel: 'e1-chat-stop', onMessageId, getSupabase: () => client })
    sub.unsubscribe()
    expect(client.removeChannel).toHaveBeenCalled()
    emit('chat.message', 'm9')
    expect(onMessageId).not.toHaveBeenCalled()
  })

  it('falls back silently when realtime is unavailable', () => {
    const on = () => { throw new Error('realtime not available') }
    const client: any = {
      channel: () => ({ on, subscribe: () => {} }),
    }
    const sub = subscribeToChatEvents({ channel: 'e1-chat-fail', getSupabase: () => client })
    expect(sub.subscribed).toBe(false)
    expect(() => sub.unsubscribe()).not.toThrow()
  })

  it('returns a no-op subscription when disabled', () => {
    const { client } = fakeSupabase()
    const onMessageId = vi.fn()
    const sub = subscribeToChatEvents({ channel: 'e1-chat-off', onMessageId, enabled: false, getSupabase: () => client })
    expect(sub.subscribed).toBe(false)
    expect(onMessageId).not.toHaveBeenCalled()
    expect(() => sub.unsubscribe()).not.toThrow()
  })
})

describe('chat-events: event list contract', () => {
  it('exposes exactly the chat.message event', () => {
    expect([...CHAT_LIVE_EVENTS]).toEqual(['chat.message'])
  })
})